# Quickstart: Multiplayer Development Setup

**Feature**: Multiplayer P2P Signaling  
**Date**: 2026-06-03

---

## Prerequisites

- Node.js 22+ (check: `node --version`)
- npm 10+ (check: `npm --version`)
- Two browser windows/tabs (or two machines on the same network for real latency testing)

---

## Running the Signaling Server

```bash
cd server
npm install
npm run dev       # starts on ws://localhost:8080 (with ts-node-dev or tsx watch)
```

For production:
```bash
npm run build     # tsc → dist/
npm start         # node dist/index.js
```

---

## Running the Game Client

```bash
# From repo root
npm install
npm run dev       # starts Vite dev server on http://localhost:5173
```

By default the game client connects to `ws://localhost:8080` for signaling. To override (e.g., for a deployed server):

```bash
VITE_SIGNALING_URL=wss://your-server.example.com npm run dev
```

---

## Validation Results (2026-06-03)

Manual validation checklist:

- [x] Signaling server builds and runs (`cd server && npm run dev`)
- [x] Game client shows **Multiplayer** button in main menu
- [x] Host can create a room and see a 6-char code displayed
- [x] Guest can join via code — both sides advance to `negotiating` state
- [x] `peer_left` during lobby resets to idle state with message
- [x] ICE failure shows "Could not establish direct connection" + Retry button
- [x] In-game disconnect shows 3s countdown overlay, returns to MenuScene
- [x] `npm run test:run` passes (582 tests)
- [x] `cd server && npm test` passes (15 tests)
- [x] `npm run build` succeeds with no TypeScript errors

Note: End-to-end WebRTC game sync validation requires two physical peers;
confirmed at the signaling protocol level via server unit tests and
integration tests using the mock peer pair.

---

## Playing a Multiplayer Game Locally

1. Open two browser tabs: `http://localhost:5173`
2. In tab 1: click **Multiplayer → Create Room** → note the 6-character room code
3. In tab 2: click **Multiplayer → Join Room** → enter the room code
4. Both tabs should show "Connected — game starting!"
5. The game begins; tab 1 is the host, tab 2 is the guest

---

## Testing the Signaling Server Manually

Use a WebSocket client (e.g., `websocat` or browser console):

```bash
# Terminal 1 — host
websocat ws://localhost:8080
{"type":"create_room"}
# expect: {"type":"room_created","room":"ABC123"}
# (wait for guest to join)
# expect: {"type":"peer_joined"}

# Terminal 2 — guest
websocat ws://localhost:8080
{"type":"join","room":"ABC123"}
# expect: {"type":"joined","polite":true}
```

---

## Verifying Heartbeat and Graceful Disconnect

The signaling server pings all connected WebSockets every 30 s. If no pong is received within 10 s, the connection is terminated and `peer_left` is sent to the remaining peer.

**Manual test:**

```bash
# Terminal 1 — host
websocat ws://localhost:8080
{"type":"create_room"}
# note the room code, e.g. ABC123

# Terminal 2 — guest
websocat ws://localhost:8080
{"type":"join","room":"ABC123"}
# expect: {"type":"joined","polite":true}
# Terminal 1 should see: {"type":"peer_joined"}

# Now kill terminal 2 (Ctrl+C)
# Within 10 seconds of the next heartbeat cycle, terminal 1 receives:
# {"type":"peer_left"}
# Check the server log for "[room] room cleaned up" or similar.
```

This confirms that TCP-level disconnects (tab crash, network drop) are detected by the heartbeat and the surviving peer is notified promptly.

---

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `8080` | Signaling server port |
| `HEARTBEAT_INTERVAL_MS` | `30000` | WebSocket ping interval |
| `HEARTBEAT_TIMEOUT_MS` | `10000` | Terminate if no pong within this window |
| `ROOM_TIMEOUT_MS` | `300000` | Delete waiting rooms after 5 minutes |
| `VITE_SIGNALING_URL` | `ws://localhost:8080` | Signaling server URL for the game client |
| `VITE_TURN_URL` | _(unset)_ | TURN server URL, e.g. `turn:your-server.example.com:3478` |
| `VITE_TURN_USERNAME` | _(unset)_ | TURN server username |
| `VITE_TURN_CREDENTIAL` | _(unset)_ | TURN server credential |

---

## Deployment

The signaling server is a stateless Node.js WebSocket server. Deploy on any Node.js host:

- **Railway / Render / Fly.io**: Deploy `server/` as a Node.js service. Set `PORT` from the platform's environment.
- **Docker**: `FROM node:22-alpine`, copy `server/`, `RUN npm ci --production && npm run build`, `CMD ["node", "dist/index.js"]`.
- **No database, no persistent storage needed.**

For production multiplayer (users on different networks), you also need a TURN server for NAT traversal (~15–20% of users require it). See `research.md` section 6 for options.

To enable TURN, set the env vars at build time:
```bash
VITE_TURN_URL=turn:your-turn-server.example.com:3478 \
VITE_TURN_USERNAME=myuser \
VITE_TURN_CREDENTIAL=mypassword \
npm run build
```

`PeerConnection.ts` appends the TURN entry to `ICE_SERVERS` when `VITE_TURN_URL` is set.

---

## Running Tests

```bash
# Game client tests (Vitest)
npm run test:run

# Signaling server tests
cd server && npm run test
```

Tests implemented:
- `server/src/RoomRegistry.spec.ts`: room create/join/cleanup/relay/heartbeat (11 tests)
- `server/src/rateLimit.spec.ts`: per-IP rate limiting (4 tests)
- `src/multiplayer/GameStateEncoder.spec.ts`: binary encode/decode round-trips (7 tests)
- `src/multiplayer/__tests__/multiplayer.integration.spec.ts`: host/guest integration (4 tests)
