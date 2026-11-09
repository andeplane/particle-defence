// Client → Server messages
export type ClientMessage =
  | { type: 'create_room' }
  | { type: 'join'; room: string }
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; candidate: RTCIceCandidateInit };

// Server → Client messages
export type ServerMessage =
  | { type: 'room_created'; room: string }
  | { type: 'joined'; polite: true }
  | { type: 'peer_joined' }
  | { type: 'room_full' }
  | { type: 'room_not_found' }
  | { type: 'peer_left' }
  | { type: 'error'; message: string };

// Relayed messages (client ↔ client via server) — same structure as ClientMessage relay types
export type RelayMessage =
  | { type: 'offer'; sdp: RTCSessionDescriptionInit }
  | { type: 'answer'; sdp: RTCSessionDescriptionInit }
  | { type: 'ice'; candidate: RTCIceCandidateInit };

// Union of all messages (for parsing incoming frames)
export type SignalingMessage = ClientMessage | ServerMessage;

// WebRTC types referenced by the server (browser globals not available in Node)
export interface RTCSessionDescriptionInit {
  type: 'offer' | 'answer' | 'pranswer' | 'rollback';
  sdp?: string;
}

export interface RTCIceCandidateInit {
  candidate?: string;
  sdpMid?: string | null;
  sdpMLineIndex?: number | null;
  usernameFragment?: string | null;
}
