# Contract: Game State Sync Protocol (P2P DataChannel)

**Version**: 1.0  
**Transport**: WebRTC DataChannel  
**Architecture**: Host-authoritative snapshot

---

## Overview

Once the WebRTC P2P connection is established, two DataChannels are used:

| Channel name | Mode | Direction | Content |
|-------------|------|-----------|---------|
| `game-state` | Unreliable, unordered | Host → Guest | Binary state snapshots at ~10 Hz |
| `game-input` | Reliable, ordered | Guest → Host | JSON player input events |

The host runs the authoritative game simulation (identical to the existing single-player `GameEngine`). The guest renders state received from the host and sends its player's inputs to the host for execution.

---

## Channel: `game-state` (Host → Guest)

**DataChannel options**: `{ ordered: false, maxRetransmits: 0 }`

Unreliable delivery is intentional: a dropped snapshot is superseded by the next one. Head-of-line blocking would harm real-time rendering.

### Message Format (Binary, ArrayBuffer)

Messages are packed as an `ArrayBuffer`. The host writes with `DataView`; the guest reads with `DataView`.

```
Offset  Size  Type      Field
──────  ────  ────────  ──────────────────────────────────────────
0       4     uint32    tick          – Monotonic simulation tick
4       1     uint8     flags         – Bit 0: isFullSync (1=full, 0=delta)
5       2     uint16    particleCount – Number of ParticleRecord entries
7       4     float32   p0Hp
11      4     float32   p1Hp
15      4     float32   p0Gold
19      4     float32   p1Gold
23      8     uint8[8]  p0Upgrades    – Levels for 8 upgrade types in order
31      8     uint8[8]  p1Upgrades
39      N×22  record[]  particles     – ParticleRecord array (see below)
```

**Header total**: 39 bytes.

### ParticleRecord (22 bytes each)

```
Offset  Size  Type      Field
──────  ────  ────────  ──────────────────────────────────────────
0       2     uint16    id            – Unique particle ID
2       4     float32   x             – World X position
6       4     float32   y             – World Y position
10      4     float32   vx            – X velocity
14      4     float32   vy            – Y velocity
18      4     float32   hp            – Current HP
```

**Total message size**: 39 + (particleCount × 22) bytes.  
Example: 200 particles → 39 + 4400 = 4439 bytes ≈ 4.3 KB.

### Delta vs. Full Sync

- **Delta** (`isFullSync = 0`): Only particles whose position or HP changed by more than a threshold since the last snapshot are included. The guest merges this into its local state by `id`.
- **Full sync** (`isFullSync = 1`): All particles are included. Particles not present in a full sync are presumed dead and removed from the guest's local state.
- **Full sync frequency**: Sent every 5 seconds (50 ticks at 10 Hz) and on first connect.

### Guest Rendering

The guest buffers the last two received snapshots and renders at `now - 100ms` using linear interpolation between them. This provides smooth rendering even with 10 Hz updates. The guest ignores out-of-order snapshots (detected by `tick` field).

---

## Channel: `game-input` (Guest → Host)

**DataChannel options**: `{ ordered: true }` (default — reliable delivery required)

The guest sends JSON-encoded input events whenever the guest player takes an action. The host applies these to the authoritative simulation at the next tick.

### Message Format (JSON)

All messages have a `type` discriminator:

#### Upgrade

```json
{ "type": "upgrade", "upgradeType": "attack" }
```

`upgradeType` is one of: `"health"`, `"attack"`, `"radius"`, `"spawnRate"`, `"speed"`, `"defense"`, `"maxParticles"`, `"interestRate"`.

Host validates that the guest has sufficient gold before applying.

#### Nuke

```json
{ "type": "nuke" }
```

Host validates cooldown and availability before applying.

#### Tower — Research

```json
{ "type": "tower_research", "towerType": "laser" }
```

`towerType`: `"laser"` | `"slow"`.

#### Tower — Build (spawn carrier)

```json
{ "type": "tower_build", "towerType": "laser" }
```

Host validates that the tower type has been researched and the player is below the tower cap.

#### Tower — Place (convert carrier to tower)

```json
{ "type": "tower_place" }
```

Host converts the active carrier to a stationary tower at its current position.

#### Tower — Upgrade

```json
{ "type": "tower_upgrade", "towerIndex": 0 }
```

`towerIndex`: 0-based index into the guest player's tower array on the host.

---

## ICE Configuration

Both peers must be initialized with identical ICE server configuration:

```typescript
const iceServers = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
  // Optional TURN server for NAT traversal:
  // { urls: 'turn:your-turn-server.example.com:3478', username: '...', credential: '...' }
];
```

If the P2P connection reaches `connectionState === 'failed'`, the client should:
1. Show a "Connection failed" error to the user.
2. Optionally retry once with a fresh `RTCPeerConnection`.
3. Fall back to WebSocket relay if available (future enhancement).

---

## Upgrade Type Encoding (uint8 index in snapshots)

The 8-byte upgrade level arrays in `GameStateSnapshot` use this fixed order:

| Index | Upgrade type |
|-------|-------------|
| 0 | `health` |
| 1 | `attack` |
| 2 | `radius` |
| 3 | `spawnRate` |
| 4 | `speed` |
| 5 | `defense` |
| 6 | `maxParticles` |
| 7 | `interestRate` |

This order must match the order in `CONFIG` and must not change without a protocol version bump.
