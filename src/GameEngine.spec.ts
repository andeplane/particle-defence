import { describe, it, expect, vi } from 'vitest';
import { CONFIG } from './config';
import { GameEngine, type GameEngineCallbacks } from './GameEngine';
import { createPlayer, type IPlayer } from './player';
import { createMockGrid } from './__mocks__/createMockGrid';
import { createMockParticle } from './__mocks__/createMockParticle';

const noopCallbacks: GameEngineCallbacks = {
  onKill: vi.fn(),
  onBaseDamage: vi.fn(),
  onParticleSpawned: vi.fn(),
  onNuke: vi.fn(),
  onGameOver: vi.fn(),
  onStuckRespawn: vi.fn(),
  onInterest: vi.fn(),
  spawnExplosion: vi.fn(),
};

const noSpawnConfig = {
  spawnIntervalMs: 999_999,
  minSpawnInterval: 999_999,
  maxParticlesPerPlayer: 0,
};

function createPlayerWithInterest(interestLevel: number, startingGold: number): IPlayer {
  const p = createPlayer(0, { ...noSpawnConfig, startingGold: startingGold + 500 });
  for (let i = 0; i < interestLevel; i++) p.buyUpgrade('interestRate');
  p.gold = startingGold;
  return p;
}

describe(GameEngine.name, () => {
  describe('interest application', () => {
    const intervalMs = CONFIG.INTEREST_INTERVAL_MS;

    it.each([
      { interestLevel: 0, gold: 100, delta: intervalMs, expectedGold: 100, desc: 'no upgrade => no interest' },
      { interestLevel: 1, gold: 100, delta: intervalMs, expectedGold: 101, desc: '1% one interval => +1' },
      { interestLevel: 5, gold: 100, delta: intervalMs, expectedGold: 105, desc: '5% one interval => +5' },
    ])('$desc', ({ interestLevel, gold, delta, expectedGold }) => {
      const p0 = createPlayerWithInterest(interestLevel, gold);
      const p1 = createPlayer(1, { ...noSpawnConfig, startingGold: 50 });

      const engine = new GameEngine(createMockGrid(), noopCallbacks, {
        createPlayer: (id) => (id === 0 ? p0 : p1),
        createParticle: () => createMockParticle({ alive: true }),
      });
      engine.init(false);

      engine.tick(delta);

      expect(engine.players[0].gold).toBe(expectedGold);
    });

    it('applies multiple compound steps when delta spans several intervals', () => {
      const p0 = createPlayerWithInterest(1, 100);
      const p1 = createPlayer(1, { ...noSpawnConfig, startingGold: 50 });

      const engine = new GameEngine(createMockGrid(), noopCallbacks, {
        createPlayer: (id) => (id === 0 ? p0 : p1),
        createParticle: () => createMockParticle({ alive: true }),
      });
      engine.init(false);

      engine.tick(intervalMs * 3);

      expect(engine.players[0].gold).toBe(103);
    });

    it('does not apply interest before interval elapses', () => {
      const p0 = createPlayerWithInterest(1, 100);
      const p1 = createPlayer(1, { ...noSpawnConfig, startingGold: 50 });

      const engine = new GameEngine(createMockGrid(), noopCallbacks, {
        createPlayer: (id) => (id === 0 ? p0 : p1),
        createParticle: () => createMockParticle({ alive: true }),
      });
      engine.init(false);

      engine.tick(intervalMs / 2);

      expect(engine.players[0].gold).toBe(100);
    });

    it('uses floor for deterministic rounding', () => {
      const p0 = createPlayerWithInterest(1, 199);
      const p1 = createPlayer(1, { ...noSpawnConfig, startingGold: 50 });

      const engine = new GameEngine(createMockGrid(), noopCallbacks, {
        createPlayer: (id) => (id === 0 ? p0 : p1),
        createParticle: () => createMockParticle({ alive: true }),
      });
      engine.init(false);

      engine.tick(intervalMs);

      expect(engine.players[0].gold).toBe(200);
    });

    it('invokes onInterest callback when interest is applied', () => {
      const onInterest = vi.fn();
      const p0 = createPlayerWithInterest(1, 100);
      const p1 = createPlayer(1, { ...noSpawnConfig, startingGold: 50 });

      const engine = new GameEngine(createMockGrid(), { ...noopCallbacks, onInterest }, {
        createPlayer: (id) => (id === 0 ? p0 : p1),
        createParticle: () => createMockParticle({ alive: true }),
      });
      engine.init(false);

      engine.tick(intervalMs);

      expect(onInterest).toHaveBeenCalledWith(0, 1);
    });

    it('skips interest when gold is 0', () => {
      const p0 = createPlayerWithInterest(1, 0);
      const p1 = createPlayer(1, { ...noSpawnConfig, startingGold: 50 });

      const engine = new GameEngine(createMockGrid(), noopCallbacks, {
        createPlayer: (id) => (id === 0 ? p0 : p1),
        createParticle: () => createMockParticle({ alive: true }),
      });
      engine.init(false);

      engine.tick(intervalMs);

      expect(engine.players[0].gold).toBe(0);
    });
  });
});
