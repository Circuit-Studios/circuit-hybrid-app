import { ScriptAnalysisStatus, type Prisma, type ProjectLanguage } from '@prisma/client';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { chatJson } from '../openai.client.js';
import { extractPdfText } from '../pdf.js';
import { emitToProject } from '../../realtime/socket.js';
import { dispatchNotification } from '../../notifications/notifications.service.js';
import { CIRCUIT_SYSTEM_PROMPT } from '../prompts/system.js';
import { buildCharactersPrompt } from '../prompts/characters.js';
import { buildScenesPrompt } from '../prompts/scenes.js';
import { buildCombinationsPrompt } from '../prompts/combinations.js';
import { buildDepartmentsPrompt } from '../prompts/departments.js';
import { buildShootDaysPrompt } from '../prompts/shoot-days.js';
import { buildBudgetPrompt } from '../prompts/budget.js';
import {
  aiCharactersResponseSchema,
  aiScenesResponseSchema,
  aiCombinationsResponseSchema,
  aiDepartmentsResponseSchema,
  aiShootDaysResponseSchema,
  aiBudgetResponseSchema,
  type AIScriptSummary,
} from '../schemas.js';

// Runs the entire Module 2 pipeline. Designed to be called from a background
// worker — caller is responsible for storing the result and updating status.
export async function analyzeScript(scriptId: string): Promise<void> {
  const script = await prisma.script.findUnique({
    where: { id: scriptId },
    include: { project: true },
  });
  if (!script) throw new Error(`Script ${scriptId} not found`);
  const project = script.project;

  const log = logger.child({ scriptId, projectId: project.id });

  try {
    // 0) Extract PDF text if we haven't already.
    let rawText = script.rawText;
    if (!rawText) {
      await updateStatus(scriptId, 'EXTRACTING_TEXT');
      const extracted = await extractPdfText(script.storageKey);
      rawText = extracted.rawText;
      await prisma.script.update({
        where: { id: scriptId },
        data: { rawText, pageCount: extracted.pageCount },
      });
      log.info({ chars: rawText.length, pages: extracted.pageCount }, 'PDF text extracted');
    }

    // 1) Characters
    await updateStatus(scriptId, 'ANALYZING_CHARACTERS');
    const characters = await chatJson({
      schema: aiCharactersResponseSchema,
      schemaName: 'CircuitCharacters',
      systemPrompt: CIRCUIT_SYSTEM_PROMPT,
      userPrompt: buildCharactersPrompt(rawText, project.genre),
    });
    log.info({ count: characters.characters.length }, 'Characters extracted');

    // 2) Scenes
    await updateStatus(scriptId, 'ANALYZING_SCENES');
    const scenes = await chatJson({
      schema: aiScenesResponseSchema,
      schemaName: 'CircuitScenes',
      systemPrompt: CIRCUIT_SYSTEM_PROMPT,
      userPrompt: buildScenesPrompt(
        rawText,
        characters.characters.map(c => c.name),
      ),
    });
    log.info({ count: scenes.scenes.length }, 'Scenes mapped');

    // 3) Combinations
    await updateStatus(scriptId, 'ANALYZING_COMBINATIONS');
    const combinations = await chatJson({
      schema: aiCombinationsResponseSchema,
      schemaName: 'CircuitCombinations',
      systemPrompt: CIRCUIT_SYSTEM_PROMPT,
      userPrompt: buildCombinationsPrompt(characters.characters, scenes.scenes, project.genre),
    });
    log.info(
      { groups: combinations.groups.length, savingsDays: combinations.totalEstimatedSavingsDays },
      'Combinations identified',
    );

    // 4) Departments
    await updateStatus(scriptId, 'SUGGESTING_DEPARTMENTS');
    const departments = await chatJson({
      schema: aiDepartmentsResponseSchema,
      schemaName: 'CircuitDepartments',
      systemPrompt: CIRCUIT_SYSTEM_PROMPT,
      userPrompt: buildDepartmentsPrompt(
        scenes.scenes,
        project.genre,
        formatProjectLanguages(project.languages, project.language),
      ),
    });
    log.info({ count: departments.departments.length }, 'Departments suggested');

    // 5) Shoot days
    await updateStatus(scriptId, 'ESTIMATING_SHOOT_DAYS');
    const shootDays = await chatJson({
      schema: aiShootDaysResponseSchema,
      schemaName: 'CircuitShootDays',
      systemPrompt: CIRCUIT_SYSTEM_PROMPT,
      userPrompt: buildShootDaysPrompt(
        characters.characters,
        scenes.scenes,
        combinations.groups,
        project.genre,
      ),
    });
    log.info({ totalDays: shootDays.totalShootDaysEstimate }, 'Shoot days estimated');

    // 6) Budget
    await updateStatus(scriptId, 'DRAFTING_BUDGET');
    const budget = await chatJson({
      schema: aiBudgetResponseSchema,
      schemaName: 'CircuitBudget',
      systemPrompt: CIRCUIT_SYSTEM_PROMPT,
      userPrompt: buildBudgetPrompt({
        projectGenre: project.genre,
        projectLanguage: formatProjectLanguages(project.languages, project.language),
        budgetMinINR: project.budgetMinINR != null ? Number(project.budgetMinINR) : null,
        budgetMaxINR: project.budgetMaxINR != null ? Number(project.budgetMaxINR) : null,
        departments: departments.departments,
        shootDays,
        combinations: combinations.groups,
      }),
    });
    log.info({ totalINR: budget.totalINR, lines: budget.lines.length }, 'Budget draft generated');

    const summary: AIScriptSummary = {
      characters,
      scenes,
      combinations,
      departments,
      shootDays,
      budget,
    };

    await persistSummary(scriptId, project.id, summary);
    emitToProject(project.id, 'script.analysis.updated', {
      scriptId,
      status: 'COMPLETED',
    });

    // Ping the uploader (and project owner if different) so they know the
    // wow-moment screen is ready, even if they've left the app.
    const recipients = [script.uploadedByUserId, project.ownerUserId];
    void dispatchNotification({
      userIds: recipients,
      kind: 'AI_ANALYSIS_DONE',
      title: 'Your script breakdown is ready',
      body: `${characters.characters.length} characters, ${scenes.scenes.length} scenes, ${shootDays.totalShootDaysEstimate} shoot days.`,
      projectId: project.id,
      deepLink: `/project/${project.id}/ai-results`,
      context: { scriptId },
    });
    log.info('Script analysis completed');
  } catch (error) {
    log.error({ error }, 'Script analysis failed');
    await prisma.script.update({
      where: { id: scriptId },
      data: {
        analysisStatus: ScriptAnalysisStatus.FAILED,
        analysisError: error instanceof Error ? error.message : String(error),
        analysisEndedAt: new Date(),
      },
    });
    emitToProject(project.id, 'script.analysis.updated', {
      scriptId,
      status: 'FAILED',
    });
    throw error;
  }
}

async function updateStatus(scriptId: string, status: ScriptAnalysisStatus): Promise<void> {
  const updated = await prisma.script.update({
    where: { id: scriptId },
    data: {
      analysisStatus: status,
      analysisStartedAt: status === 'EXTRACTING_TEXT' ? new Date() : undefined,
    },
    select: { id: true, projectId: true, analysisStatus: true },
  });
  emitToProject(updated.projectId, 'script.analysis.updated', {
    scriptId: updated.id,
    status: updated.analysisStatus,
  });
}

// Writes the AI summary as the canonical Characters/Scenes/Departments/etc.
// rows on the project. Idempotent-ish: clears the project's AI-generated rows
// before inserting so the user can re-run analysis cleanly.
async function persistSummary(
  scriptId: string,
  projectId: string,
  summary: AIScriptSummary,
): Promise<void> {
  await prisma.$transaction(async tx => {
    await tx.sceneAppearance.deleteMany({ where: { projectId } });
    await tx.scene.deleteMany({ where: { projectId } });
    await tx.character.deleteMany({ where: { projectId } });
    await tx.budgetLine.deleteMany({ where: { projectId, isAIDraft: true } });

    // Characters
    const characterRecords = await Promise.all(
      summary.characters.characters.map(c =>
        tx.character.create({
          data: {
            projectId,
            name: c.name,
            importance: c.importance,
            estimatedScreenTimeMinutes: c.estimatedScreenTimeMinutes ?? undefined,
            notes: c.notes ?? undefined,
          },
        }),
      ),
    );
    const charByName = new Map(characterRecords.map(c => [c.name, c.id]));

    // Scenes + scene appearances
    for (const [index, scene] of summary.scenes.scenes.entries()) {
      const sceneRecord = await tx.scene.create({
        data: {
          projectId,
          sceneNumber: scene.sceneNumber,
          heading: scene.heading,
          synopsis: scene.synopsis ?? undefined,
          locationType: scene.locationType,
          timeOfDay: scene.timeOfDay,
          locationName: scene.locationName ?? undefined,
          estimatedPages: scene.estimatedPages ?? undefined,
          hasStunts: scene.hasStunts,
          hasVFX: scene.hasVFX,
          hasSong: scene.hasSong,
          order: index,
        },
      });
      const appearanceData: Prisma.SceneAppearanceCreateManyInput[] = scene.charactersPresent
        .map(name => charByName.get(name))
        .filter((id): id is string => Boolean(id))
        .map(characterId => ({ projectId, sceneId: sceneRecord.id, characterId }));
      if (appearanceData.length > 0) {
        await tx.sceneAppearance.createMany({ data: appearanceData });
      }
    }

    // Update character shoot-day estimates from pipeline 5
    for (const perActor of summary.shootDays.perActor) {
      const id = charByName.get(perActor.character);
      if (!id) continue;
      await tx.character.update({
        where: { id },
        data: { estimatedShootDays: Math.round(perActor.estimatedDays) },
      });
    }

    // Departments
    for (const dept of summary.departments.departments) {
      await tx.projectDepartment.upsert({
        where: { projectId_kind: { projectId, kind: dept.kind } },
        update: { displayName: dept.displayName, required: dept.required },
        create: {
          projectId,
          kind: dept.kind,
          displayName: dept.displayName,
          required: dept.required,
        },
      });
    }

    // Budget lines
    if (summary.budget.lines.length > 0) {
      await tx.budgetLine.createMany({
        data: summary.budget.lines.map(line => ({
          projectId,
          department: line.department,
          label: line.label,
          amountINR: BigInt(Math.round(line.amountINR)),
          isAIDraft: true,
          notes: line.notes ?? undefined,
        })),
      });
    }

    await tx.script.update({
      where: { id: scriptId },
      data: {
        analysisStatus: ScriptAnalysisStatus.COMPLETED,
        analysisError: null,
        analysisEndedAt: new Date(),
        aiSummary: summary as unknown as Prisma.InputJsonValue,
      },
    });
  });
}

function formatProjectLanguages(
  languages: ProjectLanguage[],
  fallback: ProjectLanguage,
): string {
  const list = languages.length > 0 ? languages : [fallback];
  return list
    .map(l => l.charAt(0) + l.slice(1).toLowerCase())
    .join(', ');
}
