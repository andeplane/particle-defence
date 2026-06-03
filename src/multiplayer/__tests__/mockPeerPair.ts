import type { PlayerInputMessage } from '../types.js';

/**
 * Minimal PeerConnection interface that MultiplayerHost/Guest depend on.
 * Messages route synchronously in-memory — no WebRTC, no network.
 */
export interface MockPeerConnection {
  onMessage: (buffer: ArrayBuffer) => void;
  onInputMessage: (msg: PlayerInputMessage) => void;
  onConnected: () => void;
  onDisconnected: () => void;
  sendGameState(buffer: ArrayBuffer): void;
  sendInput(msg: PlayerInputMessage): void;
  disconnect(): void;
}

/** Creates two linked MockPeerConnections. Messages sent on one are delivered synchronously to the other. */
export function createMockPeerPair(): [MockPeerConnection, MockPeerConnection] {
  const a: MockPeerConnection = {
    onMessage: () => {},
    onInputMessage: () => {},
    onConnected: () => {},
    onDisconnected: () => {},
    sendGameState(buf: ArrayBuffer) { b.onMessage(buf); },
    sendInput(msg: PlayerInputMessage) { b.onInputMessage(msg); },
    disconnect() { b.onDisconnected(); },
  };

  const b: MockPeerConnection = {
    onMessage: () => {},
    onInputMessage: () => {},
    onConnected: () => {},
    onDisconnected: () => {},
    sendGameState(buf: ArrayBuffer) { a.onMessage(buf); },
    sendInput(msg: PlayerInputMessage) { a.onInputMessage(msg); },
    disconnect() { a.onDisconnected(); },
  };

  return [a, b];
}
