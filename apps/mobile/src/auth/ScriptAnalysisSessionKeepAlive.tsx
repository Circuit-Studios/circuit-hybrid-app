import { useEffect, useMemo, useSyncExternalStore } from 'react';
import { useQueries } from '@tanstack/react-query';
import { getAnalysis } from '@/api/scripts';
import { qk } from '@/api/queryKeys';
import { isScriptAnalysisInProgress } from '@/lib/session';
import type { ScriptAnalysisStatus } from '@/api/types';
import {
  getActiveScriptAnalysisIds,
  subscribeActiveScriptAnalyses,
  unregisterActiveScriptAnalysis,
} from '@/auth/activeScriptAnalysis';
import { useKeepSessionAliveWhile } from '@/auth/useKeepSessionAliveWhile';
import { useAuth } from '@/auth/AuthContext';

/** Keeps the session alive while any registered script analysis is in progress. */
export function ScriptAnalysisSessionKeepAlive() {
  const { status } = useAuth();
  const scriptIds = useSyncExternalStore(
    subscribeActiveScriptAnalyses,
    getActiveScriptAnalysisIds,
    getActiveScriptAnalysisIds,
  );

  const enabled = status === 'signedIn' && scriptIds.length > 0;

  const queries = useQueries({
    queries: scriptIds.map((scriptId) => ({
      queryKey: qk.analysis(scriptId),
      queryFn: () => getAnalysis(scriptId),
      enabled,
      refetchInterval: 2500,
    })),
  });

  const analysisSnapshot = queries
    .map((q) => `${q.data?.script.id ?? ''}:${q.data?.script.analysisStatus ?? ''}`)
    .join('|');

  const completedScriptIds = useMemo(() => {
    const done: string[] = [];
    if (!analysisSnapshot) return '';
    for (const part of analysisSnapshot.split('|')) {
      const [scriptId, analysisStatus] = part.split(':');
      if (
        scriptId &&
        analysisStatus &&
        !isScriptAnalysisInProgress(analysisStatus as ScriptAnalysisStatus)
      ) {
        done.push(scriptId);
      }
    }
    return done.sort().join(',');
  }, [analysisSnapshot]);

  useEffect(() => {
    if (!enabled || !completedScriptIds) return;
    for (const scriptId of completedScriptIds.split(',')) {
      if (scriptId) unregisterActiveScriptAnalysis(scriptId);
    }
  }, [enabled, completedScriptIds]);

  const keepAlive =
    enabled &&
    (queries.some((query) => query.isFetching) ||
      queries.some((query) => isScriptAnalysisInProgress(query.data?.script.analysisStatus)));

  useKeepSessionAliveWhile(keepAlive);

  return null;
}
