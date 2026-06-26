import { usePathname } from 'expo-router';
import { AppTabBar } from '@/components/AppTabBar';
import { ProjectTabBar, type ProjectTab } from '@/components/project/ProjectTabBar';

function resolveProjectTab(pathname: string, projectId: string): ProjectTab {
  const base = `/project/${projectId}`;
  if (pathname.includes(`${base}/tasks`)) return 'tasks';
  if (pathname.includes(`${base}/schedule`)) return 'schedule';
  if (pathname.includes(`${base}/team`)) return 'team';
  return 'workspace';
}

function parseProjectRoute(pathname: string): { projectId: string; active: ProjectTab } | null {
  const match = pathname.match(/\/project\/([^/]+)/);
  if (!match?.[1]) return null;
  const projectId = match[1];
  return { projectId, active: resolveProjectTab(pathname, projectId) };
}

/** Global floating tab bar — app tabs everywhere, project tabs inside a project. */
export function AppFloatingTabBar() {
  const pathname = usePathname();
  const project = parseProjectRoute(pathname);

  if (project) {
    return <ProjectTabBar projectId={project.projectId} active={project.active} />;
  }

  return <AppTabBar />;
}
