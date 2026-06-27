const activeScriptIds = new Set<string>();
const listeners = new Set<() => void>();

function emit(): void {
  for (const listener of listeners) listener();
}

export function registerActiveScriptAnalysis(scriptId: string): void {
  if (activeScriptIds.has(scriptId)) return;
  activeScriptIds.add(scriptId);
  emit();
}

export function unregisterActiveScriptAnalysis(scriptId: string): void {
  if (!activeScriptIds.delete(scriptId)) return;
  emit();
}

export function subscribeActiveScriptAnalyses(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getActiveScriptAnalysisIds(): string[] {
  return Array.from(activeScriptIds);
}
