import { qk } from '../queryKeys';

describe('qk', () => {
  it('builds stable static keys', () => {
    expect(qk.projects()).toEqual(['projects']);
    expect(qk.myInvites()).toEqual(['my-invites']);
    expect(qk.notifications()).toEqual(['notifications']);
    expect(qk.unreadCount()).toEqual(['notifications', 'unread-count']);
    expect(qk.analysisRoot()).toEqual(['analysis']);
  });

  it('builds parameterized keys', () => {
    expect(qk.project('p1')).toEqual(['project', 'p1']);
    expect(qk.health('p1')).toEqual(['health', 'p1']);
    expect(qk.tasks('p1')).toEqual(['tasks', 'p1', 'all']);
    expect(qk.tasks('p1', 'dept-a')).toEqual(['tasks', 'p1', 'dept-a']);
    expect(qk.tasksRoot('p1')).toEqual(['tasks', 'p1']);
    expect(qk.notificationsList(true)).toEqual(['notifications', 'unread']);
    expect(qk.notificationsList(false)).toEqual(['notifications', 'all']);
  });

  it('uses tasksRoot as a prefix for department-scoped task keys', () => {
    const root = qk.tasksRoot('p1');
    expect(qk.tasks('p1', 'camera').slice(0, root.length)).toEqual(root);
  });
});
