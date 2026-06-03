import { describe, it, expect } from 'vitest';
import { encode, decode, UPGRADE_TYPE_ORDER } from './GameStateEncoder.js';
import type { GameStateSnapshotHeader } from './types.js';

function makeHeader(overrides: Partial<GameStateSnapshotHeader> = {}): GameStateSnapshotHeader {
  return {
    tick: 42,
    isFullSync: true,
    particleCount: 0,
    p0Hp: 100,
    p1Hp: 75.5,
    p0Gold: 250,
    p1Gold: 320,
    p0Upgrades: new Uint8Array([1, 2, 3, 0, 0, 1, 2, 0]),
    p1Upgrades: new Uint8Array([0, 1, 0, 3, 2, 0, 1, 1]),
    ...overrides,
  };
}

function makeParticle(id: number, overrides: Partial<{ x: number; y: number; vx: number; vy: number; health: number }> = {}) {
  return {
    id,
    x: 100.5,
    y: 200.25,
    vx: 1.5,
    vy: -0.75,
    health: 85.0,
    ...overrides,
  } as unknown as import('../particles/AbstractParticle.js').AbstractParticle;
}

describe('encode/decode round-trip', () => {
  it('full sync with multiple particles', () => {
    const particles = [makeParticle(1), makeParticle(2, { x: 300, y: 400, health: 50 }), makeParticle(3)];
    const header = makeHeader({ particleCount: particles.length });

    const buf = encode(header, particles);
    const result = decode(buf);

    expect(result.header.tick).toBe(42);
    expect(result.header.isFullSync).toBe(true);
    expect(result.header.particleCount).toBe(particles.length);
    expect(result.header.p0Hp).toBeCloseTo(100);
    expect(result.header.p1Hp).toBeCloseTo(75.5);
    expect(result.header.p0Gold).toBeCloseTo(250);
    expect(result.header.p1Gold).toBeCloseTo(320);

    expect(result.particles).toHaveLength(particles.length);
    expect(result.particles[0].id).toBe(1);
    expect(result.particles[1].id).toBe(2);
    expect(result.particles[1].x).toBeCloseTo(300);
    expect(result.particles[1].hp).toBeCloseTo(50);
  });

  it('delta mode (isFullSync = false)', () => {
    const particles = [makeParticle(10, { x: 50, y: 60 })];
    const header = makeHeader({ isFullSync: false, particleCount: 1 });

    const buf = encode(header, particles);
    const result = decode(buf);

    expect(result.header.isFullSync).toBe(false);
    expect(result.particles[0].id).toBe(10);
    expect(result.particles[0].x).toBeCloseTo(50);
    expect(result.particles[0].y).toBeCloseTo(60);
  });

  it('edge case: 0 particles (header-only message)', () => {
    const header = makeHeader({ particleCount: 0 });
    const buf = encode(header, []);
    const result = decode(buf);

    expect(result.header.particleCount).toBe(0);
    expect(result.particles).toHaveLength(0);
    expect(buf.byteLength).toBe(39);
  });

  it('upgrade level arrays survive round-trip in UPGRADE_TYPE_ORDER', () => {
    const p0Upgrades = new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]);
    const p1Upgrades = new Uint8Array([8, 7, 6, 5, 4, 3, 2, 1]);
    const header = makeHeader({ p0Upgrades, p1Upgrades });

    const buf = encode(header, []);
    const result = decode(buf);

    for (let i = 0; i < 8; i++) {
      expect(result.header.p0Upgrades[i]).toBe(p0Upgrades[i]);
      expect(result.header.p1Upgrades[i]).toBe(p1Upgrades[i]);
    }
  });

  it('header fields: tick, flags, player stats all survive round-trip', () => {
    const header = makeHeader({ tick: 9999, isFullSync: true, p0Hp: 0, p1Hp: 1000 });
    const buf = encode(header, []);
    const result = decode(buf);

    expect(result.header.tick).toBe(9999);
    expect(result.header.isFullSync).toBe(true);
    expect(result.header.p0Hp).toBeCloseTo(0);
    expect(result.header.p1Hp).toBeCloseTo(1000);
  });
});

describe('UPGRADE_TYPE_ORDER', () => {
  it('has exactly 8 elements', () => {
    expect(UPGRADE_TYPE_ORDER).toHaveLength(8);
  });

  it('matches the contract-specified order', () => {
    expect(UPGRADE_TYPE_ORDER[0]).toBe('health');
    expect(UPGRADE_TYPE_ORDER[1]).toBe('attack');
    expect(UPGRADE_TYPE_ORDER[2]).toBe('radius');
    expect(UPGRADE_TYPE_ORDER[3]).toBe('spawnRate');
    expect(UPGRADE_TYPE_ORDER[4]).toBe('speed');
    expect(UPGRADE_TYPE_ORDER[5]).toBe('defense');
    expect(UPGRADE_TYPE_ORDER[6]).toBe('maxParticles');
    expect(UPGRADE_TYPE_ORDER[7]).toBe('interestRate');
  });
});
