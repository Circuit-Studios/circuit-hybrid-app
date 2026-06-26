export interface SplitScene {
  sceneNumber: string;
  slugline: string;
  text: string;
}

const SLUGLINE_RE = /^(INT\.|EXT\.|INT\/EXT\.|I\/E\.|EXT\/INT\.|INT\.\/EXT\.|EST\.|SCENE\s+\d+)/i;

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
export function splitScenes(rawText: string): SplitScene[] {
  const lines = rawText.replace(/\r\n/g, '\n').split('\n');
  const scenes: SplitScene[] = [];
  let currentSlug = '';
  let currentLines: string[] = [];
  let sceneIndex = 0;

  const flush = () => {
    const text = currentLines.join('\n').trim();
    if (!currentSlug && !text) return;
    const slugline = currentSlug || 'UNHEADED SCENE';
    scenes.push({
      sceneNumber: inferSceneNumber(sceneIndex, slugline),
      slugline,
      text: text || slugline,
    });
    sceneIndex += 1;
    currentSlug = '';
    currentLines = [];
  };

  for (const line of lines) {
    const trimmed = line.trim();
    if (SLUGLINE_RE.test(trimmed)) {
      if (currentSlug || currentLines.length > 0) flush();
      currentSlug = normaliseSlugline(trimmed);
      currentLines.push(trimmed);
      continue;
    }
    if (currentSlug) currentLines.push(line);
  }

  flush();

  if (scenes.length === 0 && rawText.trim()) {
    scenes.push({
      sceneNumber: '1',
      slugline: 'FULL SCRIPT',
      text: rawText.trim(),
    });
  }

  return dedupeSceneNumbers(scenes);
}

function dedupeSceneNumbers(scenes: SplitScene[]): SplitScene[] {
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
