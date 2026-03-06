import { describe, it, expect, vi, beforeEach } from 'vitest';
import { resolveCollisions } from './collision';
import { createMockParticle } from './__mocks__/createMockParticle';
import { createMockGameContext } from './__mocks__/createMockGameContext';
import type { GameContext } from './particles/GameContext';
import type { IParticle } from './particles/AbstractParticle';

describe(resolveCollisions.name, () => {
  let context: GameContext;

  function setupContext(particles: IParticle[], getNearbyMap?: Map<IParticle, IParticle[]>): void {
    context = createMockGameContext({
      particles,
      spatialHash: {
        clear: vi.fn(),
        insert: vi.fn(),
        getNearby: vi.fn((p: IParticle) => getNearbyMap?.get(p) ?? []),
      },
    });
  }

  describe('no collision', () => {
    it('returns empty kills when particles are far apart', () => {
      const p1 = createMockParticle({ id: 1, x: 0, y: 0, owner: 0, radius: 3 });
      const p2 = createMockParticle({ id: 2, x: 100, y: 100, owner: 1, radius: 3 });

      const nearbyMap = new Map<IParticle, IParticle[]>([
        [p1, [p2]],
        [p2, [p1]],
      ]);
      setupContext([p1, p2], nearbyMap);

      const result = resolveCollisions(context);
      expect(result.kills).toHaveLength(0);
    });
  });

  describe('collision detected', () => {
    it('calls onCollide on both overlapping enemy particles', () => {
      const p1 = createMockParticle({ id: 1, x: 0, y: 0, owner: 0, radius: 5, health: 100 });
      const p2 = createMockParticle({ id: 2, x: 3, y: 0, owner: 1, radius: 5, health: 100 });

      const nearbyMap = new Map<IParticle, IParticle[]>([
        [p1, [p2]],
        [p2, [p1]],
      ]);
      setupContext([p1, p2], nearbyMap);

      resolveCollisions(context);

      expect(p1.onCollide).toHaveBeenCalledWith(p2, context);
      expect(p2.onCollide).toHaveBeenCalledWith(p1, context);
    });
  });

  describe('separation', () => {
    it('pushes overlapping particles apart', () => {
      const p1 = createMockParticle({ id: 1, x: 0, y: 0, owner: 0, radius: 5, health: 100, vx: 10, vy: 0 });
      const p2 = createMockParticle({ id: 2, x: 4, y: 0, owner: 1, radius: 5, health: 100, vx: -10, vy: 0 });

      const nearbyMap = new Map<IParticle, IParticle[]>([
        [p1, [p2]],
        [p2, [p1]],
      ]);
      setupContext([p1, p2], nearbyMap);

      const x1Before = p1.x;
      const x2Before = p2.x;
      resolveCollisions(context);

      expect(p1.x).toBeLessThan(x1Before);
      expect(p2.x).toBeGreaterThan(x2Before);
    });
  });

  describe('elastic bounce', () => {
    it('adjusts velocities along collision normal', () => {
      const p1 = createMockParticle({ id: 1, x: 0, y: 0, owner: 0, radius: 5, health: 100, vx: 50, vy: 0 });
      const p2 = createMockParticle({ id: 2, x: 4, y: 0, owner: 1, radius: 5, health: 100, vx: -50, vy: 0 });

      const nearbyMap = new Map<IParticle, IParticle[]>([
        [p1, [p2]],
        [p2, [p1]],
      ]);
      setupContext([p1, p2], nearbyMap);

      resolveCollisions(context);

      // After elastic collision, velocities should have swapped directions
      expect(p1.vx).toBeLessThan(0);
      expect(p2.vx).toBeGreaterThan(0);
    });
  });

  describe('kill tracking', () => {
    it('records kill and awards gold when particle dies from collision', () => {
      const p1 = createMockParticle({ id: 1, x: 0, y: 0, owner: 0, radius: 5, health: 1, attack: 10 });
      const p2 = createMockParticle({ id: 2, x: 4, y: 0, owner: 1, radius: 5, health: 1, attack: 10 });

      const nearbyMap = new Map<IParticle, IParticle[]>([
        [p1, [p2]],
        [p2, [p1]],
      ]);
      setupContext([p1, p2], nearbyMap);

      const result = resolveCollisions(context);

      // Both should die since both have health=1 and other's attack=10
      expect(result.kills).toHaveLength(2);
      expect(context.players[0].gold).toBe(10 + context.killReward);
      expect(context.players[1].gold).toBe(10 + context.killReward);
    });

    it('awards kill count to killer player', () => {
      const p1 = createMockParticle({ id: 1, x: 0, y: 0, owner: 0, radius: 5, health: 1, attack: 10 });
      const p2 = createMockParticle({ id: 2, x: 4, y: 0, owner: 1, radius: 5, health: 100, attack: 10 });

      const nearbyMap = new Map<IParticle, IParticle[]>([
        [p1, [p2]],
        [p2, [p1]],
      ]);
      setupContext([p1, p2], nearbyMap);

      resolveCollisions(context);

      // p1 dies, killer is p2 (owner 1)
      expect(context.players[1].kills).toBe(1);
    });
  });

  describe('same-owner skip', () => {
    it('does not collide particles with the same owner', () => {
      const p1 = createMockParticle({ id: 1, x: 0, y: 0, owner: 0, radius: 5 });
      const p2 = createMockParticle({ id: 2, x: 3, y: 0, owner: 0, radius: 5 });

      const nearbyMap = new Map<IParticle, IParticle[]>([
        [p1, [p2]],
        [p2, [p1]],
      ]);
      setupContext([p1, p2], nearbyMap);

      const result = resolveCollisions(context);

      expect(p1.onCollide).not.toHaveBeenCalled();
      expect(p2.onCollide).not.toHaveBeenCalled();
      expect(result.kills).toHaveLength(0);
    });
  });

  describe('dead particle skip', () => {
    it('ignores dead particles', () => {
      const p1 = createMockParticle({ id: 1, x: 0, y: 0, owner: 0, radius: 5, alive: false });
      const p2 = createMockParticle({ id: 2, x: 3, y: 0, owner: 1, radius: 5 });

      const nearbyMap = new Map<IParticle, IParticle[]>([
        [p1, [p2]],
        [p2, [p1]],
      ]);
      setupContext([p1, p2], nearbyMap);

      const result = resolveCollisions(context);

      expect(p1.onCollide).not.toHaveBeenCalled();
      expect(result.kills).toHaveLength(0);
    });
  });

  describe('pair deduplication', () => {
    it('processes each pair only once', () => {
      const p1 = createMockParticle({ id: 1, x: 0, y: 0, owner: 0, radius: 5, health: 100 });
      const p2 = createMockParticle({ id: 2, x: 3, y: 0, owner: 1, radius: 5, health: 100 });

      const nearbyMap = new Map<IParticle, IParticle[]>([
        [p1, [p2]],
        [p2, [p1]],
      ]);
      setupContext([p1, p2], nearbyMap);

      resolveCollisions(context);

      expect(p1.onCollide).toHaveBeenCalledTimes(1);
      expect(p2.onCollide).toHaveBeenCalledTimes(1);
    });
  });
});
