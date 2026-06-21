import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import { useProjectsQuery } from '@/features/projects/hooks';

interface ActiveProjectContextValue {
  projectId: string | null;
  setProjectId(id: string | null): void;
}

const ActiveProjectContext = createContext<ActiveProjectContextValue | null>(null);

export function ActiveProjectProvider({ children }: { children: ReactNode }) {
  const { data: projects } = useProjectsQuery();
  const [overrideId, setOverrideId] = useState<string | null>(null);

  const projectId = useMemo(() => {
    if (overrideId && projects?.some(p => p.id === overrideId)) return overrideId;
    return projects?.[0]?.id ?? null;
  }, [overrideId, projects]);

  const setProjectId = useCallback((id: string | null) => {
    setOverrideId(id);
  }, []);

  const value = useMemo(() => ({ projectId, setProjectId }), [projectId, setProjectId]);

  return (
    <ActiveProjectContext.Provider value={value}>{children}</ActiveProjectContext.Provider>
  );
}

export function useActiveProject(): ActiveProjectContextValue {
  const ctx = useContext(ActiveProjectContext);
  if (!ctx) {
    throw new Error('useActiveProject must be used inside ActiveProjectProvider');
  }
  return ctx;
}
