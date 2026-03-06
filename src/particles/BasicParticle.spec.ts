import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { BasicParticle } from './BasicParticle';
import { resetParticleIds, type ParticleDependencies, type ParticleConfig } from './AbstractParticle';
import { createMockGameContext } from '../__mocks__/createMockGameContext';
import { createMockCellEffectMap } from '../__mocks__/createMockCellEffectMap';
import { createMockParticle } from '../__mocks__/createMockParticle';
import type { GameContext } from './GameContext';

const testParticleConfig: ParticleConfig = {
  gameWidth: 512,
  gameHeight: 256,
  baseWidthCells: 2,
  mazeCols: 16,
  driftStrength: 0,
  enemyBias: 0,
  stuckThresholdBlocks: 5,
  stuckThresholdSeconds: 10,
  baseDamageOnReach: 1,
};

function createDeps(overrides?: Partial<ParticleDependencies>): ParticleDependencies {
  let nextId = 0;
  return {
    nextId: () => nextId++,
    config: testParticleConfig,
    ...overrides,
  };
}

function createParticle(
  overrides?: { x?: number; y?: number; owner?: 0 | 1; health?: number; attack?: number; radius?: number; speed?: number },
  deps?: ParticleDependencies,
) {
  return new BasicParticle(
    overrides?.x ?? 100,
    overrides?.y ?? 100,
    overrides?.owner ?? 0,
    overrides?.health ?? 3,
    overrides?.attack ?? 1,
    overrides?.radius ?? 3,
    overrides?.speed ?? 180,
    deps ?? createDeps(),
  );
}

describe(BasicParticle.name, () => {
  let context: GameContext;

  beforeEach(() => {
    vi.spyOn(Math, 'random').mockReturnValue(0.5);
    context = createMockGameContext();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    resetParticleIds();
  });

  describe('construction', () => {
    it('assigns id from injected nextId', () => {
      let counter = 42;
      const deps = createDeps({ nextId: () => counter++ });
      const p = createParticle(undefined, deps);
      expect(p.id).toBe(42);
    });

    it('sets initial position and stats', () => {
      const p = createParticle({ x: 50, y: 75, health: 5, attack: 2, radius: 4, speed: 200 });
      expect(p.x).toBe(50);
      expect(p.y).toBe(75);
      expect(p.health).toBe(5);
      expect(p.maxHealth).toBe(5);
      expect(p.attack).toBe(2);
      expect(p.radius).toBe(4);
      expect(p.speed).toBe(200);
      expect(p.alive).toBe(true);
    });

    it('sets velocity direction based on owner (player 0 moves right)', () => {
      const p = createParticle({ owner: 0 });
      expect(p.vx).toBeGreaterThan(0);
    });

    it('sets velocity direction based on owner (player 1 moves left)', () => {
      const p = createParticle({ owner: 1 });
      expect(p.vx).toBeLessThan(0);
    });

    it('has typeName "basic"', () => {
      const p = createParticle();
      expect(p.typeName).toBe('basic');
    });

    it('sprite and trail default to null', () => {
      const p = createParticle();
      expect(p.sprite).toBeNull();
      expect(p.trail).toBeNull();
    });
  });

  describe('takeDamage', () => {
    it('reduces health by amount', () => {
      const p = createParticle({ health: 10 });
      p.takeDamage(3);
      expect(p.health).toBe(7);
    });

    it.each([
      { defenseFactor: 0, damage: 10, expectedHealth: 0, desc: 'no defense' },
      { defenseFactor: 0.2, damage: 10, expectedHealth: 2, desc: '20% defense reduces damage' },
      { defenseFactor: 0.5, damage: 10, expectedHealth: 5, desc: '50% defense halves damage' },
    ])('$desc', ({ defenseFactor, damage, expectedHealth }) => {
      const p = createParticle({ health: 10 });
      p.defenseFactor = defenseFactor;
      p.takeDamage(damage);
      expect(p.health).toBe(expectedHealth);
    });

    it('sets alive to false when health reaches 0', () => {
      const p = createParticle({ health: 1 });
      p.takeDamage(1);
      expect(p.alive).toBe(false);
    });

    it('sets alive to false when health goes below 0', () => {
      const p = createParticle({ health: 1 });
      p.takeDamage(99);
      expect(p.alive).toBe(false);
    });
  });

  describe('getBaseDamage', () => {
    it('returns baseDamageOnReach from config', () => {
      const p = createParticle();
      expect(p.getBaseDamage()).toBe(testParticleConfig.baseDamageOnReach);
    });
  });

  describe('isStuck', () => {
    it('returns false when age < threshold', () => {
      const p = createParticle();
      p.age = 5;
      expect(p.isStuck()).toBe(false);
    });

    it('returns true when age >= threshold and particle has not moved far', () => {
      const p = createParticle({ x: 100, y: 100 });
      p.age = 15;
      // Particle hasn't moved from spawn
      expect(p.isStuck()).toBe(true);
    });

    it('returns false when age >= threshold but particle has moved far', () => {
      const p = createParticle({ x: 100, y: 100 });
      p.age = 15;
      p.x = 500;
      p.y = 200;
      expect(p.isStuck()).toBe(false);
    });
  });

  describe('onCollide', () => {
    it('calls takeDamage with other particle attack', () => {
      const p = createParticle({ health: 10 });
      const other = createMockParticle({ attack: 3 });
      p.onCollide(other, context);
      expect(p.health).toBe(7);
    });
  });

  describe('update', () => {
    it('does nothing when dead', () => {
      const p = createParticle();
      p.alive = false;
      const xBefore = p.x;
      p.update(0.016, context);
      expect(p.x).toBe(xBefore);
    });

    it('increments age', () => {
      const p = createParticle();
      p.update(0.5, context);
      expect(p.age).toBeCloseTo(0.5);
    });

    it('moves particle in direction of velocity', () => {
      const deps = createDeps({ config: { ...testParticleConfig, driftStrength: 0 } });
      const p = createParticle({ x: 100, y: 100, speed: 180, owner: 0 }, deps);

      // With Math.random mocked to 0.5, angle = 0, vx = speed, vy = 0
      const xBefore = p.x;
      p.update(0.1, context);

      expect(p.x).not.toBe(xBefore);
    });

    it('bounces off walls (reverses vx)', () => {
      const wallContext = createMockGameContext({
        grid: {
          ...context.grid,
          isWall: vi.fn((px: number, _py: number) => px > 200),
          isInBase: vi.fn(() => false),
        },
      });

      const deps = createDeps({ config: { ...testParticleConfig, driftStrength: 0, enemyBias: 0 } });
      const p = createParticle({ x: 199, y: 100, speed: 180, owner: 0 }, deps);

      const vxBefore = p.vx;
      p.update(0.1, wallContext);

      // vx should have flipped direction due to wall bounce
      expect(Math.sign(p.vx)).toBe(-Math.sign(vxBefore));
    });

    it('clamps x to game bounds', () => {
      const deps = createDeps({ config: { ...testParticleConfig, driftStrength: 0 } });
      const p = createParticle({ x: testParticleConfig.gameWidth - 1, speed: 180, owner: 0 }, deps);

      p.update(1.0, context);

      expect(p.x).toBeLessThanOrEqual(testParticleConfig.gameWidth);
      expect(p.x).toBeGreaterThanOrEqual(0);
    });

    it('wraps y periodically', () => {
      const deps = createDeps({ config: { ...testParticleConfig, driftStrength: 0 } });
      const p = createParticle({ x: 100, y: testParticleConfig.gameHeight - 1, speed: 180, owner: 0 }, deps);
      // Force strong downward velocity
      p.vy = 500;
      p.vx = 0;

      p.update(1.0, context);

      expect(p.y).toBeGreaterThanOrEqual(p.radius);
      expect(p.y).toBeLessThanOrEqual(testParticleConfig.gameHeight - p.radius);
    });
  });

  describe('cell effects integration', () => {
    it('slows movement when slow effect is active', () => {
      const slowEffects = createMockCellEffectMap({ getSlowFactor: vi.fn(() => 0.5) });
      const slowContext = createMockGameContext({ cellEffects: slowEffects });

      const deps = createDeps({ config: { ...testParticleConfig, driftStrength: 0 } });
      const p = createParticle({ x: 100, y: 100, speed: 180, owner: 0 }, deps);
      const vxBefore = p.vx;

      const normalContext = createMockGameContext();
      const pNormal = createParticle({ x: 100, y: 100, speed: 180, owner: 0 }, createDeps({ config: { ...testParticleConfig, driftStrength: 0 } }));
      pNormal.vx = vxBefore;
      pNormal.vy = p.vy;

      // Both update with same dt
      p.update(0.1, slowContext);
      pNormal.update(0.1, normalContext);

      // Slowed particle should have moved less in x
      const slowDist = Math.abs(p.x - 100);
      const normalDist = Math.abs(pNormal.x - 100);
      expect(slowDist).toBeLessThan(normalDist);
    });

    it('bounces off enemy temp wall', () => {
      const tempWallEffects = createMockCellEffectMap({
        isTempWall: vi.fn((px: number) => px > 200),
      });
      const tempWallContext = createMockGameContext({ cellEffects: tempWallEffects });

      const deps = createDeps({ config: { ...testParticleConfig, driftStrength: 0, enemyBias: 0 } });
      const p = createParticle({ x: 199, y: 100, speed: 180, owner: 0 }, deps);
      const vxBefore = p.vx;

      p.update(0.1, tempWallContext);

      expect(Math.sign(p.vx)).toBe(-Math.sign(vxBefore));
    });

    it('damages enemy temp wall HP on bounce', () => {
      const damageWallAt = vi.fn<(col: number, row: number, damage: number, attackerOwner: 0 | 1) => boolean>()
        .mockReturnValue(true);
      const tempWallEffects = createMockCellEffectMap({
        isTempWall: vi.fn((px: number) => px > 200),
        damageWallAt,
      });
      const tempWallContext = createMockGameContext({ cellEffects: tempWallEffects });

      const deps = createDeps({ config: { ...testParticleConfig, driftStrength: 0, enemyBias: 0 } });
      const p = createParticle({ x: 199, y: 100, speed: 180, attack: 2, owner: 0 }, deps);

      p.update(0.1, tempWallContext);

      expect(damageWallAt).toHaveBeenCalled();
      const [_col, _row, damage, attackerOwner] = damageWallAt.mock.calls[0];
      expect(damage).toBe(2);
      expect(attackerOwner).toBe(0);
    });

    it('does not damage wall on grid wall bounce (only temp wall)', () => {
      const damageWallAt = vi.fn(() => false);
      const effects = createMockCellEffectMap({ damageWallAt });
      const wallContext = createMockGameContext({
        grid: {
          ...context.grid,
          isWall: vi.fn((px: number) => px > 200),
          isInBase: vi.fn(() => false),
        },
        cellEffects: effects,
      });

      const deps = createDeps({ config: { ...testParticleConfig, driftStrength: 0, enemyBias: 0 } });
      const p = createParticle({ x: 199, y: 100, speed: 180, owner: 0 }, deps);
      p.update(0.1, wallContext);

      expect(damageWallAt).not.toHaveBeenCalled();
    });

    it('calls enterCell on update with current cell and owner', () => {
      const enterCell = vi.fn();
      const ownershipEffects = createMockCellEffectMap({ enterCell });
      const ownershipContext = createMockGameContext({ cellEffects: ownershipEffects });

      const deps = createDeps({ config: { ...testParticleConfig, driftStrength: 0 } });
      const p = createParticle({ x: 50, y: 50, speed: 180, owner: 0 }, deps);

      p.update(0.1, ownershipContext);

      expect(enterCell).toHaveBeenCalled();
      const lastCall = enterCell.mock.calls[enterCell.mock.calls.length - 1];
      const expectedCol = Math.floor(p.x / ownershipContext.grid.cellW);
      const expectedRow = Math.floor(p.y / ownershipContext.grid.cellH);
      expect(lastCall[0]).toBe(expectedCol);
      expect(lastCall[1]).toBe(expectedRow);
      expect(lastCall[2]).toBe(0);
    });

    it('calls leaveCurrentCell with context', () => {
      const leaveCell = vi.fn();
      const ownershipEffects = createMockCellEffectMap({ leaveCell });
      const ownershipContext = createMockGameContext({ cellEffects: ownershipEffects });

      const deps = createDeps({ config: testParticleConfig });
      const p = createParticle({ x: 50, y: 50 }, deps);
      p.update(0.016, ownershipContext);

      p.leaveCurrentCell(ownershipContext);

      expect(leaveCell).toHaveBeenCalled();
    });

    it('no slow effect when factor is 1', () => {
      const noSlowEffects = createMockCellEffectMap({ getSlowFactor: vi.fn(() => 1) });
      const ctx1 = createMockGameContext({ cellEffects: noSlowEffects });
      const ctx2 = createMockGameContext();

      const deps1 = createDeps({ config: { ...testParticleConfig, driftStrength: 0 } });
      const deps2 = createDeps({ config: { ...testParticleConfig, driftStrength: 0 } });
      const p1 = createParticle({ x: 100, y: 100, speed: 180, owner: 0 }, deps1);
      const p2 = createParticle({ x: 100, y: 100, speed: 180, owner: 0 }, deps2);
      p2.vx = p1.vx;
      p2.vy = p1.vy;

      p1.update(0.1, ctx1);
      p2.update(0.1, ctx2);

      expect(p1.x).toBeCloseTo(p2.x);
      expect(p1.y).toBeCloseTo(p2.y);
    });
  });

  describe('destroy', () => {
    it('sets alive to false', () => {
      const p = createParticle();
      p.destroy();
      expect(p.alive).toBe(false);
    });

    it('handles null sprite and trail without error', () => {
      const p = createParticle();
      expect(() => p.destroy()).not.toThrow();
    });
  });

  describe(resetParticleIds.name, () => {
    it('resets the global id counter', () => {
      new BasicParticle(0, 0, 0, 1, 1, 1, 100);

      resetParticleIds();

      const p2 = new BasicParticle(0, 0, 0, 1, 1, 1, 100);
      expect(p2.id).toBe(0);
    });
  });
});
