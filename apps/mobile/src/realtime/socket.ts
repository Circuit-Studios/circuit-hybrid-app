// Mobile-side socket.io client. Owns one long-lived socket per signed-in
// session, tracks which project rooms we've joined, and dispatches incoming
// events to a registered handler (typically: invalidate React Query caches).

import { io, Socket } from 'socket.io-client';
import { API_BASE_URL } from '@/api/client';
import type { RealtimeEvent } from '@/api/types';

type EventHandler = (event: RealtimeEvent) => void;

class CircuitSocket {
  private socket: Socket | null = null;
  private currentToken: string | null = null;
  private joinedProjects = new Set<string>();
  private handlers = new Set<EventHandler>();

  // (Re)connect with the given JWT. If the token changed, tear down the old
  // socket first — auth is set at handshake time and can't be swapped mid-
  // connection.
  connect(token: string): void {
    if (this.socket && this.currentToken === token) return;
    this.disconnect();
    this.currentToken = token;
    this.socket = io(API_BASE_URL, {
      auth: { token },
      transports: ['websocket'],
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1_000,
      reconnectionDelayMax: 8_000,
      timeout: 10_000,
    });

    this.socket.on('connect', () => {
      // Re-join any project rooms we were in before a disconnect. This
      // covers the "phone slept, socket dropped, screen still mounted"
      // case — the dashboard should resume without the user noticing.
      for (const projectId of this.joinedProjects) {
        this.socket?.emit('join', { projectId });
      }
    });

    this.socket.on('event', (event: RealtimeEvent) => {
      for (const handler of this.handlers) handler(event);
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.removeAllListeners();
      this.socket.disconnect();
    }
    this.socket = null;
    this.currentToken = null;
    this.joinedProjects.clear();
  }

  async joinProject(projectId: string): Promise<void> {
    this.joinedProjects.add(projectId);
    if (!this.socket?.connected) return;
    await new Promise<void>(resolve => {
      this.socket!.emit('join', { projectId }, () => resolve());
    });
  }

  async leaveProject(projectId: string): Promise<void> {
    this.joinedProjects.delete(projectId);
    if (!this.socket?.connected) return;
    await new Promise<void>(resolve => {
      this.socket!.emit('leave', { projectId }, () => resolve());
    });
  }

  onEvent(handler: EventHandler): () => void {
    this.handlers.add(handler);
    return () => this.handlers.delete(handler);
  }
}

export const circuitSocket = new CircuitSocket();
