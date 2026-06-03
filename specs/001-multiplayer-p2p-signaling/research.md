# Research: Multiplayer P2P Signaling

**Phase 0 output for** `001-multiplayer-p2p-signaling`  
**Date**: 2026-06-03

---

## 1. Transport Layer: WebRTC DataChannel vs. WebSocket Relay

**Decision:** WebRTC DataChannel in unreliable/unordered mode for live game state.

**Rationale:** WebRTC DataChannel with `{ ordered: false, maxRetransmits: 0 }` gives UDP-semantics over DTLS/SCTP — no head-of-line blocking, no retransmit stalls. For a particle simulation sending position snapshots every 100 ms, a dropped packet is irrelevant; the next one arrives shortly. After ICE connection is established, P2P eliminates the server relay hop, saving 20–80 ms round-trip compared to a WebSocket relay through a VPS.

**Alternatives considered:**
- Pure WebSocket relay: Simpler, always works, no NAT issues. Adds permanent server relay latency and server bandwidth proportional to game data. Acceptable as an MVP fallback, but not the target architecture.
- WebTransport (HTTP/3-based UDP): Lower latency than WebSockets, but browser support is still limited.
- Hybrid WS + DataChannel: Overkill for a 2-player game.

---

## 2. Signaling Protocol: WebRTC Perfect Negotiation

**Decision:** Implement the **Perfect Negotiation** pattern from MDN over a minimal WebSocket room server. Assign polite/impolite roles (second joiner is polite) to handle glare without special-casing.

**Minimal signaling flow:**
```
Host → WS server:  { type: "join", room: "ABC123" }  → server: { type: "joined", polite: false }
Guest → WS server: { type: "join", room: "ABC123" }  → server: { type: "joined", polite: true }
                                                       → host: { type: "peer_joined" }
Host → server → Guest: { type: "offer", sdp: ... }
Guest → server → Host: { type: "answer", sdp: ... }
Both sides (trickle): { type: "ice", candidate: ... }  (relayed by server)
```

**Critical edge cases to handle:**
- **ICE candidate queuing**: Candidates can arrive before `setRemoteDescription()` completes. Queue them and flush immediately after remote description is set.
- **Glare (simultaneous offer)**: Polite peer detects it has a local offer while receiving a remote offer → rolls back with `setLocalDescription({ type: 'rollback' })` and accepts the incoming offer. Impolite peer ignores the incoming offer in this state. Use a `makingOffer` boolean flag to track this safely across the async `createOffer()`.
- **Host disconnects before answer**: Listen to `pc.connectionState === 'failed'` on client side with a 15 s timeout. Server broadcasts `{ type: "peer_left" }` on WebSocket close to the remaining peer immediately.
- **Silent disconnects (tab crash)**: TCP timeout takes ~90 s without keep-alive. Server must implement WebSocket ping/pong (ping every 30 s, terminate if no pong within 10 s) to detect dead connections quickly.

**Alternatives considered:**
- SDP-before-ICE (non-trickle): Simpler but adds 1–5 s delay waiting for ICE gathering to complete. Not recommended.
- Firebase / Supabase Realtime as signaling channel: Removes custom server but adds third-party dependency for a ~100-line script.

---

## 3. Game State Sync: Host-Authoritative Snapshots

**Decision:** Host-authoritative snapshot model. The host runs the canonical simulation and sends compressed state snapshots at ~10 Hz. The guest renders from snapshots (with interpolation) and sends only inputs.

**Rationale:** Lockstep determinism is the natural model for this type of game, but is impractical with Phaser 3:
- Phaser 3 calls `Math.random()` internally in places outside developer control.
- Floating-point transcendental functions (`Math.sin`, `Math.cos`) can diverge by 1 ULP across browser engines and CPU architectures. This compounds across hundreds of particle updates at 60 fps, causing full desync within seconds.
- Rollback netcode would require snapshotting and restoring hundreds of particle positions every frame.

Host-authoritative model avoids all of these problems: the guest is a pure renderer that trusts the host's state. Divergence is structurally impossible.

**State snapshot format (binary, not JSON):**
- Per particle: `id` (uint16), `x`, `y`, `vx`, `vy`, `hp` (float32 each) = 22 bytes/particle
- For 200 particles: ~4.4 KB/snapshot × 10 Hz = ~44 KB/s — well within DataChannel capacity
- Send only particles changed since last snapshot (delta) to reduce bandwidth further
- Periodic full snapshots every ~5 s to resync any missed deltas

**Input messages from guest to host (JSON, low frequency):**
- `{ type: "upgrade", upgradeType: "attack" }`
- `{ type: "nuke" }`
- `{ type: "tower_action", action: "build" | "place" | "upgrade", towerType?: "laser" | "slow" }`

**Alternatives considered:**
- Input relay / lockstep: Requires full determinism. Blocked by Phaser 3's internal use of `Math.random()`. Revisit if simulation is ever moved entirely to a headless worker (the codebase already has `HeadlessRunner` infrastructure for this).
- netplayjs: Purpose-built rollback netcode library for browser games. High quality but high implementation cost. Worth evaluating if the game adds replays or spectating.
- Full JSON state: Simpler to implement but ~3–5× larger payloads than binary encoding.

---

## 4. Non-Determinism in TypeScript/JS (informational)

**Decision:** Not a blocking issue for the chosen host-authoritative approach. Documented for future reference if lockstep is attempted.

**Sources of non-determinism:**

| Source | Problem | Fix if lockstep needed |
|--------|---------|----------------------|
| `Math.random()` | No seed, implementation-defined | Replace with seeded PRNG (mulberry32) everywhere |
| `Math.sin/cos/atan2` | 1-ULP differences across engines | Wrap all results with `Math.fround()` |
| `Array.prototype.sort()` | Comparator stability varies | Always provide a deterministic comparator |
| `Date.now()` / `performance.now()` | Wall-clock, different per machine | Never use in simulation; use game tick counter |
| Phaser 3 internals | Calls `Math.random()` outside our control | Cannot fix without forking Phaser or monkeypatching |

The Phaser 3 wall is the decisive factor: lockstep is impractical without either forking Phaser or running the simulation entirely in a headless worker without Phaser.

---

## 5. Signaling Server Technology

**Decision:** Node.js with the `ws` npm package. In-memory room registry using `Map<roomId, Set<WebSocket>>`. No database, no external dependencies beyond `ws`.

**Key implementation details:**
- Room ID generation: client generates a random 6-character alphanumeric code and sends it in the `join` message. If the room doesn't exist, create it. If it has 1 peer, join. If it has 2 peers, reject with `{ type: "room_full" }`.
- Reverse index `Map<WebSocket, roomId>` for O(1) cleanup on disconnect.
- Ping/pong heartbeat: `ws.ping()` every 30 s; call `ws.terminate()` if pong not received within 10 s.
- Stale room sweep: `setInterval` every 60 s to delete rooms where all sockets are no longer `OPEN`.
- **Always attach `ws.on('error', () => {})` handlers** — unhandled WebSocket errors crash the Node.js process.

**Alternatives considered:**
- Socket.io: Includes room management, reconnection, fallback transports. Heavier but significantly reduces boilerplate. Acceptable alternative.
- Native Node.js WebSocket (Node 22+): No external dependency but less ergonomic API.

---

## 6. STUN/TURN Infrastructure

**Decision:** Use Google's free public STUN servers for MVP. Plan for a free-tier TURN server (Metered.ca) or self-hosted coturn before exposing to random internet users.

**Free STUN servers for development:**
```
stun:stun.l.google.com:19302
stun:stun1.l.google.com:19302
```

**When TURN is required (~15–20% of users):**
- Symmetric NAT: Each new destination gets a different external port; STUN trick fails.
- CGNAT (mobile/cable ISPs): ISPs share one public IP across many customers.
- Corporate firewalls: Block UDP entirely; need `turns:host:443` (TURN over TLS).

**Free TURN options:**
- Metered.ca: Free tier STUN+TURN. Fetch rotating credentials from their REST API at session start.
- Self-hosted coturn on a $5/mo VPS: Recommended long-term. Handles ~10 concurrent users easily on 1 vCPU/1 GB.

**Fallback strategy:** If ICE connection state reaches `failed`, fall back to relaying game state through the WebSocket signaling server. This degrades P2P to a relay but keeps the game playable.

---

## 7. WebRTC Library Choice

**Decision:** Use the **native `RTCPeerConnection` browser API** directly. Wrap it in a thin `PeerConnection` class (~150 lines of TypeScript).

**Rationale:**
- `simple-peer`: Effectively unmaintained (last npm publish ~2022, 97 open issues, no merges).
- `@thaunknown/simple-peer`: Actively maintained fork; viable drop-in replacement if preferred.
- `PeerJS`: Actively maintained, popular, but defaults to reliable/ordered DataChannels which is not ideal for high-frequency position snapshots. Also couples to a specific signaling server API.
- **Native API**: Browser-standard, well-documented (MDN), zero additional dependencies. DataChannel options are fully configurable. The Perfect Negotiation pattern fits naturally in ~100 lines of TypeScript.

**DataChannel configuration for game state:**
```typescript
// Unreliable for high-frequency position snapshots (don't care about stale data)
const unreliableChannel = pc.createDataChannel('game-state', {
  ordered: false,
  maxRetransmits: 0,
});
// Reliable for inputs (upgrade purchases, nuke trigger — must not be lost)
const reliableChannel = pc.createDataChannel('game-input', {
  ordered: true,
});
```

**Alternatives considered:**
- PeerJS: Good for rapid prototyping; has a hosted signaling server (`0.peerjs.com`) useful during development. Can switch to native later.
- netplayjs: Full rollback netcode library. Evaluate if replays/spectating are added.
