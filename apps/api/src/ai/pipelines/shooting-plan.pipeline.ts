import { TaskSuggestionStatus, type Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { dispatchNotification } from '../../notifications/notifications.service.js';
import {
  completeScriptPlanning,
  failScriptAnalysis,
  updateScriptAnalysisStatus,
} from './script-analysis-status.js';
import { chatJson, LlmError } from '../llm/index.js';
import { extractPdfText } from '../pdf.js';
import {
  parseSceneFact,
  sceneBreakdownEnvelopeSchema,
  type ExtractedSceneFact,
} from '../schemas/scene-breakdown.schema.js';
import { taskSuggestionsResponseSchema } from '../schemas/task-suggestions.schema.js';
import { shootingPlanResponseSchema } from '../schemas/shooting-plan.schema.js';
import { batchScenes, splitScenes } from '../script/scene-splitter.js';
import {
  SCENE_BREAKDOWN_SYSTEM_PROMPT,
  buildSceneBreakdownPrompt,
} from '../prompts/scene-breakdown.prompt.js';
import {
  TASK_SUGGESTIONS_SYSTEM_PROMPT,
  buildTaskSuggestionsPrompt,
} from '../prompts/task-suggestions.prompt.js';
import {
  SHOOTING_PLAN_SYSTEM_PROMPT,
  buildShootingPlanPrompt,
} from '../prompts/shooting-plan.prompt.js';
import { mapDepartmentToKind } from '../department-map.js';

function mergeStringLists(a: string[], b: string[]): string[] {
  return Array.from(new Set([...a, ...b]));
}

function mergeSceneFacts(batches: ExtractedSceneFact[][]): ExtractedSceneFact[] {
  const byKey = new Map<string, ExtractedSceneFact>();
  for (const batch of batches) {
    for (const scene of batch) {
      // Skip junk objects where the model dropped both identifiers.
      if (!scene.sceneNumber && !scene.slugline) continue;
      const key = `${scene.sceneNumber}::${scene.slugline}`;
      if (!byKey.has(key)) {
        byKey.set(key, scene);
        continue;
      }
      const existing = byKey.get(key)!;
      byKey.set(key, {
        ...existing,
        summary: existing.summary ?? scene.summary,
        location: existing.location ?? scene.location,
        characters: mergeStringLists(existing.characters, scene.characters),
        props: mergeStringLists(existing.props, scene.props),
        vehicles: mergeStringLists(existing.vehicles, scene.vehicles),
        animals: mergeStringLists(existing.animals, scene.animals),
        stunts: mergeStringLists(existing.stunts, scene.stunts),
        vfx: mergeStringLists(existing.vfx, scene.vfx),
        sfx: mergeStringLists(existing.sfx, scene.sfx),
        costumes: mergeStringLists(existing.costumes, scene.costumes),
        makeup: mergeStringLists(existing.makeup, scene.makeup),
        artDepartment: mergeStringLists(existing.artDepartment, scene.artDepartment),
        cameraLightingNotes: mergeStringLists(
          existing.cameraLightingNotes,
          scene.cameraLightingNotes,
        ),
        soundRisks: mergeStringLists(existing.soundRisks, scene.soundRisks),
        productionRisks: mergeStringLists(existing.productionRisks, scene.productionRisks),
        continuityNotes: mergeStringLists(existing.continuityNotes, scene.continuityNotes),
        confidence: Math.max(existing.confidence, scene.confidence),
        estimatedComplexity:
          existing.estimatedComplexity === 'HIGH' || scene.estimatedComplexity === 'HIGH'
            ? 'HIGH'
            : existing.estimatedComplexity === 'MEDIUM' || scene.estimatedComplexity === 'MEDIUM'
              ? 'MEDIUM'
              : 'LOW',
      });
    }
  }
  return Array.from(byKey.values());
}

export async function runShootingPlanPipeline(scriptId: string): Promise<{
  shootingPlanId: string;
  suggestionCount: number;
}> {
  const script = await prisma.script.findUnique({
    where: { id: scriptId },
    include: { project: true },
  });
  if (!script) throw new Error(`Script ${scriptId} not found`);

  const project = script.project;
  const log = logger.child({ scriptId, projectId: project.id, pipeline: 'shooting-plan' });

  try {
    let rawText = script.rawText;
    if (!rawText) {
      await updateScriptAnalysisStatus(scriptId, 'EXTRACTING_TEXT');
      const extracted = await extractPdfText(script.storageKey);
      rawText = extracted.rawText;
      await prisma.script.update({
        where: { id: scriptId },
        data: { rawText, pageCount: extracted.pageCount },
      });
      log.info({ chars: rawText.length, pages: extracted.pageCount }, 'PDF text extracted');
    }

    const capped = rawText.slice(0, env.LLM_MAX_SCRIPT_CHARS);
    const split = splitScenes(capped);
    const batches = batchScenes(split, env.LLM_MAX_CHUNK_CHARS);
    log.info({ sceneCount: split.length, batchCount: batches.length }, 'scenes_split');

    await updateScriptAnalysisStatus(scriptId, 'ANALYZING_SCENES');

    const extractedBatches: ExtractedSceneFact[][] = [];
    let droppedScenes = 0;
    for (const [batchIndex, batch] of batches.entries()) {
      const { data: envelope } = await chatJson({
        role: 'extractor',
        stage: 'scene_extraction',
        schema: sceneBreakdownEnvelopeSchema,
        schemaName: 'SceneBreakdown',
        systemPrompt: SCENE_BREAKDOWN_SYSTEM_PROMPT,
        userPrompt: buildSceneBreakdownPrompt(batch, project.genre),
        projectId: project.id,
        scriptId,
      });

      // Parse each scene independently so one malformed scene is skipped,
      // not the whole batch.
      const parsed: ExtractedSceneFact[] = [];
      for (const raw of envelope.scenes) {
        const scene = parseSceneFact(raw);
        if (scene) parsed.push(scene);
        else droppedScenes += 1;
      }

      if (parsed.length < batch.length) {
        log.warn(
          {
            batchIndex,
            requested: batch.length,
            returned: envelope.scenes.length,
            kept: parsed.length,
          },
          'scene_batch_partial',
        );
      }
      extractedBatches.push(parsed);
    }

    const scenes = mergeSceneFacts(extractedBatches);
    log.info({ mergedScenes: scenes.length, droppedScenes }, 'scene_facts_merged');

    // Min-scene-count guard: zero usable scenes can't produce a plan — fail loudly.
    if (scenes.length === 0) {
      throw new LlmError('Scene extraction produced no usable scenes', {
        provider: 'NVIDIA',
        stage: 'scene_extraction',
      });
    }

    // Soft warning when yield is well below the deterministic split — the plan
    // will be thin and we want this visible without blocking the run.
    const lowSceneYield = scenes.length < Math.ceil(split.length * 0.5);
    if (lowSceneYield) {
      log.warn(
        { mergedScenes: scenes.length, splitScenes: split.length, droppedScenes },
        'scene_yield_low',
      );
    }

    await updateScriptAnalysisStatus(scriptId, 'SUGGESTING_DEPARTMENTS');

    const { data: taskSuggestions } = await chatJson({
      role: 'planner',
      stage: 'task_suggestions',
      schema: taskSuggestionsResponseSchema,
      schemaName: 'TaskSuggestions',
      systemPrompt: TASK_SUGGESTIONS_SYSTEM_PROMPT,
      userPrompt: buildTaskSuggestionsPrompt(scenes, project.genre),
      projectId: project.id,
      scriptId,
    });

    await updateScriptAnalysisStatus(scriptId, 'ESTIMATING_SHOOT_DAYS');

    const validSuggestions = taskSuggestions.suggestions.filter((s) => s.title.trim().length > 0);

    const { data: shootingPlan } = await chatJson({
      role: 'planner',
      stage: 'shooting_plan',
      schema: shootingPlanResponseSchema,
      schemaName: 'ShootingPlan',
      systemPrompt: SHOOTING_PLAN_SYSTEM_PROMPT,
      userPrompt: buildShootingPlanPrompt(scenes, project.genre, validSuggestions.length),
      projectId: project.id,
      scriptId,
    });

    const allRisks = [
      ...shootingPlan.shootDays.flatMap((d) => d.risks),
      shootingPlan.riskSummary,
    ].filter(Boolean);

    const stored = await prisma.$transaction(async (tx) => {
      await tx.taskSuggestion.deleteMany({
        where: { projectId: project.id, scriptId, status: TaskSuggestionStatus.PENDING },
      });
      await tx.shootingPlan.deleteMany({ where: { projectId: project.id, scriptId } });

      const plan = await tx.shootingPlan.create({
        data: {
          projectId: project.id,
          scriptId,
          summary: shootingPlan.summary,
          totalShootDays: shootingPlan.shootDays.length,
          assumptions: shootingPlan.assumptions as Prisma.InputJsonValue,
          status: 'DRAFT',
          risks: allRisks as Prisma.InputJsonValue,
          plan: shootingPlan as unknown as Prisma.InputJsonValue,
        },
      });

      if (validSuggestions.length > 0) {
        await tx.taskSuggestion.createMany({
          data: validSuggestions.map((s) => ({
            projectId: project.id,
            scriptId,
            shootingPlanId: plan.id,
            title: s.title,
            description: s.description ?? undefined,
            departmentKind: mapDepartmentToKind(s.department),
            priority: s.priority,
            sceneNumbers: s.sceneNumbers,
            rationale: s.rationale,
            confidence: s.confidence,
            estimatedDueOffsetDays: s.suggestedDueOffsetDays ?? undefined,
            status: TaskSuggestionStatus.PENDING,
          })),
        });
      }

      return plan;
    });

    await completeScriptPlanning(scriptId, project.id, {
      planningPipeline: true,
      sceneCount: scenes.length,
      suggestionCount: validSuggestions.length,
      shootDayCount: shootingPlan.shootDays.length,
      summary: shootingPlan.summary,
      shootingPlanId: stored.id,
      lowSceneYield,
    });

    void dispatchNotification({
      userIds: [script.uploadedByUserId, project.ownerUserId],
      kind: 'AI_ANALYSIS_DONE',
      title: 'Your shooting plan is ready',
      body: `${validSuggestions.length} task suggestions and a ${shootingPlan.shootDays.length}-day draft plan.`,
      projectId: project.id,
      deepLink: `/project/${project.id}/director-review`,
      context: { scriptId },
    });

    log.info(
      { shootingPlanId: stored.id, suggestions: validSuggestions.length },
      'shooting_plan_stored',
    );

    return {
      shootingPlanId: stored.id,
      suggestionCount: validSuggestions.length,
    };
  } catch (error) {
    log.error({ error }, 'shooting_plan_pipeline_failed');
    await failScriptAnalysis(scriptId, project.id, error);
    throw error;
  }
}
