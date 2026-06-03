# Tasks: Multiplayer P2P Signaling

**Input**: Design documents from `specs/001-multiplayer-p2p-signaling/`  
**Prerequisites**: plan.md ✓, spec.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓

**Tests**: Unit tests are included for new logic (signaling server room management, binary encoding, PeerConnection negotiation). No tests for UI scenes or game rendering.

**Organization**: Tasks are grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (US1, US2, US3)

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Initialize the two-package project structure (server + game client additions).

- [X] T001 Create `server/` directory with `server/package.json` (dependencies: `ws`, `typescript`, `@types/ws`, `@types/node`, `tsx` for dev; scripts: `dev`, `build`, `start`, `test`)
- [X] T002 Create `server/tsconfig.json` (target: ES2022, module: Node16, outDir: dist, rootDir: src, strict: true)
- [X] T003 [P] Create `src/multiplayer/` directory with placeholder `src/multiplayer/index.ts` barrel export
- [X] T004 [P] Add `VITE_SIGNALING_URL` env var support to `vite.config.ts` (default: `ws://localhost:8080`); expose it as `import.meta.env.VITE_SIGNALING_URL` in the client bundle

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Shared types and the core signaling server logic that US1 and US2 both depend on.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [X] T005 Create `server/src/types.ts` with the complete `SignalingMessage` discriminated union from `contracts/signaling-protocol.md` — client→server: `create_room`, `join`, `offer`, `answer`, `ice`; server→client: `room_created` (includes `room` code), `joined` (always `polite: true`), `peer_joined`, `room_full`, `room_not_found`, `peer_left`, `error`
- [X] T006 [P] Create `src/multiplayer/types.ts` with TypeScript types from `data-model.md`: `MultiplayerSession`, `PlayerInputMessage` (full discriminated union: upgrade, nuke, tower_research, tower_build, tower_place, tower_upgrade), `GameStateSnapshot` header fields, `MultiplayerRole` (`'host' | 'guest'`), and `GridSeedMessage` (`{ type: 'grid_seed'; seed: number }`) used by the host to share the grid seed with the guest before game start
- [X] T007 Create `server/src/RoomRegistry.ts` with in-memory room management using two distinct entry points to prevent code collisions: `createRoom(ws): string` — generates a cryptographically random unique 6-char alphanumeric code (retry on the rare collision), registers the room with the host's socket, returns the code; `joinRoom(code, ws): 'joined' | 'room_not_found' | 'room_full'` — looks up the room by code, returns `room_not_found` if absent/expired, `room_full` if already has 2 peers, or `joined` (and notifies host with `peer_joined`) if accepted; `relay(sender, message)` forwards to the other peer; `leaveRoom(ws)` removes peer and notifies the other with `peer_left`; `startStaleRoomSweep(intervalMs)` deletes rooms whose only peer has been idle beyond timeout (uses `room.createdAt`); `startHeartbeat(intervalMs, timeoutMs)` pings all sockets and terminates non-responsive ones
- [X] T008 Write `server/src/RoomRegistry.spec.ts` unit tests (using Node.js built-in test runner or vitest): `createRoom` returns a unique code and registers the host; two consecutive `createRoom` calls always return different codes; `joinRoom` with a valid code returns `'joined'` and notifies host with `peer_joined`; `joinRoom` with unknown code returns `'room_not_found'`; `joinRoom` when room already has 2 peers returns `'room_full'`; `relay` forwards to the correct peer only; `leaveRoom` notifies remaining peer with `peer_left`; stale room sweep removes expired single-peer rooms; heartbeat terminates non-responsive sockets
- [X] T008b [P] Implement per-IP rate limiting in `server/src/index.ts` (FR-011): maintain an in-memory `Map<string, { count: number; resetAt: number }>` keyed by remote IP (from `req.socket.remoteAddress`); on each `create_room` message, check the entry — if `count >= 2` within the current 60-second window, send `{ type: 'error', message: 'Rate limit exceeded — try again in a moment' }` and close the connection; otherwise increment and allow. Write two additional tests in `RoomRegistry.spec.ts` (or a new `rateLimit.spec.ts`): a third `create_room` within 60 s from the same IP is rejected; a request after the window resets is accepted.

**Checkpoint**: Foundation ready — signaling server core and rate limiting are tested. User story phases can now proceed.

---

## Phase 3: User Story 1 — Host Creates a Room (Priority: P1) 🎯 MVP

**Goal**: A player can create a multiplayer room and receive a shareable 6-character room code. The signaling server registers the room and waits for a second peer.

**Independent Test**: Run `server/` locally (`npm run dev`). Open the game in a browser tab, click **Multiplayer → Create Room**, verify a room code appears, and confirm the code is registered on the server (check server logs). No second player needed for this story.

### Implementation for User Story 1

- [X] T009 [US1] Create `server/src/index.ts`: start `WebSocketServer` on `PORT` env var (default 8080); on `connection`, parse incoming JSON messages; dispatch `create_room` to `RoomRegistry.createRoom` and send back `{ type: 'room_created', room: code }`; dispatch `join` to `RoomRegistry.joinRoom` and send back `{ type: 'joined', polite: true }`, `{ type: 'room_full' }`, or `{ type: 'room_not_found' }` accordingly; relay `offer`, `answer`, `ice` messages verbatim via `RoomRegistry.relay`; on `close`/`error`, call `RoomRegistry.leaveRoom`; start heartbeat and stale-room sweep on server init
- [X] T010 [US1] Create `src/multiplayer/SignalingClient.ts`: wraps a browser `WebSocket`; `connect(url)` → opens WS; `createRoom()` → sends `{ type: 'create_room' }` (host only; server generates the code and replies with `room_created`); `joinRoom(code)` → sends `{ type: 'join', room: code }` (guest only); `on(type, handler)` → typed event listener for all `SignalingMessage` types; `send(msg)` → JSON-serializes and sends; `disconnect()` → closes WS; emits `room_created`, `joined`, `peer_joined`, `room_not_found`, `room_full`, `peer_left`, `offer`, `answer`, `ice` events to registered handlers
- [X] T011 [US1] Create `src/scenes/MultiplayerLobbyScene.ts`: Phaser scene with two panels — "Create Room" (calls `SignalingClient.createRoom()`, then waits for `room_created` from the server; displays the server-generated 6-char code and a "Waiting for opponent…" spinner — no client-side code generation) and "Join Room" (text input for room code + Join button, stubbed for US2); shows error if signaling server is unreachable
- [X] T012 [US1] Modify `src/scenes/MenuScene.ts`: add a "Multiplayer" button (alongside "1 Player vs AI" and "2 Player"); clicking it navigates to `MultiplayerLobbyScene`

**Checkpoint**: A player can open the game, click Multiplayer → Create Room, see a room code, and the server registers the room. Independently testable without a second player.

---

## Phase 4: User Story 2 — Guest Joins a Room (Priority: P1)

**Goal**: A second player enters the room code, both peers complete the WebRTC handshake, and the game starts in multiplayer mode with host-authoritative state sync.

**Independent Test**: Open two browser tabs. Tab 1 creates a room. Tab 2 enters the code and joins. Verify both tabs show "Connected — game starting!" and the game screen appears on both sides with particles moving in sync.

### Implementation for User Story 2

- [X] T013 [US2] Extend `src/scenes/MultiplayerLobbyScene.ts` (Join Room panel): wire up the text input and Join button to call `SignalingClient.connect` + `SignalingClient.joinRoom(code)`; on `joined` (guest accepted) show "Waiting for game to start…"; on `room_not_found` display inline error "Room not found or has expired" in the Join panel within 3 s and re-enable the Join button (satisfies FR-010 / SC-004); on `room_full` display "Room is full — try a different code"; advance to WebRTC negotiation once `peer_joined` is received (host side, via `room_created` flow) or immediately after `joined` (guest side)
- [X] T014 [US2] Create `src/multiplayer/PeerConnection.ts`: wraps `RTCPeerConnection` using the Perfect Negotiation pattern from `research.md`; constructor takes `{ isPolite: boolean, iceServers, onMessage, onInputMessage, onConnected, onDisconnected }`; creates two DataChannels: `game-state` (unreliable: `{ ordered: false, maxRetransmits: 0 }`) and `game-input` (reliable: `{ ordered: true }`); implements `makingOffer` flag and ICE candidate queuing; exposes `handleSignal(msg)` for offer/answer/ice messages from `SignalingClient`; exposes `sendGameState(buffer: ArrayBuffer)` and `sendInput(msg: PlayerInputMessage)`; fires `onConnected` when both DataChannels are open and ICE is connected
- [X] T015 [P] [US2] Create `src/multiplayer/GameStateEncoder.ts`: `encode(snapshot: GameStateSnapshot, particles: AbstractParticle[]): ArrayBuffer` writes the binary format from `contracts/game-sync-protocol.md` (39-byte header + 22 bytes/particle); `decode(buffer: ArrayBuffer): { header: GameStateSnapshotHeader, particles: EncodedParticle[] }` reads it back; supports delta mode (only changed particles) and full-sync mode (all particles); export `UPGRADE_TYPE_ORDER` constant array matching the 8-element encoding from the contract
- [X] T016 [P] [US2] Write `src/multiplayer/GameStateEncoder.spec.ts` unit tests: encode/decode round-trip for full sync with N particles, delta mode with subset, edge case of 0 particles, upgrade levels array order matches `UPGRADE_TYPE_ORDER`, header fields (tick, flags, player stats) survive round-trip correctly
- [X] T017 [US2] Create `src/multiplayer/MultiplayerHost.ts`: takes `GameEngine`, `PeerConnection`, and `MatchStatsRecorder`; after each `GameEngine.tick()`, calls `GameStateEncoder.encode` (delta or full-sync based on tick counter) and sends via `PeerConnection.sendGameState`; listens for guest inputs via `PeerConnection.onInputMessage` and applies them to the host's `GameEngine` (upgrade, nuke, tower actions) with gold/cooldown validation; sends a full-sync snapshot on first connect and every 50 ticks thereafter
- [X] T018 [US2] Create `src/multiplayer/MultiplayerGuest.ts`: takes `PeerConnection` and the Phaser `GameScene` reference; receives `ArrayBuffer` snapshots via `PeerConnection.onMessage`, decodes with `GameStateEncoder.decode`, and applies to the scene: creates/moves/removes Phaser particle sprites by ID, updates player HP bars, gold displays, upgrade level indicators; buffers the last 2 received snapshots and interpolates particle positions for smooth rendering at `now - 100ms`; sends `PlayerInputMessage` over `PeerConnection.sendInput` whenever the guest player acts (upgrade buttons, nuke, tower actions)
- [X] T018b [P] [US2] Create `src/multiplayer/__tests__/mockPeerPair.ts` test helper and write `src/multiplayer/multiplayer.integration.spec.ts`: the helper exports `createMockPeerPair(): [MockPeerConnection, MockPeerConnection]` — two linked objects that implement the same interface as `PeerConnection` (`sendGameState`, `sendInput`, `onMessage`, `onInputMessage`, `onConnected`, `onDisconnected`, `disconnect`) but route messages synchronously in-memory (no WebRTC, no network); calling `sendGameState(buf)` on side A immediately invokes `onMessage(buf)` on side B, and vice versa for `sendInput`. Integration tests (no Phaser — use a `MockGameScene` stub with jest/vi spies for sprite creation): (1) **full-sync round-trip** — run `GameEngine.tick()` N times on host side, assert guest received snapshots with correct `p0Hp`, `p1Gold`, particle count; (2) **guest input applied on host** — guest sends `{ type: 'upgrade', upgradeType: 'attack' }` via `sendInput`, host `MultiplayerHost` receives it and calls `GameEngine` upgrade, assert host player's attack level incremented; (3) **delta vs full-sync cadence** — after 50 ticks, assert host sent at least one `isFullSync=1` snapshot and the intermediate ticks sent `isFullSync=0`; (4) **disconnect propagates** — call `hostConn.disconnect()`, assert `guestConn.onDisconnected` was called
- [X] T019 [US2] Modify `src/scenes/GameScene.ts` to support `mode: 'multiplayer-host' | 'multiplayer-guest'`: in `init()` accept role + `PeerConnection` from `MultiplayerLobbyScene`; when host, create `MultiplayerHost` and pass the `GameEngine` to it; when guest, skip `GameEngine` physics ticks and create `MultiplayerGuest` to drive rendering from received snapshots; add a `gridSeed` handshake — host sends seed to guest over the reliable DataChannel before game start so both generate the same grid layout; guest waits for seed before creating the `GameScene`
- [X] T020 [US2] Wire `MultiplayerLobbyScene` → `PeerConnection` → `GameScene`: once `PeerConnection.onConnected` fires, `MultiplayerLobbyScene` navigates to `GameScene` passing `{ mode: 'multiplayer-host' | 'multiplayer-guest', peerConnection }` via Phaser scene data; both tabs should now enter `GameScene` at the same time

**Checkpoint**: Two tabs connect, negotiate WebRTC, generate the same grid, and the game runs with host-authoritative state. Guest particles move in sync with the host. Guest upgrade buttons send inputs to host. Both base HP bars update correctly.

---

## Phase 5: User Story 3 — Graceful Disconnect (Priority: P2)

**Goal**: When a player disconnects mid-game, the surviving player sees a clear message and is returned to the main menu within 5 seconds. No hanging connections remain on the signaling server.

**Independent Test**: Start a multiplayer game in two tabs. Close one tab mid-game. The surviving tab should display "Opponent disconnected" and return to the main menu within 5 seconds. Check server logs confirm the room is cleaned up immediately.

### Implementation for User Story 3

- [X] T021 [US3] Verify `server/src/index.ts` heartbeat (already started in T009): confirm that when one WebSocket is terminated by heartbeat, `RoomRegistry.leaveRoom` fires and sends `peer_left` to the surviving peer — add an integration-style manual test to `quickstart.md` explaining how to verify this with two `websocat` terminals
- [X] T022 [US3] Handle `peer_left` in `src/multiplayer/SignalingClient.ts`: add a `onPeerLeft` callback; fire it when the server sends `{ type: "peer_left" }`
- [X] T023 [US3] Handle `peer_left` and `RTCPeerConnection` `connectionstatechange` (`failed`/`disconnected`) in `src/multiplayer/PeerConnection.ts`: fire `onDisconnected` callback when either event occurs; set a 15 s timeout on `connectionState === 'disconnected'` before treating it as a hard failure (some transient disconnects recover)
- [X] T024 [US3] Handle disconnect in `src/scenes/GameScene.ts`: listen for `onDisconnected` from `PeerConnection`; stop the game loop; show a modal overlay "Opponent disconnected" with a 3 s countdown; then navigate back to `MenuScene`
- [X] T025 [US3] Handle disconnect in `src/scenes/MultiplayerLobbyScene.ts` (pre-game): if `peer_left` fires while still in the lobby waiting for a peer, show "Room closed — opponent left" and reset to the lobby start state

**Checkpoint**: Disconnects are handled gracefully at all stages (lobby and in-game). No dangling rooms on the server.

---

## Final Phase: Polish & Cross-Cutting Concerns

**Purpose**: Improvements that affect multiple user stories or the overall experience.

- [X] T026 [P] Update `src/scenes/howToPlayData.ts` and `src/scenes/HowToPlayScene.ts`: add a "Multiplayer" section to the Overview tab describing how to create/join rooms; no config values to pull from CONFIG (multiplayer is a new mode, not a balance parameter)
- [X] T027 [P] Add optional TURN server support to `src/multiplayer/PeerConnection.ts`: read `import.meta.env.VITE_TURN_URL`, `VITE_TURN_USERNAME`, `VITE_TURN_CREDENTIAL` from env; append a TURN `RTCIceServer` entry when set; document in `quickstart.md` section on deployment
- [X] T028 [P] Add ICE connection failure fallback UX in `src/scenes/MultiplayerLobbyScene.ts`: if `PeerConnection` emits `onDisconnected` during the signaling/ICE phase (before `onConnected`), show "Could not establish direct connection — try again or check your network" with a Retry button
- [X] T029 [P] Run `npm run test:run` (game client) and `cd server && npm test` (server) end-to-end; fix any regressions in existing tests caused by `MenuScene.ts` or `GameScene.ts` changes
- [X] T030 Run the full `quickstart.md` validation: two local browser tabs, create/join room, verify game starts, verify disconnect handling, verify server cleans up — document results and update quickstart if anything is inaccurate
- [X] T031 [P] Verify SC-003 (≥50 concurrent rooms): write `server/load-test.sh` using `websocat` or a small Node.js script that opens 50 concurrent WebSocket connections and sends `create_room` on each; measure that all 50 rooms are registered and none time out prematurely; document observed throughput and any bottlenecks in a `server/LOAD-TEST-RESULTS.md` note; update `quickstart.md` with instructions for running the test

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: No dependencies — can start immediately; T001–T004 are all parallelizable
- **Foundational (Phase 2)**: Depends on Phase 1 complete — T005→T006→T007→T008 (T006 parallel with T005)
- **US1 (Phase 3)**: Depends on Phase 2 — T009→T010→T011→T012 (sequential within story)
- **US2 (Phase 4)**: Depends on Phase 2 (and US1 for MenuScene entry point) — T013→T014, then T015/T016 parallel, then T017→T018→T019→T020
- **US3 (Phase 5)**: Depends on US1 + US2 complete
- **Polish (Final)**: Depends on all desired user stories

### User Story Dependencies

- **US1 (P1)**: Requires Phase 2 complete; no dependency on US2/US3
- **US2 (P1)**: Requires Phase 2 complete; T013 extends US1 scene; T020 depends on T014–T019
- **US3 (P2)**: Requires both US1 and US2 complete (needs in-game disconnect path)

### Within Phase 4 (US2 detail)

```
T013 (extend lobby scene)
T014 (PeerConnection) ──────────────────────────────────┐
T015 (GameStateEncoder) ←── parallel with T014           │
T016 (GameStateEncoder tests) ←── parallel with T015      │
T017 (MultiplayerHost) ←── depends on T014, T015         │
T018 (MultiplayerGuest) ←── depends on T014, T015        │
T018b (integration tests) ←── parallel with T019, depends on T017, T018 │
T019 (GameScene multiplayer mode) ←── depends on T017, T018 │
T020 (wire lobby→game) ←── depends on T013, T014, T019 ──┘
```

### Parallel Opportunities

- T003, T004 (Phase 1) can run in parallel with T001, T002
- T006 (client types) can start in parallel with T005 (server types) — different files
- T015, T016 (encoder + tests) can run in parallel with T014 (PeerConnection) — different files
- T017, T018 (Host, Guest) can be started in parallel after T014 + T015 are done
- T018b (integration tests) can run in parallel with T019 once T017 + T018 are done — different files, no Phaser dependency
- T026, T027, T028, T029 (Polish) are all parallelizable

---

## Parallel Example: Phase 4 (US2)

```bash
# After T013 completes, launch in parallel:
Task: "T014 — Create PeerConnection.ts with Perfect Negotiation"
Task: "T015 — Create GameStateEncoder.ts (binary encode/decode)"
Task: "T016 — Write GameStateEncoder.spec.ts tests"

# After T014 + T015 complete, launch in parallel:
Task: "T017 — Create MultiplayerHost.ts"
Task: "T018 — Create MultiplayerGuest.ts"
```

---

## Implementation Strategy

### MVP First (US1 only — signaling server working)

1. Complete Phase 1: Setup (T001–T004)
2. Complete Phase 2: Foundational (T005–T008)
3. Complete Phase 3: US1 (T009–T012)
4. **STOP and VALIDATE**: Server runs, game shows Multiplayer menu, room code appears, server log shows room registered
5. Commit and demo

### Full Multiplayer (MVP + US2)

1. MVP above ✓
2. Add Phase 4: US2 (T013–T020)
3. **VALIDATE**: Two tabs connect, game syncs, guest inputs work
4. Commit and demo

### Production-Ready (all phases)

1. Full Multiplayer above ✓
2. Add Phase 5: US3 (T021–T025) — graceful disconnect
3. Add Polish (T026–T030) — TURN support, How to Play, regression tests
4. Deploy signaling server, configure TURN

---

## Notes

- [P] tasks = different files, no shared state dependencies, safe to run in parallel
- [Story] labels map each task to a specific user story for traceability
- US1 and US2 are both P1 but US1 is a strict prerequisite for US2 (the MenuScene entry point and SignalingClient are shared)
- The guest never runs `GameEngine` physics — it is a pure renderer driven by host snapshots
- Grid seed handshake (T019) is critical for visual consistency: both players must see the same maze layout
- Existing single-player and local 2-player modes must remain unaffected — all new code is gated behind the `'multiplayer-host'` / `'multiplayer-guest'` mode parameter
