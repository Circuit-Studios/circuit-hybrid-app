import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { listProjects } from '@/api/projects';
import { acceptInvite, listMyInvites } from '@/api/members';
import { qk } from '@/api/queryKeys';

export function useProjectsQuery() {
  return useQuery({
    queryKey: qk.projects(),
    queryFn: listProjects,
  });
}

export function useMyInvitesQuery() {
  return useQuery({
    queryKey: qk.myInvites(),
    queryFn: listMyInvites,
  });
}

export function useAcceptInviteMutation() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => acceptInvite(memberId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.projects() });
      void qc.invalidateQueries({ queryKey: qk.myInvites() });
    },
  });
}

export function useInvalidateProjects() {
  const qc = useQueryClient();
  return () => void qc.invalidateQueries({ queryKey: qk.projects() });
}
