# Feature Specification: Multiplayer P2P Signaling

**Feature Branch**: `001-multiplayer-p2p-signaling`  
**Created**: 2026-06-03  
**Status**: Draft  
**Input**: User description: "We want to create a new backend that allow for people to play multiplayer. I THINK we want web sockets, p2p streaming not state on backend, backend just to discover each other. One creates a room, or joins a room."

## Clarifications

### Session 2026-06-03

- Q: What platform will the signaling server be deployed on? → A: fly.io
- Q: What language/framework should be used for the signaling server? → A: Node.js + `ws` library
- Q: What STUN/TURN strategy should be used for WebRTC NAT traversal? → A: Google public STUN only (`stun.l.google.com:19302`); no TURN relay; fail gracefully on hard NAT
- Q: Should room creation be rate limited to prevent abuse? → A: Yes — per-IP limit of 2 room creations per minute
- Q: How should room code collisions be handled? → A: Retry with a newly generated random code until unique
- Q: At what rate should the host send game state snapshots to the guest over the P2P DataChannel? → A: 20 Hz (every 50 ms)

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Host Creates a Room (Priority: P1)

A player opens the game, selects "Multiplayer" from the main menu, chooses "Create Room", and receives a short room code they can share with a friend. The backend registers the room but stores no game state — it only holds a temporary connection slot.

**Why this priority**: This is the entry point for all multiplayer sessions. Without room creation nothing else is possible.

**Independent Test**: Can be fully tested by opening the game, navigating to the multiplayer menu, clicking "Create Room", and verifying that a shareable room code is displayed and a room exists on the signaling server.

**Acceptance Scenarios**:

1. **Given** a player is on the main menu, **When** they select "Multiplayer → Create Room", **Then** a unique room code (e.g., 6 characters) is displayed and the room is registered on the signaling server.
2. **Given** a room has been created, **When** no second player joins within a timeout period (e.g., 5 minutes), **Then** the room is automatically cleaned up on the signaling server.
3. **Given** a room code is displayed, **When** the hosting player cancels or closes the game, **Then** the room is removed from the signaling server.

---

### User Story 2 - Guest Joins a Room (Priority: P1)

A second player enters the room code shared by the host. The signaling server facilitates the handshake between the two peers so that a direct P2P connection is established. Neither player's game state is stored on the server at any point.

**Why this priority**: Equally essential as room creation — together they are the minimum viable multiplayer flow.

**Independent Test**: Can be tested by having two browser tabs open, one hosting and one joining, and verifying both sides reach a "Connected" state without the server holding any game data.

**Acceptance Scenarios**:

1. **Given** a valid room code, **When** a second player enters it and clicks "Join Room", **Then** both players are notified of the successful connection and the game starts.
2. **Given** an invalid or expired room code, **When** a player attempts to join, **Then** a clear error message is shown and no connection is attempted.
3. **Given** both players are connected, **When** one player's game state changes (e.g., particle spawns), **Then** the state is transmitted directly peer-to-peer without passing through the signaling server.

---

### User Story 3 - Reconnection and Graceful Disconnect (Priority: P2)

If a player's connection drops during a game, the other player is notified. The session ends gracefully — no hanging connections on the signaling server.

**Why this priority**: Important for a good experience but not required for the MVP; the game can initially end on disconnect.

**Independent Test**: Can be tested by simulating a dropped connection mid-game and verifying the surviving player sees a disconnect notice and is returned to the menu.

**Acceptance Scenarios**:

1. **Given** two players are in an active game, **When** one player loses their connection, **Then** the other player sees a "Opponent disconnected" message and is returned to the main menu.
2. **Given** a player disconnects, **When** the signaling server detects the lost connection, **Then** the room slot is freed immediately.

---

### Edge Cases

- What happens when two players simultaneously try to join the same room?
- Room code collision: server retries with a new random code until a unique code is found.
- What if the signaling server is unreachable when a player tries to create or join a room?
- What if the P2P connection fails to establish after the signaling handshake (NAT traversal failure)?

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: System MUST allow a player to create a multiplayer room and receive a unique, shareable room code.
- **FR-002**: System MUST allow a second player to join a room by entering a valid room code.
- **FR-003**: System MUST facilitate a peer-to-peer connection handshake between the two players (exchange of connection information).
- **FR-004**: System MUST NOT store any game state on the signaling server; all game data flows directly between peers.
- **FR-005**: System MUST automatically remove rooms from the signaling server when both players have connected (handshake complete), when a room times out with no joiner, or when the host disconnects before a game starts.
- **FR-006**: System MUST notify both players when the P2P connection is successfully established so the game can begin.
- **FR-007**: System MUST notify the remaining player when the opponent disconnects mid-game.
- **FR-008**: The game client MUST synchronize real-time game state (particle positions, upgrades, base HP) directly between peers once connected. The host sends full state snapshots at 20 Hz (every 50 ms) over the WebRTC DataChannel; the guest applies received snapshots and forwards its inputs (upgrades, nuke, tower actions) to the host.
- **FR-009**: System MUST support the existing "2 Player" game mode over the P2P connection (same rules, same grid, same upgrade system).
- **FR-010**: System MUST validate room codes on join and return a clear error for invalid or expired codes.
- **FR-011**: Signaling server MUST enforce a per-IP rate limit of 2 room creation requests per minute; excess requests receive a clear error response (e.g., HTTP 429).

### Key Entities

- **Room**: A temporary signaling slot identified by a unique code. Holds the host's connection identifier and optionally the joiner's. Expires automatically. Contains no game state.
- **Peer Connection**: The direct connection between two players. Established via the signaling handshake; all game data flows through this after setup.
- **Room Code**: A short, human-readable string (e.g., 6 alphanumeric characters) that identifies a room and is shared out-of-band by the host.

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Two players on different machines can start a multiplayer game within 30 seconds of the host sharing a room code, under normal network conditions.
- **SC-002**: No game state is observable on the signaling server at any point during an active game session.
- **SC-003**: The signaling server handles at least 50 concurrent rooms without degraded connection setup time.
- **SC-004**: Players see a clear error message within 3 seconds when attempting to join an invalid or expired room code.
- **SC-005**: On opponent disconnect, the surviving player is returned to the main menu within 5 seconds.
- **SC-006**: The existing single-player and local 2-player modes continue to work unchanged after multiplayer is introduced.

## Assumptions

- Both players must be able to reach the signaling server (public internet or shared LAN); the server is not responsible for relaying game data.
- WebRTC is used as the P2P transport; the signaling server exchanges offer/answer and ICE candidates. ICE is configured with Google's public STUN server (`stun.l.google.com:19302`); no TURN relay is used. If NAT traversal fails, the session fails gracefully (no silent hang) — acceptable for v1.
- Room codes are valid for 5 minutes before the host player connects and then until both players disconnect.
- The signaling server is a lightweight standalone Node.js service using the `ws` library (not embedded in a game client), deployed on fly.io.
- Mobile support is out of scope for v1; target platforms are desktop browsers.
- Authentication and user accounts are out of scope; rooms are anonymous and identified only by room code.
- The game uses a host-authoritative model: the host runs the `GameEngine` simulation and sends encoded state snapshots to the guest over the P2P DataChannel; the guest is a pure renderer that applies received snapshots and forwards its inputs (upgrades, nuke, tower actions) to the host. No game state ever passes through the signaling server.
