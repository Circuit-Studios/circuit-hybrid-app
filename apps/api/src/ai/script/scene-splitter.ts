export type ScriptSceneChunk = {
  sceneNumber: string;
  slugline: string;
  text: string;
  startOffset: number;
  endOffset: number;
};

/** @alias ScriptSceneChunk */
export type SplitScene = ScriptSceneChunk;

const SLUGLINE_RE =
  /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EXT\/INT\.|INT\.\/EXT\.|EST\.|INT\s+-|EXT\s+-|SCENE\s+\d+)/i;

function normaliseSlugline(line: string): string {
  return line.trim().replace(/\s+/g, ' ');
}

function inferSceneNumber(index: number, slugline: string): string {
  const match = slugline.match(/SCENE\s+(\d+[A-Z]?)/i);
  if (match?.[1]) return match[1].toUpperCase();
  return String(index + 1);
}

/**
 * Deterministic screenplay splitter — breaks on sluglines like INT./EXT.
 * Used before LLM extraction so the model works on bounded scene chunks.
 */
export function splitScenes(rawText: string): ScriptSceneChunk[] {
  const normalised = rawText.replace(/\r\n/g, '\n');
  const lines = normalised.split('\n');
  const scenes: ScriptSceneChunk[] = [];
  let currentSlug = '';
  let currentLines: string[] = [];
  let sceneIndex = 0;
  let sceneStartOffset = 0;
  let lineOffset = 0;

  const flush = (endOffset: number) => {
    const text = currentLines.join('\n').trim();
    if (!currentSlug && !text) return;
    const slugline = currentSlug || 'UNHEADED SCENE';
    scenes.push({
      sceneNumber: inferSceneNumber(sceneIndex, slugline),
      slugline,
      text: text || slugline,
      startOffset: sceneStartOffset,
      endOffset,
    });
    sceneIndex += 1;
    currentSlug = '';
    currentLines = [];
  };

  for (const line of lines) {
    const lineStart = lineOffset;
    const lineEnd = lineOffset + line.length;
    const trimmed = line.trim();

    if (SLUGLINE_RE.test(trimmed)) {
      if (currentSlug || currentLines.length > 0) flush(lineStart);
      currentSlug = normaliseSlugline(trimmed);
      sceneStartOffset = lineStart;
      currentLines.push(trimmed);
      lineOffset = lineEnd + 1;
      continue;
    }

    if (currentSlug) currentLines.push(line);
    lineOffset = lineEnd + 1;
  }

  flush(normalised.length);

  if (scenes.length === 0 && normalised.trim()) {
    scenes.push({
      sceneNumber: '1',
      slugline: 'FULL SCRIPT',
      text: normalised.trim(),
      startOffset: 0,
      endOffset: normalised.length,
    });
  }

  return dedupeSceneNumbers(scenes);
}

/** Spec alias for splitScenes. */
export function splitScriptIntoScenes(scriptText: string): ScriptSceneChunk[] {
  return splitScenes(scriptText);
}

function dedupeSceneNumbers(scenes: ScriptSceneChunk[]): ScriptSceneChunk[] {
  const seen = new Map<string, number>();
  return scenes.map((scene) => {
    const base = scene.sceneNumber;
    const count = seen.get(base) ?? 0;
    seen.set(base, count + 1);
    if (count === 0) return scene;
    return { ...scene, sceneNumber: `${base}${String.fromCharCode(65 + count - 1)}` };
  });
}

export function batchScenes<T extends { text: string }>(scenes: T[], maxChars: number): T[][] {
  if (scenes.length === 0) return [];
  const batches: T[][] = [];
  let current: T[] = [];
  let size = 0;

  for (const scene of scenes) {
    const sceneSize = scene.text.length + 2;
    if (current.length > 0 && size + sceneSize > maxChars) {
      batches.push(current);
      current = [];
      size = 0;
    }
    current.push(scene);
    size += sceneSize;
  }

  if (current.length > 0) batches.push(current);
  return batches;
}
