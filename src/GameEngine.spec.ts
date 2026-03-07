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
  onTowerPlaced: vi.fn(),
  onTowerDeath: vi.fn(),
  spawnExplosion: vi.fn(),
};

const noSpawnConfig = {
  spawnIntervalMs: 999_999,
  minSpawnInterval: 999_999,
  maxParticlesPerPlayer: 0,
};

function createPlayerWithInterest(interestLevel: number, startingGold: number): IPlayer {
  const p = createPlayer(0, { ...noSpawnConfig, startingGold: startingGold + 10000 });
  for (let i = 0; i < interestLevel; i++) p.buyUpgrade('interestRate');
  p.gold = startingGold;
  return p;
}

describe(GameEngine.name, () => {
  describe('interest application', () => {
    const intervalMs = CONFIG.INTEREST_INTERVAL_MS;

    it.each([
      { interestLevel: 0, gold: 100, delta: intervalMs, expectedGold: 100, desc: 'no upgrade => no interest' },
      { interestLevel: 1, gold: 400, delta: intervalMs, expectedGold: 401, desc: '0.25% one interval => +1' },
      { interestLevel: 20, gold: 100, delta: intervalMs, expectedGold: 105, desc: '5% one interval => +5' },
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
      const p0 = createPlayerWithInterest(1, 400);
      const p1 = createPlayer(1, { ...noSpawnConfig, startingGold: 50 });

      const engine = new GameEngine(createMockGrid(), noopCallbacks, {
        createPlayer: (id) => (id === 0 ? p0 : p1),
        createParticle: () => createMockParticle({ alive: true }),
      });
      engine.init(false);

      engine.tick(intervalMs * 3);

      expect(engine.players[0].gold).toBe(403);
    });

    it('does not apply interest before interval elapses', () => {
      const p0 = createPlayerWithInterest(1, 400);
      const p1 = createPlayer(1, { ...noSpawnConfig, startingGold: 50 });

      const engine = new GameEngine(createMockGrid(), noopCallbacks, {
        createPlayer: (id) => (id === 0 ? p0 : p1),
        createParticle: () => createMockParticle({ alive: true }),
      });
      engine.init(false);

      engine.tick(intervalMs / 2);

      expect(engine.players[0].gold).toBe(400);
    });

    it('uses floor for deterministic rounding', () => {
      const p0 = createPlayerWithInterest(1, 799);
      const p1 = createPlayer(1, { ...noSpawnConfig, startingGold: 50 });

      const engine = new GameEngine(createMockGrid(), noopCallbacks, {
        createPlayer: (id) => (id === 0 ? p0 : p1),
        createParticle: () => createMockParticle({ alive: true }),
      });
      engine.init(false);

      engine.tick(intervalMs);

      expect(engine.players[0].gold).toBe(800);
    });

    it('invokes onInterest callback when interest is applied', () => {
      const onInterest = vi.fn();
      const p0 = createPlayerWithInterest(1, 400);
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

  describe('tower lifecycle', () => {
    function createTowerEngine() {
      const callbacks = { ...noopCallbacks, onParticleSpawned: vi.fn(), onTowerPlaced: vi.fn() };
      const engine = new GameEngine(createMockGrid(), callbacks, {
        createPlayer: (id) => createPlayer(id, { ...noSpawnConfig, startingGold: 9999 }),
        createParticle: () => createMockParticle({ alive: true }),
      });
      engine.init(false);
      return { engine, callbacks };
    }

    it('buyResearch marks tower type as researched', () => {
      const { engine } = createTowerEngine();
      expect(engine.buyResearch(0, 'laser')).toBe(true);
      expect(engine.players[0].hasResearched('laser')).toBe(true);
    });

    it('constructTower spawns a carrier particle', () => {
      const { engine, callbacks } = createTowerEngine();
      engine.buyResearch(0, 'laser');
      const result = engine.constructTower(0, 'laser');

      expect(result).toBe(true);
      expect(engine.carriers[0]).not.toBeNull();
      expect(engine.carriers[0]!.towerType).toBe('laser');
      expect(callbacks.onParticleSpawned).toHaveBeenCalled();
    });

    it('constructTower fails when not researched', () => {
      const { engine } = createTowerEngine();
      expect(engine.constructTower(0, 'laser')).toBe(false);
    });

    it('constructTower fails when carrier already active', () => {
      const { engine } = createTowerEngine();
      engine.buyResearch(0, 'laser');
      engine.constructTower(0, 'laser');
      expect(engine.constructTower(0, 'laser')).toBe(false);
    });

    it('constructTower fails when tower cap reached', () => {
      const { engine } = createTowerEngine();
      engine.buyResearch(0, 'laser');
      for (let i = 0; i < CONFIG.TOWER_MAX_PER_PLAYER; i++) {
        engine.constructTower(0, 'laser');
        engine.placeTower(0);
      }
      expect(engine.constructTower(0, 'laser')).toBe(false);
    });

    it('placeTower converts carrier to tower', () => {
      const { engine, callbacks } = createTowerEngine();
      engine.buyResearch(0, 'laser');
      engine.constructTower(0, 'laser');

      const result = engine.placeTower(0);

      expect(result).toBe(true);
      expect(engine.carriers[0]).toBeNull();
      expect(engine.towers[0]).toHaveLength(1);
      expect(engine.towers[0][0].typeName).toBe('laserTower');
      expect(callbacks.onTowerPlaced).toHaveBeenCalled();
    });

    it('placeTower fails when no carrier', () => {
      const { engine } = createTowerEngine();
      expect(engine.placeTower(0)).toBe(false);
    });

    it('placeTower creates slow tower from slow carrier', () => {
      const { engine } = createTowerEngine();
      engine.buyResearch(0, 'slow');
      engine.constructTower(0, 'slow');

      engine.placeTower(0);

      expect(engine.towers[0][0].typeName).toBe('slowTower');
    });

    it('upgradeTower deducts gold and increases level', () => {
      const { engine } = createTowerEngine();
      engine.buyResearch(0, 'laser');
      engine.constructTower(0, 'laser');
      engine.placeTower(0);

      const goldBefore = engine.players[0].gold;
      const result = engine.upgradeTower(0, 0);

      expect(result).toBe(true);
      expect(engine.towers[0][0].level).toBe(1);
      expect(engine.players[0].gold).toBeLessThan(goldBefore);
    });

    it('upgradeTower fails when cannot afford', () => {
      const { engine } = createTowerEngine();
      engine.buyResearch(0, 'laser');
      engine.constructTower(0, 'laser');
      engine.placeTower(0);
      engine.players[0].gold = 0;

      expect(engine.upgradeTower(0, 0)).toBe(false);
    });

    it('upgradeTower fails for invalid index', () => {
      const { engine } = createTowerEngine();
      expect(engine.upgradeTower(0, 0)).toBe(false);
      expect(engine.upgradeTower(0, -1)).toBe(false);
    });

    it('cleanupDeadTowers removes dead towers from tracking', () => {
      const { engine } = createTowerEngine();
      engine.buyResearch(0, 'laser');
      engine.constructTower(0, 'laser');
      engine.placeTower(0);

      expect(engine.towers[0]).toHaveLength(1);

      engine.towers[0][0].alive = false;
      engine.tick(16);

      expect(engine.towers[0]).toHaveLength(0);
    });

    it('cleanupDeadTowers clears dead carrier', () => {
      const { engine } = createTowerEngine();
      engine.buyResearch(0, 'laser');
      engine.constructTower(0, 'laser');

      expect(engine.carriers[0]).not.toBeNull();

      engine.carriers[0]!.alive = false;
      engine.tick(16);

      expect(engine.carriers[0]).toBeNull();
    });

    it('resetTowerSlowFactors resets to 1 each tick', () => {
      const { engine } = createTowerEngine();
      const mockP = createMockParticle({ alive: true, towerSlowFactor: 0.5 });
      engine.particles.push(mockP);

      engine.tick(16);

      expect(mockP.towerSlowFactor).toBe(1);
    });
  });
});
