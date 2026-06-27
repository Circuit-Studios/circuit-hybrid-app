import { useEffect, useSyncExternalStore } from 'react';
import { useQueries } from '@tanstack/react-query';
import { getAnalysis } from '@/api/scripts';
import { qk } from '@/api/queryKeys';
import { isScriptAnalysisInProgress } from '@/lib/session';
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

  useEffect(() => {
    if (!enabled) return;
    for (const query of queries) {
      const scriptId = query.data?.script.id;
      const analysisStatus = query.data?.script.analysisStatus;
      if (scriptId && !isScriptAnalysisInProgress(analysisStatus)) {
        unregisterActiveScriptAnalysis(scriptId);
      }
    }
  }, [enabled, queries]);

  const keepAlive =
    enabled &&
    (queries.some((query) => query.isFetching) ||
      queries.some((query) => isScriptAnalysisInProgress(query.data?.script.analysisStatus)));

  useKeepSessionAliveWhile(keepAlive);

  return null;
}
