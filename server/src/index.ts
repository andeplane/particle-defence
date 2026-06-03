import { WebSocketServer } from 'ws';
import type WebSocket from 'ws';
import type { IncomingMessage } from 'node:http';
import { RoomRegistry } from './RoomRegistry.js';
import { RateLimiter } from './rateLimit.js';
import type { ClientMessage } from './types.js';

const PORT = parseInt(process.env.PORT ?? '8080', 10);
const HEARTBEAT_INTERVAL_MS = 30_000;
const HEARTBEAT_TIMEOUT_MS = 10_000;
const STALE_SWEEP_INTERVAL_MS = 60_000;

const registry = new RoomRegistry();
const rateLimiter = new RateLimiter();

const wss = new WebSocketServer({ port: PORT });

function send(ws: WebSocket, msg: object): void {
  if (ws.readyState === ws.OPEN) {
    ws.send(JSON.stringify(msg));
  }
}

function getIp(req: IncomingMessage): string {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string') return forwarded.split(',')[0].trim();
  return req.socket.remoteAddress ?? 'unknown';
}

wss.on('connection', (ws: WebSocket, req: IncomingMessage) => {
  const ip = getIp(req);

  ws.on('error', () => {
    // Always handle errors to prevent process crash
    registry.leaveRoom(ws);
  });

  ws.on('pong', () => {
    registry.recordPong(ws);
  });

  ws.on('message', (data: Buffer) => {
    let msg: ClientMessage;
    try {
      msg = JSON.parse(data.toString()) as ClientMessage;
    } catch {
      ws.terminate();
      return;
    }

    switch (msg.type) {
      case 'create_room': {
        if (!rateLimiter.allow(ip)) {
          send(ws, { type: 'error', message: 'Rate limit exceeded — try again in a moment' });
          ws.close();
          return;
        }
        const code = registry.createRoom(ws);
        send(ws, { type: 'room_created', room: code });
        console.log(`[room] created ${code} from ${ip}`);
        break;
      }

      case 'join': {
        const result = registry.joinRoom(msg.room, ws);
        if (result === 'joined') {
          send(ws, { type: 'joined', polite: true });
          console.log(`[room] guest joined ${msg.room} from ${ip}`);
        } else if (result === 'room_full') {
          send(ws, { type: 'room_full' });
        } else {
          send(ws, { type: 'room_not_found' });
        }
        break;
      }

      case 'offer':
      case 'answer':
      case 'ice': {
        registry.relay(ws, msg);
        break;
      }

      default: {
        // Unknown message type — close silently
        ws.terminate();
      }
    }
  });

  ws.on('close', () => {
    registry.leaveRoom(ws);
  });
});

registry.startHeartbeat(HEARTBEAT_INTERVAL_MS, HEARTBEAT_TIMEOUT_MS);
registry.startStaleRoomSweep(STALE_SWEEP_INTERVAL_MS);

wss.on('listening', () => {
  console.log(`Signaling server listening on ws://localhost:${PORT}`);
});

wss.on('error', (err: Error) => {
  console.error('Server error:', err);
});
