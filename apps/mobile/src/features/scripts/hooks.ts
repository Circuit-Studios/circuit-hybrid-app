import { useQuery } from '@tanstack/react-query';
import { getAnalysis } from '@/api/scripts';
import { qk } from '@/api/queryKeys';

export function useScriptAnalysisQuery(scriptId: string | undefined) {
  return useQuery({
    queryKey: qk.analysis(scriptId ?? ''),
    queryFn: () => getAnalysis(scriptId!),
    enabled: Boolean(scriptId),
  });
}
