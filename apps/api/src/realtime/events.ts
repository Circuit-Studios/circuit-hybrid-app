// Real-time event payloads emitted over Socket.IO. The mobile client uses
// the topic name to decide which React Query cache to invalidate.
//
// Keep these typed even though the wire format is loose JSON — it lets
// callers in the API layer get a compile-time check that they passed the
// right shape, and avoids silent drift between server emit + client handler.

export type RealtimeTopic =
  | 'task.created'
  | 'task.updated'
  | 'task.deleted'
  | 'member.invited'
  | 'member.updated'
  | 'shootday.created'
  | 'shootday.updated'
  | 'shootday.deleted'
  | 'conflict.created'
  | 'conflict.resolved'
  | 'script.analysis.updated'
  | 'notification.created'
  | 'character.updated'
  | 'scene.updated'
  | 'department.updated'
  | 'budgetline.updated';

export interface RealtimeEvent<T = unknown> {
  topic: RealtimeTopic;
  projectId: string;
  // ISO timestamp; lets clients drop stale events.
  ts: string;
  data: T;
}

export function buildEvent<T>(topic: RealtimeTopic, projectId: string, data: T): RealtimeEvent<T> {
  return { topic, projectId, ts: new Date().toISOString(), data };
}
