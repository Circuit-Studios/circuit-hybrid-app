import { useQuery } from '@tanstack/react-query';
import { listShootDays } from '@/api/workspace';
import { qk } from '@/api/queryKeys';

export function useScheduleQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: qk.schedule(projectId ?? ''),
    queryFn: () => listShootDays(projectId!),
    enabled: Boolean(projectId),
  });
}
