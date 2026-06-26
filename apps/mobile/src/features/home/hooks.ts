import { useQuery } from '@tanstack/react-query';
import { getActivityFeed, getHomeDashboard, type ActivityFilter } from '@/api/home';
import { qk } from '@/api/queryKeys';

export function useHomeQuery(projectId?: string | null) {
  return useQuery({
    queryKey: qk.home(projectId ?? undefined),
    queryFn: () => getHomeDashboard(projectId ?? undefined),
    enabled: Boolean(projectId),
    placeholderData: (previous) => previous,
  });
}

export function useActivityQuery(projectId: string | null | undefined, filter: ActivityFilter) {
  return useQuery({
    queryKey: qk.activity(projectId ?? undefined, filter),
    queryFn: () => getActivityFeed(projectId ?? undefined, filter),
    enabled: !!projectId,
  });
}
