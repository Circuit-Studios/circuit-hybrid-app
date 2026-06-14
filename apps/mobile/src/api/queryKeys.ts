/** Central React Query key factory — one source of truth for features + realtime. */
export const qk = {
  projects: () => ['projects'] as const,
  myInvites: () => ['my-invites'] as const,

  project: (id: string) => ['project', id] as const,
  health: (projectId: string) => ['health', projectId] as const,

  tasks: (projectId: string, departmentId = 'all') =>
    ['tasks', projectId, departmentId] as const,
  tasksRoot: (projectId: string) => ['tasks', projectId] as const,

  schedule: (projectId: string) => ['schedule', projectId] as const,
  conflicts: (projectId: string) => ['conflicts', projectId] as const,
  members: (projectId: string) => ['members', projectId] as const,

  notifications: () => ['notifications'] as const,
  notificationsList: (unreadOnly: boolean) =>
    ['notifications', unreadOnly ? 'unread' : 'all'] as const,
  unreadCount: () => ['notifications', 'unread-count'] as const,

  analysis: (scriptId: string) => ['analysis', scriptId] as const,
  analysisRoot: () => ['analysis'] as const,

  characters: (projectId: string) => ['characters', projectId] as const,
  scenes: (projectId: string) => ['scenes', projectId] as const,
  departments: (projectId: string) => ['departments', projectId] as const,
  budgetLines: (projectId: string) => ['budget-lines', projectId] as const,
};
