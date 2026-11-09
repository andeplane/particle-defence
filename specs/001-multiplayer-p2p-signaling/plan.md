# Implementation Plan: Multiplayer P2P Signaling

**Branch**: `001-multiplayer-p2p-signaling` | **Date**: 2026-06-03 | **Spec**: [spec.md](./spec.md)  
**Input**: Feature specification from `specs/001-multiplayer-p2p-signaling/spec.md`

## Summary

Add online multiplayer to the particle defence game using a host-authoritative WebRTC P2P model. A lightweight Node.js WebSocket signaling server (the "backend") handles room creation and WebRTC negotiation relay only — no game state is ever stored on the server. Once both players complete the WebRTC handshake, all game data flows directly peer-to-peer. The host runs the authoritative `GameEngine` simulation; the guest renders received state snapshots and sends its inputs to the host.

## Technical Context

**Language/Version**: TypeScript 5.x (game: browser); Node.js 22+ (signaling server)  
**Primary Dependencies**:
- Game client: Phaser 3, Vite, native `RTCPeerConnection` browser API (no additional library needed)
- Signaling server: `ws` npm package (WebSocket server), no database
**Storage**: In-memory only on signaling server (`Map<roomId, Set<WebSocket>>`). No persistence.  
**Testing**: Vitest (existing framework for game client unit tests)  
**Target Platform**: Desktop browsers (Chrome, Firefox, Safari) for client; Node.js 22+ server  
**Project Type**: Two sub-projects — browser game (existing Vite app) + new standalone signaling server  
**Performance Goals**: 20 Hz state snapshots (~88 KB/s host upstream at 200 particles), <100 ms P2P latency on same continent  
**Constraints**: No game state on server; signaling server handles ≥50 concurrent rooms; P2P established within 30 s under normal network conditions  
**Scale/Scope**: 2 players per room, no auth, no persistence, hobby-scale traffic

## Constitution Check

The project constitution is a template (not filled in for this project), so there are no project-specific gates to check. Standard quality gates applied:

- [x] No game state on signaling server (matches spec FR-004)
- [x] Existing single-player and 2-player modes unaffected (new code paths only)
- [x] Tests required for new logic (signaling server room management, game sync encoding/decoding)
- [x] No new build complexity: signaling server is a separate package, not bundled with the game

## Project Structure

### Documentation (this feature)

```text
specs/001-multiplayer-p2p-signaling/
├── spec.md              ← Feature specification
├── plan.md              ← This file
├── research.md          ← Phase 0: technology decisions
├── data-model.md        ← Phase 1: entities and message formats
├── quickstart.md        ← Phase 1: dev setup guide
├── contracts/
│   ├── signaling-protocol.md    ← WebSocket signaling API
│   └── game-sync-protocol.md    ← P2P DataChannel game state protocol
└── tasks.md             ← Phase 2 output (/speckit-tasks command)
```

### Source Code (repository root)

```text
server/                        ← NEW: standalone signaling server
├── src/
│   ├── index.ts               ← WebSocket server entry point, main loop
│   ├── RoomRegistry.ts        ← In-memory room management (create, join, relay, cleanup)
│   └── types.ts               ← Shared message type definitions (SignalingMessage union)
├── package.json               ← separate package: ws, typescript, @types/ws, @types/node
└── tsconfig.json

src/                           ← EXISTING game client (modified)
├── multiplayer/               ← NEW: multiplayer subsystem
│   ├── SignalingClient.ts     ← WebSocket connection to signaling server
│   ├── PeerConnection.ts      ← RTCPeerConnection wrapper (Perfect Negotiation)
│   ├── GameStateEncoder.ts    ← Binary encode/decode for GameStateSnapshot
│   ├── MultiplayerHost.ts     ← Host: drives GameEngine tick, encodes + sends snapshots
│   ├── MultiplayerGuest.ts    ← Guest: receives snapshots, renders, sends inputs
│   └── types.ts               ← PlayerInputMessage, GameStateSnapshot TS types
├── scenes/
│   ├── MenuScene.ts           ← MODIFIED: add "Multiplayer" button
│   ├── MultiplayerLobbyScene.ts ← NEW: room create/join UI, connection status
│   └── GameScene.ts           ← MODIFIED: multiplayer mode support
└── (all other existing files unchanged)
```

**Structure Decision**: Two-package approach — the signaling server is a separate `server/` directory with its own `package.json` so it can be deployed independently (e.g., on a Node.js host or Docker container) without being bundled with the Phaser game. The game client's multiplayer subsystem lives under `src/multiplayer/` to keep it isolated from existing game logic.

## Complexity Tracking

No constitution violations. The two-package structure (server + client) is warranted because the signaling server must run as a standalone Node.js process, not in the browser, and it needs its own deployment lifecycle separate from the static game assets.
