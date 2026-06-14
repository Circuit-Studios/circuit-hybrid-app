import { useQuery } from '@tanstack/react-query';
import { listMembers } from '@/api/members';
import { qk } from '@/api/queryKeys';

export function useTeamMembersQuery(projectId: string | undefined) {
  return useQuery({
    queryKey: qk.members(projectId ?? ''),
    queryFn: () => listMembers(projectId!),
    enabled: Boolean(projectId),
  });
}
