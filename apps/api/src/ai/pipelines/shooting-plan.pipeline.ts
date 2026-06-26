import { TaskSuggestionStatus, type Prisma } from '@prisma/client';
import { env } from '../../config/env.js';
import { prisma } from '../../lib/prisma.js';
import { logger } from '../../lib/logger.js';
import { chatJson } from '../llm/index.js';
import { extractPdfText } from '../pdf.js';
import {
  sceneBreakdownResponseSchema,
  type ExtractedSceneFact,
} from '../schemas/scene-breakdown.schema.js';
import { taskSuggestionsResponseSchema } from '../schemas/task-suggestions.schema.js';
import { shootingPlanResponseSchema } from '../schemas/shooting-plan.schema.js';
import { batchScenes, splitScenes } from '../script/scene-splitter.js';
import {
  SHOOTING_PLAN_SYSTEM_PROMPT,
  buildSceneExtractionPrompt,
  buildShootingPlanPrompt,
  buildTaskSuggestionsPrompt,
} from '../prompts/shooting-plan.js';

function mergeSceneFacts(batches: ExtractedSceneFact[][]): ExtractedSceneFact[] {
  const byKey = new Map<string, ExtractedSceneFact>();
  for (const batch of batches) {
    for (const scene of batch) {
      const key = `${scene.sceneNumber}::${scene.slugline}`;
      if (!byKey.has(key)) {
        byKey.set(key, scene);
        continue;
      }
      const existing = byKey.get(key)!;
      const mergedChars = Array.from(
        new Set([...existing.charactersPresent, ...scene.charactersPresent]),
      );
      byKey.set(key, {
        ...existing,
        synopsis: existing.synopsis ?? scene.synopsis,
        charactersPresent: mergedChars,
        hasStunts: existing.hasStunts || scene.hasStunts,
        hasVFX: existing.hasVFX || scene.hasVFX,
        hasSong: existing.hasSong || scene.hasSong,
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

  let rawText = script.rawText;
  if (!rawText) {
    const extracted = await extractPdfText(script.storageKey);
    rawText = extracted.rawText;
    await prisma.script.update({
      where: { id: scriptId },
      data: { rawText, pageCount: extracted.pageCount },
    });
  }

  const capped = rawText.slice(0, env.LLM_MAX_SCRIPT_CHARS);
  const split = splitScenes(capped);
  const batches = batchScenes(split, env.LLM_MAX_CHUNK_CHARS);
  log.info({ sceneCount: split.length, batchCount: batches.length }, 'scenes_split');

  const extractedBatches: ExtractedSceneFact[][] = [];
  for (const [index, batch] of batches.entries()) {
    const response = await chatJson({
      role: 'extractor',
      stage: `scene_extraction_${index + 1}`,
      schema: sceneBreakdownResponseSchema,
      schemaName: 'SceneBreakdown',
      systemPrompt: SHOOTING_PLAN_SYSTEM_PROMPT,
      userPrompt: buildSceneExtractionPrompt(batch, project.genre),
      projectId: project.id,
      scriptId,
    });
    extractedBatches.push(response.scenes);
  }

  const scenes = mergeSceneFacts(extractedBatches);
  log.info({ mergedScenes: scenes.length }, 'scene_facts_merged');

  const taskSuggestions = await chatJson({
    role: 'planner',
    stage: 'task_suggestions',
    schema: taskSuggestionsResponseSchema,
    schemaName: 'TaskSuggestions',
    systemPrompt: SHOOTING_PLAN_SYSTEM_PROMPT,
    userPrompt: buildTaskSuggestionsPrompt(scenes, project.genre),
    projectId: project.id,
    scriptId,
  });

  const shootingPlan = await chatJson({
    role: 'planner',
    stage: 'shooting_plan',
    schema: shootingPlanResponseSchema,
    schemaName: 'ShootingPlan',
    systemPrompt: SHOOTING_PLAN_SYSTEM_PROMPT,
    userPrompt: buildShootingPlanPrompt(scenes, project.genre, taskSuggestions.suggestions.length),
    projectId: project.id,
    scriptId,
  });

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
        totalShootDays: shootingPlan.totalShootDays,
        risks: shootingPlan.risks as Prisma.InputJsonValue,
        plan: shootingPlan as unknown as Prisma.InputJsonValue,
      },
    });

    if (taskSuggestions.suggestions.length > 0) {
      await tx.taskSuggestion.createMany({
        data: taskSuggestions.suggestions.map((s) => ({
          projectId: project.id,
          scriptId,
          shootingPlanId: plan.id,
          title: s.title,
          description: s.description ?? undefined,
          departmentKind: s.departmentKind,
          priority: s.priority,
          sceneNumbers: s.sceneNumbers,
          characterNames: s.characterNames,
          estimatedDueOffsetDays: s.estimatedDueOffsetDays ?? undefined,
          status: TaskSuggestionStatus.PENDING,
        })),
      });
    }

    return plan;
  });

  log.info(
    { shootingPlanId: stored.id, suggestions: taskSuggestions.suggestions.length },
    'shooting_plan_stored',
  );

  return {
    shootingPlanId: stored.id,
    suggestionCount: taskSuggestions.suggestions.length,
  };
}
