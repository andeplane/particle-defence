import type { AbstractParticle } from '../particles/AbstractParticle.js';
import type { GameStateSnapshotHeader, EncodedParticle } from './types.js';

/**
 * Fixed upgrade type order for the 8-byte upgrade level arrays in snapshots.
 * Must match the order in contracts/game-sync-protocol.md and never change
 * without a protocol version bump.
 */
export const UPGRADE_TYPE_ORDER = [
  'health',
  'attack',
  'radius',
  'spawnRate',
  'speed',
  'defense',
  'maxParticles',
  'interestRate',
] as const;

// Header layout (39 bytes):
//   0: uint32  tick
//   4: uint8   flags (bit 0 = isFullSync)
//   5: uint16  particleCount
//   7: float32 p0Hp
//  11: float32 p1Hp
//  15: float32 p0Gold
//  19: float32 p1Gold
//  23: uint8[8] p0Upgrades
//  31: uint8[8] p1Upgrades
// 39: particles...

const HEADER_SIZE = 39;
const PARTICLE_SIZE = 22;

export interface EncodeInput {
  header: GameStateSnapshotHeader;
  particles: AbstractParticle[];
}

export function encode(header: GameStateSnapshotHeader, particles: AbstractParticle[]): ArrayBuffer {
  const count = particles.length;
  const buf = new ArrayBuffer(HEADER_SIZE + count * PARTICLE_SIZE);
  const dv = new DataView(buf);

  dv.setUint32(0, header.tick, true);
  dv.setUint8(4, header.isFullSync ? 1 : 0);
  dv.setUint16(5, count, true);
  dv.setFloat32(7, header.p0Hp, true);
  dv.setFloat32(11, header.p1Hp, true);
  dv.setFloat32(15, header.p0Gold, true);
  dv.setFloat32(19, header.p1Gold, true);

  for (let i = 0; i < 8; i++) {
    dv.setUint8(23 + i, header.p0Upgrades[i] ?? 0);
    dv.setUint8(31 + i, header.p1Upgrades[i] ?? 0);
  }

  let offset = HEADER_SIZE;
  for (const p of particles) {
    dv.setUint16(offset, p.id, true);
    dv.setFloat32(offset + 2, p.x, true);
    dv.setFloat32(offset + 6, p.y, true);
    dv.setFloat32(offset + 10, p.vx, true);
    dv.setFloat32(offset + 14, p.vy, true);
    dv.setFloat32(offset + 18, p.health, true);
    offset += PARTICLE_SIZE;
  }

  return buf;
}

export interface DecodeResult {
  header: GameStateSnapshotHeader;
  particles: EncodedParticle[];
}

export function decode(buffer: ArrayBuffer): DecodeResult {
  const dv = new DataView(buffer);

  const tick = dv.getUint32(0, true);
  const flags = dv.getUint8(4);
  const particleCount = dv.getUint16(5, true);
  const p0Hp = dv.getFloat32(7, true);
  const p1Hp = dv.getFloat32(11, true);
  const p0Gold = dv.getFloat32(15, true);
  const p1Gold = dv.getFloat32(19, true);

  const p0Upgrades = new Uint8Array(8);
  const p1Upgrades = new Uint8Array(8);
  for (let i = 0; i < 8; i++) {
    p0Upgrades[i] = dv.getUint8(23 + i);
    p1Upgrades[i] = dv.getUint8(31 + i);
  }

  const header: GameStateSnapshotHeader = {
    tick,
    isFullSync: (flags & 1) === 1,
    particleCount,
    p0Hp,
    p1Hp,
    p0Gold,
    p1Gold,
    p0Upgrades,
    p1Upgrades,
  };

  const particles: EncodedParticle[] = [];
  let offset = HEADER_SIZE;
  for (let i = 0; i < particleCount; i++) {
    particles.push({
      id: dv.getUint16(offset, true),
      x: dv.getFloat32(offset + 2, true),
      y: dv.getFloat32(offset + 6, true),
      vx: dv.getFloat32(offset + 10, true),
      vy: dv.getFloat32(offset + 14, true),
      hp: dv.getFloat32(offset + 18, true),
    });
    offset += PARTICLE_SIZE;
  }

  return { header, particles };
}
