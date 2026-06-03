import { describe, it, expect, vi } from 'vitest';
import { CONFIG, TOWER_TYPE } from './config';
import { GameEngine, type GameEngineCallbacks } from './GameEngine';
import { createPlayer, type IPlayer } from './player';
import { createMockGrid } from './__mocks__/createMockGrid';
import { createMockParticle } from './__mocks__/createMockParticle';
import { createMockCellEffectMap } from './__mocks__/createMockCellEffectMap';
import type { ICellEffectMap } from './grid';
import { ParticleSpawnerTower } from './particles/ParticleSpawnerTower';
import { WeaknessTowerParticle } from './particles/WeaknessTowerParticle';

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
  for (let i = 0; i < interestLevel; i++) { p.startUpgrade('interestRate', i * 2, 1); p.tickUpgrades(i * 2 + 1); }
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

  describe('nuke lifecycle', () => {
    function createNukeEngine() {
      const callbacks = { ...noopCallbacks, onNuke: vi.fn() };
      const enemyParticle = createMockParticle({ owner: 1, alive: true });
      const engine = new GameEngine(createMockGrid(), callbacks, {
        createPlayer: (id) => createPlayer(id, {
          ...noSpawnConfig,
          startingGold: 9999,
          nuclearFirstAvailableMs: 1000,
          nuclearCooldownMs: 5000,
        }),
        maxParticlesTotal: 0,
        createParticle: () => createMockParticle({ alive: true }),
      });
      engine.init(false);
      engine.particles.push(enemyParticle);
      engine.tick(1000);
      return { engine, callbacks, enemyParticle };
    }

    it('refuses launch before nuke research', () => {
      const { engine, callbacks, enemyParticle } = createNukeEngine();

      expect(engine.launchNuke(0)).toBe(false);
      expect(enemyParticle.alive).toBe(true);
      expect(callbacks.onNuke).not.toHaveBeenCalled();
    });

    it('launches after nuke research timer completes', () => {
      const { engine, callbacks } = createNukeEngine();

      expect(engine.buyNukeResearch(0)).toBe(true);
      engine.tick(CONFIG.NUKE_RESEARCH_DURATION_MS + 1000);
      expect(engine.launchNuke(0)).toBe(true);

      expect(callbacks.onNuke).toHaveBeenCalledWith(0, 1);
    });
  });

  describe('tower lifecycle', () => {
    function createTowerEngine(overrides: { cellEffects?: ICellEffectMap } = {}) {
      const cells = Array.from({ length: 8 }, () => Array(16).fill(true));
      cells[2][4] = false;
      cells[2][8] = false;
      cells[2][12] = false;
      cells[5][4] = false;
      cells[5][8] = false;
      cells[5][12] = false;
      const towerSites = [
        { id: 0, col: 4, row: 2 },
        { id: 1, col: 8, row: 2 },
        { id: 2, col: 12, row: 2 },
        { id: 3, col: 4, row: 5 },
        { id: 4, col: 8, row: 5 },
        { id: 5, col: 12, row: 5 },
      ];
      const callbacks = { ...noopCallbacks, onParticleSpawned: vi.fn(), onTowerPlaced: vi.fn() };
      const cellEffects = overrides.cellEffects ?? createMockCellEffectMap({ getOwnerAt: vi.fn((): 0 => 0) });
      const engine = new GameEngine(createMockGrid({ cells, towerSites }), callbacks, {
        createPlayer: (id) => createPlayer(id, { ...noSpawnConfig, startingGold: 9999 }),
        createParticle: () => createMockParticle({ alive: true }),
        createCellEffectMap: () => cellEffects,
      });
      engine.init(false);
      return { engine, callbacks };
    }

    /** Advance engine time past all research, construction, and upgrade timers. */
    function skipTimers(engine: GameEngine) {
      const ms = Math.max(
        ...Object.values(CONFIG.TOWER_RESEARCH_DURATION_MS),
        ...Object.values(CONFIG.TOWER_CONSTRUCTION_DURATION_MS),
        CONFIG.TOWER_UPGRADE_DURATION_MS,
        CONFIG.PARTICLE_UPGRADE_DURATION_MS,
      ) + 1000;
      engine.tick(ms);
    }

    it('buyResearch starts a timer and marks tower as researched after duration', () => {
      const { engine } = createTowerEngine();
      expect(engine.buyResearch(0, TOWER_TYPE.LASER)).toBe(true);
      expect(engine.players[0].hasResearched(TOWER_TYPE.LASER)).toBe(false); // timer still running
      engine.tick(CONFIG.TOWER_RESEARCH_DURATION_MS.laser + 1000);
      expect(engine.players[0].hasResearched(TOWER_TYPE.LASER)).toBe(true);
    });

    it('constructTower places tower at site after construction duration', () => {
      const { engine, callbacks } = createTowerEngine();
      engine.buyResearch(0, TOWER_TYPE.LASER);
      engine.tick(CONFIG.TOWER_RESEARCH_DURATION_MS.laser + 1000);
      const result = engine.constructTower(0, TOWER_TYPE.LASER, 0);

      expect(result).toBe(true);
      expect(engine.towers[0]).toHaveLength(0); // pending, not placed yet
      engine.tick(CONFIG.TOWER_CONSTRUCTION_DURATION_MS.laser + 1000);
      expect(engine.carriers[0]).toBeNull();
      expect(engine.towers[0]).toHaveLength(1);
      expect(engine.towers[0][0].typeName).toBe('laserTower');
      expect(engine.towers[0][0].x).toBe(4.5 * 32);
      expect(engine.towers[0][0].y).toBe(2.5 * 32);
      expect(callbacks.onParticleSpawned).toHaveBeenCalled();
      expect(callbacks.onTowerPlaced).toHaveBeenCalled();
    });

    it('constructTower fails when not researched', () => {
      const { engine } = createTowerEngine();
      expect(engine.constructTower(0, TOWER_TYPE.LASER, 0)).toBe(false);
    });

    it('constructTower fails when tower cap reached (counts pending)', () => {
      const { engine } = createTowerEngine();
      engine.buyResearch(0, TOWER_TYPE.LASER);
      engine.tick(CONFIG.TOWER_RESEARCH_DURATION_MS.laser + 1000);
      for (let i = 0; i < CONFIG.TOWER_MAX_PER_PLAYER; i++) {
        engine.constructTower(0, TOWER_TYPE.LASER, i);
      }
      expect(engine.constructTower(0, TOWER_TYPE.LASER, 5)).toBe(false);
    });

    it('constructTower fails when adjacent open cells are not all owned', () => {
      const cellEffects = createMockCellEffectMap({ getOwnerAt: vi.fn((): 1 => 1) });
      const { engine } = createTowerEngine({ cellEffects });
      engine.buyResearch(0, TOWER_TYPE.LASER);
      engine.tick(CONFIG.TOWER_RESEARCH_DURATION_MS.laser + 1000);

      expect(engine.constructTower(0, TOWER_TYPE.LASER, 0)).toBe(false);
      expect(engine.towers[0]).toHaveLength(0);
    });

    it('constructTower fails when the selected site is pending or occupied', () => {
      const { engine } = createTowerEngine();
      engine.buyResearch(0, TOWER_TYPE.LASER);
      engine.buyResearch(1, 'laser');
      skipTimers(engine); // complete both research timers
      expect(engine.constructTower(0, TOWER_TYPE.LASER, 0)).toBe(true);  // reserves site 0
      expect(engine.constructTower(1, 'laser', 0)).toBe(false); // site 0 pending
    });

    it('constructTower creates weakness tower at selected site', () => {
      const { engine } = createTowerEngine();
      engine.buyResearch(0, TOWER_TYPE.WEAKNESS);
      skipTimers(engine);
      engine.constructTower(0, TOWER_TYPE.WEAKNESS, 1);
      skipTimers(engine);

      expect(engine.towers[0][0].typeName).toBe(WeaknessTowerParticle.TYPE_NAME);
    });

    it('upgradeTower deducts gold and increases level after duration', () => {
      const { engine } = createTowerEngine();
      engine.buyResearch(0, TOWER_TYPE.LASER);
      skipTimers(engine);
      engine.constructTower(0, TOWER_TYPE.LASER, 0);
      skipTimers(engine);

      const goldBefore = engine.players[0].gold;
      const result = engine.upgradeTower(0, 0);

      expect(result).toBe(true);
      expect(engine.players[0].gold).toBeLessThan(goldBefore); // gold deducted immediately
      expect(engine.towers[0][0].level).toBe(0); // not yet applied
      engine.tick(CONFIG.TOWER_UPGRADE_DURATION_MS + 1000);
      expect(engine.towers[0][0].level).toBe(1); // applied after duration
    });

    it('upgradeTower returns false while a previous upgrade is still pending', () => {
      const { engine } = createTowerEngine();
      engine.buyResearch(0, TOWER_TYPE.LASER);
      skipTimers(engine);
      engine.constructTower(0, TOWER_TYPE.LASER, 0);
      skipTimers(engine);

      expect(engine.upgradeTower(0, 0)).toBe(true);
      expect(engine.upgradeTower(0, 0)).toBe(false); // pending, rejected
    });

    it('upgradeTower fails when cannot afford', () => {
      const { engine } = createTowerEngine();
      engine.buyResearch(0, TOWER_TYPE.LASER);
      skipTimers(engine);
      engine.constructTower(0, TOWER_TYPE.LASER, 0);
      skipTimers(engine);
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
      engine.buyResearch(0, TOWER_TYPE.LASER);
      skipTimers(engine);
      engine.constructTower(0, TOWER_TYPE.LASER, 0);
      skipTimers(engine);

      expect(engine.towers[0]).toHaveLength(1);

      engine.towers[0][0].alive = false;
      engine.tick(16);

      expect(engine.towers[0]).toHaveLength(0);
    });

    it('resetTowerSlowFactors resets to 1 each tick', () => {
      const { engine } = createTowerEngine();
      const mockP = createMockParticle({ alive: true, towerSlowFactor: 0.5 });
      engine.particles.push(mockP);

      engine.tick(16);

      expect(mockP.towerSlowFactor).toBe(1);
    });
  });

  describe('spawner towers', () => {
    const spawnerSlots = [
      { playerId: 0 as const, col: 2, row: 2 },
      { playerId: 0 as const, col: 2, row: 4 },
      { playerId: 0 as const, col: 2, row: 6 },
      { playerId: 1 as const, col: 13, row: 2 },
      { playerId: 1 as const, col: 13, row: 4 },
      { playerId: 1 as const, col: 13, row: 6 },
    ];

    function createSpawnerEngine() {
      const callbacks = { ...noopCallbacks, onParticleSpawned: vi.fn() };
      const engine = new GameEngine(
        createMockGrid({ spawnerSlots }),
        callbacks,
        { createPlayer: (id) => createPlayer(id, { ...noSpawnConfig, startingGold: 100 }) },
      );
      engine.init(false);
      return { engine, callbacks };
    }

    it('creates 3 spawner towers per player after init', () => {
      const { engine } = createSpawnerEngine();
      expect(engine.spawnerTowers[0]).toHaveLength(3);
      expect(engine.spawnerTowers[1]).toHaveLength(3);
    });

    it('spawner towers are positioned at slot pixel centers', () => {
      const { engine } = createSpawnerEngine();
      expect(engine.spawnerTowers[0][0].x).toBe((2 + 0.5) * 32);
      expect(engine.spawnerTowers[0][0].y).toBe((2 + 0.5) * 32);
    });

    it('spawner towers are added to particles', () => {
      const { engine, callbacks } = createSpawnerEngine();
      expect(engine.particles.filter(p => p.typeName === ParticleSpawnerTower.TYPE_NAME)).toHaveLength(6);
      expect(callbacks.onParticleSpawned).toHaveBeenCalledTimes(6);
    });

    it('spawnParticle uses a spawner tower position', () => {
      const spawnedPositions: Array<{ x: number; y: number }> = [];
      const engine = new GameEngine(
        createMockGrid({ spawnerSlots }),
        { ...noopCallbacks, onParticleSpawned: vi.fn() },
        {
          createPlayer: (id) => createPlayer(id, { ...noSpawnConfig, maxParticlesPerPlayer: 10, startingGold: 100 }),
          createParticle: (x, y) => {
            spawnedPositions.push({ x, y });
            return createMockParticle({ alive: true, owner: 0 });
          },
        },
      );
      engine.init(false);
      spawnedPositions.length = 0;

      engine.spawnParticle(0);

      expect(spawnedPositions).toHaveLength(1);
      const spawnerXs = spawnerSlots.filter(s => s.playerId === 0).map(s => (s.col + 0.5) * 32);
      const spawnerYs = spawnerSlots.filter(s => s.playerId === 0).map(s => (s.row + 0.5) * 32);
      expect(spawnerXs).toContain(spawnedPositions[0].x);
      expect(spawnerYs).toContain(spawnedPositions[0].y);
    });

    it('spawnParticle falls back to random base when spawner array is empty', () => {
      vi.spyOn(Math, 'random').mockReturnValue(0.5);
      const spawnedPositions: Array<{ x: number; y: number }> = [];
      const engine = new GameEngine(
        createMockGrid(),
        { ...noopCallbacks, onParticleSpawned: vi.fn() },
        {
          createPlayer: (id) => createPlayer(id, { ...noSpawnConfig, maxParticlesPerPlayer: 10, startingGold: 100 }),
          createParticle: (x, y) => {
            spawnedPositions.push({ x, y });
            return createMockParticle({ alive: true, owner: 0 });
          },
        },
      );
      engine.init(false);
      spawnedPositions.length = 0;

      engine.spawnParticle(0);

      expect(spawnedPositions).toHaveLength(1);
      vi.restoreAllMocks();
    });

    it('launchNuke does not kill spawner towers', () => {
      const { engine } = createSpawnerEngine();
      engine.buyNukeResearch(0);
      engine.tick(CONFIG.NUCLEAR_FIRST_AVAILABLE_MS + 1);

      engine.launchNuke(0);

      expect(engine.spawnerTowers[1].every(t => t.alive)).toBe(true);
    });
  });
});
