import { api } from './client';
import type { ActivityFeed, HomeDashboard } from './types';

export async function getHomeDashboard(projectId?: string): Promise<HomeDashboard> {
  const { data } = await api.get<HomeDashboard>('/home', {
    params: projectId ? { projectId } : undefined,
  });
  return data;
}

export type ActivityFilter = 'all' | 'tasks' | 'schedule' | 'team';

export async function getActivityFeed(
  projectId?: string,
  filter: ActivityFilter = 'all',
): Promise<ActivityFeed> {
  const { data } = await api.get<ActivityFeed>('/home/activity', {
    params: { ...(projectId ? { projectId } : {}), filter },
  });
  return data;
}
