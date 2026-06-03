import type { UpgradeType } from '../config.js';

export type MultiplayerRole = 'host' | 'guest';

export interface MultiplayerSession {
  roomCode: string;
  role: MultiplayerRole;
  isPolite: boolean;
  signalingState: 'disconnected' | 'connecting' | 'signaling' | 'connected' | 'failed';
  peerConnection: RTCPeerConnection | null;
  gameStateChannel: RTCDataChannel | null;
  inputChannel: RTCDataChannel | null;
}

export type PlayerInputMessage =
  | { type: 'upgrade'; upgradeType: UpgradeType }
  | { type: 'nuke' }
  | { type: 'tower_build'; towerType: 'laser' | 'slow' }
  | { type: 'tower_place' }
  | { type: 'tower_upgrade'; towerIndex: number }
  | { type: 'tower_research'; towerType: 'laser' | 'slow' };

export interface GameStateSnapshotHeader {
  tick: number;
  isFullSync: boolean;
  particleCount: number;
  p0Hp: number;
  p1Hp: number;
  p0Gold: number;
  p1Gold: number;
  p0Upgrades: Uint8Array;
  p1Upgrades: Uint8Array;
}

export interface EncodedParticle {
  id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  hp: number;
}

export interface GridSeedMessage {
  type: 'grid_seed';
  seed: number;
}
