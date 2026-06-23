import { FloatingProjectTabBar } from '@/components/project/FloatingProjectTabBar';

export type ProjectTab = 'workspace' | 'tasks' | 'schedule' | 'team';

export interface ProjectTabBarProps {
  projectId: string;
  active: ProjectTab;
}

/** Project workspace navigation — floating glass capsule tab bar. */
export function ProjectTabBar(props: ProjectTabBarProps) {
  return <FloatingProjectTabBar {...props} />;
}
