import { useEffect } from 'react';
import { circuitSocket } from './socket';

// Hook a screen into a project's realtime room for the duration of the
// screen's mount. The provider already handles connection lifecycle —
// this just opt-in / opt-out of the per-project broadcast group.
export function useProjectRoom(projectId: string | undefined | null): void {
  useEffect(() => {
    if (!projectId) return;
    void circuitSocket.joinProject(projectId);
    return () => {
      void circuitSocket.leaveProject(projectId);
    };
  }, [projectId]);
}
