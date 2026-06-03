import type WebSocket from 'ws';

interface Room {
  id: string;
  peers: WebSocket[];
  createdAt: number;
}

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
const CODE_LENGTH = 6;
const STALE_ROOM_AGE_MS = 5 * 60 * 1000; // 5 minutes

function generateCode(): string {
  let code = '';
  const bytes = new Uint8Array(CODE_LENGTH);
  crypto.getRandomValues(bytes);
  for (const b of bytes) {
    code += CHARS[b % CHARS.length];
  }
  return code;
}

function send(ws: WebSocket, msg: object): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

export class RoomRegistry {
  private rooms = new Map<string, Room>();
  private socketToRoom = new Map<WebSocket, string>();
  private lastPong = new Map<WebSocket, number>();

  createRoom(ws: WebSocket): string {
    let code = generateCode();
    // Retry on the rare collision
    while (this.rooms.has(code)) {
      code = generateCode();
    }
    const room: Room = { id: code, peers: [ws], createdAt: Date.now() };
    this.rooms.set(code, room);
    this.socketToRoom.set(ws, code);
    this.lastPong.set(ws, Date.now());
    return code;
  }

  joinRoom(code: string, ws: WebSocket): 'joined' | 'room_not_found' | 'room_full' {
    const room = this.rooms.get(code);
    if (!room) return 'room_not_found';
    if (room.peers.length >= 2) return 'room_full';

    room.peers.push(ws);
    this.socketToRoom.set(ws, code);
    this.lastPong.set(ws, Date.now());

    // Notify the host that a peer joined
    const host = room.peers[0];
    send(host, { type: 'peer_joined' });

    return 'joined';
  }

  relay(sender: WebSocket, message: object): void {
    const code = this.socketToRoom.get(sender);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room) return;
    for (const peer of room.peers) {
      if (peer !== sender) {
        send(peer, message);
      }
    }
  }

  leaveRoom(ws: WebSocket): void {
    const code = this.socketToRoom.get(ws);
    if (!code) return;
    const room = this.rooms.get(code);
    if (!room) return;

    room.peers = room.peers.filter(p => p !== ws);
    this.socketToRoom.delete(ws);
    this.lastPong.delete(ws);

    if (room.peers.length === 0) {
      this.rooms.delete(code);
    } else {
      // Notify remaining peer
      for (const peer of room.peers) {
        send(peer, { type: 'peer_left' });
      }
    }
  }

  recordPong(ws: WebSocket): void {
    if (this.socketToRoom.has(ws)) {
      this.lastPong.set(ws, Date.now());
    }
  }

  startStaleRoomSweep(intervalMs: number): NodeJS.Timeout {
    return setInterval(() => {
      const now = Date.now();
      for (const [code, room] of this.rooms) {
        // Only sweep single-peer rooms (no guest ever joined)
        if (room.peers.length === 1 && now - room.createdAt > STALE_ROOM_AGE_MS) {
          send(room.peers[0], { type: 'error', message: 'Room expired' });
          this.socketToRoom.delete(room.peers[0]);
          this.lastPong.delete(room.peers[0]);
          this.rooms.delete(code);
        }
      }
    }, intervalMs);
  }

  startHeartbeat(pingIntervalMs: number, timeoutMs: number): NodeJS.Timeout {
    return setInterval(() => {
      const now = Date.now();
      for (const ws of this.socketToRoom.keys()) {
        const last = this.lastPong.get(ws) ?? now;
        if (now - last > timeoutMs) {
          // No pong received within timeout — terminate and clean up
          ws.terminate();
          this.leaveRoom(ws);
        } else {
          ws.ping();
        }
      }
    }, pingIntervalMs);
  }

  getRoomCount(): number {
    return this.rooms.size;
  }

  getRoom(code: string): Room | undefined {
    return this.rooms.get(code);
  }
}
