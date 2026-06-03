# Contract: Signaling Server WebSocket Protocol

**Version**: 1.1  
**Transport**: WebSocket (ws://<host>:<port>)  
**Encoding**: JSON text frames (UTF-8)

---

## Overview

The signaling server is a thin relay. It holds rooms (identified by a room code) and relays WebRTC negotiation messages between exactly two peers. It never reads or writes game state.

**Server URL**: `ws://<signaling-host>/`

---

## Connection Lifecycle

Room codes are **server-generated** to guarantee uniqueness. The host requests a new room; the server creates a unique code and returns it. Guests join by code only.

```
HOST FLOW
  Client connects to WS
  Client sends:   { type: "create_room" }
  Server responds: { type: "room_created", room: "ABC123" }  ← unique 6-char code
  Client displays code; waits for peer_joined

GUEST FLOW
  Client connects to WS
  Client sends:   { type: "join", room: "ABC123" }
  Server responds: one of:
    { type: "joined", polite: true }   → guest accepted; host will receive peer_joined
    { type: "room_full" }              → room already has 2 peers
    { type: "room_not_found" }         → code does not exist or has expired
```

After `peer_joined` is delivered to the host, both peers begin the WebRTC offer/answer exchange. The host is always the impolite peer (`polite: false`).

---

## Client → Server Messages

### `create_room`

```json
{ "type": "create_room" }
```

Sent by the host to request a new room. The server generates a unique 6-character alphanumeric code, registers the room, and responds with `room_created`. No room code is sent by the client.

### `join`

```json
{ "type": "join", "room": "ABC123" }
```

Sent by the guest to join an existing room.

- `room`: 6-character alphanumeric string previously received from the host out-of-band.

---

## Server → Client Messages

### `room_created`

```json
{ "type": "room_created", "room": "ABC123" }
```

Sent to the host after a successful `create_room` request. `room` is the server-generated unique 6-character alphanumeric code the host should share with the guest.

### `joined`

```json
{ "type": "joined", "polite": true }
```

Sent to the **guest** after a successful `join`. Always `polite: true` (the host is always impolite). The host is not sent a `joined` — it receives `room_created` on creation and `peer_joined` when the guest arrives.

### `peer_joined`

```json
{ "type": "peer_joined" }
```

Sent only to the host (impolite peer) when the guest joins. Signals that the host should begin creating the WebRTC offer.

### `room_full`

```json
{ "type": "room_full" }
```

Sent when a third client tries to join a 2-peer room.

### `peer_left`

```json
{ "type": "peer_left" }
```

Sent to the surviving peer immediately when the other disconnects (WebSocket close or TCP timeout detected via heartbeat).

### `error`

```json
{ "type": "error", "message": "Room expired" }
```

Generic error. The client should surface this to the user and return to the lobby.

---

## Relayed Messages (Client ↔ Client via Server)

The server relays these verbatim to the other peer in the room. It does not parse or validate the payload beyond the `type` field.

### `offer`

```json
{
  "type": "offer",
  "sdp": { "type": "offer", "sdp": "<SDP string>" }
}
```

Sent by the impolite peer (host). Relayed to the polite peer (guest).

### `answer`

```json
{
  "type": "answer",
  "sdp": { "type": "answer", "sdp": "<SDP string>" }
}
```

Sent by the polite peer (guest). Relayed to the impolite peer (host).

### `ice`

```json
{
  "type": "ice",
  "candidate": {
    "candidate": "<ICE candidate string>",
    "sdpMid": "0",
    "sdpMLineIndex": 0
  }
}
```

Sent by either peer as ICE candidates are gathered. Relayed to the other peer.

---

## Server Behaviour Guarantees

1. **Room capacity**: Maximum 2 peers per room. Third join attempt receives `room_full`.
2. **Message relay**: Relay messages are forwarded only to the other peer, never echoed back to sender.
3. **Heartbeat**: Server sends a WebSocket ping frame every 30 s. If no pong is received within 10 s, the connection is terminated and `peer_left` is sent to the remaining peer.
4. **Room expiry**: Rooms with exactly 1 peer and no second join for 5 minutes are silently deleted.
5. **No state persistence**: The server holds no state between WebSocket connections. Reconnecting after a disconnect starts a fresh session.

---

## Error Conditions

| Situation | Server response |
|-----------|----------------|
| Malformed JSON | Connection silently closed |
| Unknown message type | Connection silently closed |
| Join a full room | `{ type: "room_full" }` |
| Join an unknown or expired code | `{ type: "room_not_found" }` |
| Peer disconnects | `{ type: "peer_left" }` to the other peer |
| Room expired (host waiting, no guest joined) | `{ type: "error", message: "Room expired" }` to host |
