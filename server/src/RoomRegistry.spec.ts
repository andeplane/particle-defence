import { describe, it, expect, vi, beforeEach } from 'vitest';
import { RoomRegistry } from './RoomRegistry.js';

// Minimal mock WebSocket that captures sent messages
function makeMockWs() {
  const sent: object[] = [];
  let _readyState = 1; // OPEN
  const ws = {
    get readyState() {
      return _readyState;
    },
    get OPEN() {
      return 1;
    },
    send: vi.fn((data: string) => sent.push(JSON.parse(data))),
    ping: vi.fn(),
    terminate: vi.fn(() => {
      _readyState = 3; // CLOSED
    }),
    on: vi.fn(),
    sent,
    close() {
      _readyState = 3;
    },
  };
  return ws;
}

type MockWs = ReturnType<typeof makeMockWs>;

let registry: RoomRegistry;

beforeEach(() => {
  registry = new RoomRegistry();
  vi.useFakeTimers();
});

describe('createRoom', () => {
  it('returns a 6-char alphanumeric code and registers the host', () => {
    const host = makeMockWs();
    const code = registry.createRoom(host as unknown as import('ws').default);
    expect(code).toMatch(/^[A-Z0-9]{6}$/);
    expect(registry.getRoom(code)).toBeDefined();
    expect(registry.getRoom(code)!.peers[0]).toBe(host);
  });

  it('two consecutive createRoom calls return different codes', () => {
    const ws1 = makeMockWs();
    const ws2 = makeMockWs();
    const c1 = registry.createRoom(ws1 as unknown as import('ws').default);
    const c2 = registry.createRoom(ws2 as unknown as import('ws').default);
    expect(c1).not.toBe(c2);
  });
});

describe('joinRoom', () => {
  it('returns joined and notifies host with peer_joined', () => {
    const host = makeMockWs();
    const guest = makeMockWs();
    const code = registry.createRoom(host as unknown as import('ws').default);

    const result = registry.joinRoom(code, guest as unknown as import('ws').default);

    expect(result).toBe('joined');
    expect(host.sent).toContainEqual({ type: 'peer_joined' });
  });

  it('returns room_not_found for unknown code', () => {
    const ws = makeMockWs();
    const result = registry.joinRoom('XXXXXX', ws as unknown as import('ws').default);
    expect(result).toBe('room_not_found');
  });

  it('returns room_full when room already has 2 peers', () => {
    const host = makeMockWs();
    const guest = makeMockWs();
    const third = makeMockWs();
    const code = registry.createRoom(host as unknown as import('ws').default);
    registry.joinRoom(code, guest as unknown as import('ws').default);

    const result = registry.joinRoom(code, third as unknown as import('ws').default);
    expect(result).toBe('room_full');
  });
});

describe('relay', () => {
  it('forwards to the correct peer only, not back to sender', () => {
    const host = makeMockWs();
    const guest = makeMockWs();
    const code = registry.createRoom(host as unknown as import('ws').default);
    registry.joinRoom(code, guest as unknown as import('ws').default);

    // Clear messages from joinRoom
    host.sent.length = 0;
    guest.sent.length = 0;

    const msg = { type: 'offer', sdp: { type: 'offer', sdp: 'v=0...' } };
    registry.relay(host as unknown as import('ws').default, msg);

    expect(guest.sent).toContainEqual(msg);
    expect(host.sent).toHaveLength(0);
  });
});

describe('leaveRoom', () => {
  it('notifies remaining peer with peer_left', () => {
    const host = makeMockWs();
    const guest = makeMockWs();
    const code = registry.createRoom(host as unknown as import('ws').default);
    registry.joinRoom(code, guest as unknown as import('ws').default);

    host.sent.length = 0;
    guest.sent.length = 0;

    registry.leaveRoom(host as unknown as import('ws').default);

    expect(guest.sent).toContainEqual({ type: 'peer_left' });
  });

  it('removes room when last peer leaves', () => {
    const host = makeMockWs();
    const code = registry.createRoom(host as unknown as import('ws').default);
    registry.leaveRoom(host as unknown as import('ws').default);
    expect(registry.getRoom(code)).toBeUndefined();
  });
});

describe('stale room sweep', () => {
  it('removes single-peer rooms that have been waiting beyond timeout', () => {
    const host = makeMockWs();
    const code = registry.createRoom(host as unknown as import('ws').default);

    expect(registry.getRoom(code)).toBeDefined();

    // Advance time past 5 minute threshold
    vi.advanceTimersByTime(5 * 60 * 1000 + 1);

    const sweep = registry.startStaleRoomSweep(100);
    vi.advanceTimersByTime(100);
    clearInterval(sweep);

    expect(registry.getRoom(code)).toBeUndefined();
    expect(host.sent).toContainEqual({ type: 'error', message: 'Room expired' });
  });
});

describe('heartbeat', () => {
  it('terminates non-responsive sockets', () => {
    const host = makeMockWs();
    registry.createRoom(host as unknown as import('ws').default);

    const heartbeat = registry.startHeartbeat(1000, 500);

    // Advance past timeout without recording a pong
    vi.advanceTimersByTime(2000);
    clearInterval(heartbeat);

    expect(host.terminate).toHaveBeenCalled();
  });

  it('does not terminate sockets that respond with pong', () => {
    const host = makeMockWs();
    registry.createRoom(host as unknown as import('ws').default);

    const heartbeat = registry.startHeartbeat(1000, 500);

    // Record pong to simulate a healthy connection
    vi.advanceTimersByTime(400);
    registry.recordPong(host as unknown as import('ws').default);
    vi.advanceTimersByTime(400);
    registry.recordPong(host as unknown as import('ws').default);
    vi.advanceTimersByTime(400);

    clearInterval(heartbeat);

    expect(host.terminate).not.toHaveBeenCalled();
  });
});
