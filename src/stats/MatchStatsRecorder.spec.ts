import { describe, it, expect, beforeEach } from 'vitest';
import { MatchStatsRecorder } from './MatchStatsRecorder';
import type { IParticle } from '../particles';
import type { IPlayer } from '../player';
import type { PerSecondSample } from './types';

describe(MatchStatsRecorder.name, () => {
  const CELL_W = 32;
  let recorder: MatchStatsRecorder;

  beforeEach(() => {
    recorder = new MatchStatsRecorder({ cellW: CELL_W, frontlineTopN: 3 });
  });

  describe('1Hz sampling', () => {
    it('produces no samples before 1 second has elapsed', () => {
      recorder.tick(500, [], createPlayers());
      const stats = recorder.finalize(0);
      expect(stats.samples).toHaveLength(0);
    });

    it('produces exactly one sample at the 1-second boundary', () => {
      recorder.tick(1000, [], createPlayers());
      const stats = recorder.finalize(0);
      expect(stats.samples).toHaveLength(1);
      expect(stats.samples[0].timeSec).toBe(1);
    });

    it.each([
      { deltaMs: 3500, expectedSamples: 3 },
      { deltaMs: 1000, expectedSamples: 1 },
      { deltaMs: 10000, expectedSamples: 10 },
    ])('produces $expectedSamples samples after $deltaMs ms in a single tick', ({ deltaMs, expectedSamples }) => {
      recorder.tick(deltaMs, [], createPlayers());
      const stats = recorder.finalize(0);
      expect(stats.samples.length).toBe(expectedSamples);
    });

    it('produces samples for each second with many small ticks', () => {
      const players = createPlayers();
      for (let i = 0; i < 100; i++) {
        recorder.tick(50, [], players);
      }
      const stats = recorder.finalize(0);
      expect(stats.samples.length).toBe(5);
      expect(stats.samples.map(s => s.timeSec)).toEqual([1, 2, 3, 4, 5]);
    });
  });

  describe('alive units and power curve', () => {
    it('counts alive units per player', () => {
      const particles = [
        createParticle(0, 100, 50),
        createParticle(0, 200, 50),
        createParticle(1, 300, 50),
      ];

      recorder.tick(1000, particles, createPlayers());
      const s = recorder.finalize(0).samples[0];

      expect(s.aliveUnits).toEqual([2, 1]);
    });

    it('excludes dead particles', () => {
      const dead = createParticle(0, 100, 50);
      dead.alive = false;

      recorder.tick(1000, [dead, createParticle(1, 200, 50)], createPlayers());
      const s = recorder.finalize(0).samples[0];

      expect(s.aliveUnits).toEqual([0, 1]);
    });
  });

  describe('computePower', () => {
    it.each([
      {
        desc: 'single unit with known stats',
        units: [createParticle(0, 0, 0, { health: 10, attack: 5, speed: 100, radius: 4 })],
        expected: 10 * 0.6 + 5 * 1.2 + 100 * 0.4 + 4 * 0.2,
      },
      { desc: 'empty array', units: [], expected: 0 },
      {
        desc: 'multiple units sum',
        units: [
          createParticle(0, 0, 0, { health: 2, attack: 1, speed: 10, radius: 1 }),
          createParticle(0, 0, 0, { health: 2, attack: 1, speed: 10, radius: 1 }),
        ],
        expected: 2 * (2 * 0.6 + 1 * 1.2 + 10 * 0.4 + 1 * 0.2),
      },
    ])('$desc', ({ units, expected }) => {
      expect(MatchStatsRecorder.computePower(units)).toBeCloseTo(expected, 1);
    });
  });

  describe('delta accumulation (kills, gold, damage)', () => {
    it('aggregates kills and gold into the current second', () => {
      recorder.recordKill(0);
      recorder.recordKill(0);
      recorder.recordKill(1);
      recorder.recordGoldIncome(0, 3);
      recorder.recordGoldSpent(1, 7);
      recorder.recordUnitDamage(0, 10);
      recorder.recordBaseDamage(1, 5);

      recorder.tick(1000, [], createPlayers());
      const s = recorder.finalize(0).samples[0];

      expect(s.killsThisSecond).toEqual([2, 1]);
      expect(s.goldIncome).toEqual([3, 0]);
      expect(s.goldSpent).toEqual([0, 7]);
      expect(s.unitDamageDealt).toEqual([10, 0]);
      expect(s.baseDamageDealt).toEqual([0, 5]);
    });

    it('resets deltas after each sample', () => {
      recorder.recordKill(0);
      recorder.tick(1000, [], createPlayers());

      recorder.tick(1000, [], createPlayers());
      const s = recorder.finalize(0).samples[1];

      expect(s.killsThisSecond).toEqual([0, 0]);
    });
  });

  describe('base HP and gold snapshots', () => {
    it('snapshots base HP and gold from players', () => {
      const players = createPlayers({ p1HP: 800, p2HP: 600, p1Gold: 20, p2Gold: 35 });
      recorder.tick(1000, [], players);
      const s = recorder.finalize(0).samples[0];

      expect(s.baseHP).toEqual([800, 600]);
      expect(s.goldBanked).toEqual([20, 35]);
    });
  });

  describe('cap pressure', () => {
    it.each([
      { alive: 50, max: 100, expected: 0.5 },
      { alive: 100, max: 100, expected: 1.0 },
      { alive: 0, max: 100, expected: 0.0 },
    ])('computes ratio $alive/$max = $expected', ({ alive, max, expected }) => {
      const particles = Array.from({ length: alive }, () => createParticle(0, 100, 50));
      const players = createPlayers({ p1MaxParticles: max });

      recorder.tick(1000, particles, players);
      const s = recorder.finalize(0).samples[0];

      expect(s.capPressure[0]).toBeCloseTo(expected);
    });
  });

  describe('upgrade level snapshots', () => {
    it('snapshots upgrade levels from players', () => {
      const players = createPlayers({ p1UpgradeLevels: { health: 3, attack: 1 } });
      recorder.tick(1000, [], players);
      const s = recorder.finalize(0).samples[0];

      expect(s.upgradeLevels[0].health).toBe(3);
      expect(s.upgradeLevels[0].attack).toBe(1);
      expect(s.upgradeLevels[0].radius).toBe(0);
    });
  });

  describe('frontline computation', () => {
    it.each([
      {
        desc: 'P1: takes mean of top-N rightmost particles in cell units',
        owner: 0 as const,
        xs: [320, 160, 480, 64, 96],
        topN: 3,
        expected: (480 + 320 + 160) / 3 / CELL_W,
      },
      {
        desc: 'P2: takes mean of top-N leftmost particles in cell units',
        owner: 1 as const,
        xs: [320, 160, 480, 64, 96],
        topN: 3,
        expected: (64 + 96 + 160) / 3 / CELL_W,
      },
      {
        desc: 'fewer particles than topN uses all',
        owner: 0 as const,
        xs: [100, 200],
        topN: 3,
        expected: (100 + 200) / 2 / CELL_W,
      },
    ])('$desc', ({ owner, xs, topN, expected }) => {
      const rec = new MatchStatsRecorder({ cellW: CELL_W, frontlineTopN: topN });
      const particles = xs.map(x => createParticle(owner, x, 50));
      const result = rec.computeFrontline(particles, owner);

      expect(result).toBeCloseTo(expected, 4);
    });

    it('returns null for empty particle list', () => {
      expect(recorder.computeFrontline([], 0)).toBeNull();
    });
  });

  describe('rolling KPM', () => {
    it('computes rolling kills per minute over a window', () => {
      const samples: PerSecondSample[] = Array.from({ length: 10 }, (_, i) =>
        createSample({ timeSec: i + 1, kills: [i < 5 ? 2 : 0, 1] }),
      );

      const kpm = MatchStatsRecorder.rollingKPM(samples, 5);

      expect(kpm[4][0]).toBeCloseTo(10 * 60 / 5, 0);
      expect(kpm[9][0]).toBe(0);
      expect(kpm[0][1]).toBeCloseTo(60 / 1, 0);
    });

    it('handles empty samples', () => {
      expect(MatchStatsRecorder.rollingKPM([], 30)).toEqual([]);
    });
  });

  describe('event recording', () => {
    it('records upgrade events', () => {
      recorder.tick(2500, [], createPlayers());
      recorder.recordUpgrade(0, 'health');
      const stats = recorder.finalize(0);

      expect(stats.events).toHaveLength(1);
      expect(stats.events[0]).toEqual({
        timeSec: 2,
        player: 0,
        type: 'upgrade',
        detail: 'health',
      });
    });

    it('records nuke events', () => {
      recorder.tick(5000, [], createPlayers());
      recorder.recordNuke(1, 42);
      const stats = recorder.finalize(0);

      expect(stats.events).toHaveLength(1);
      expect(stats.events[0]).toEqual({
        timeSec: 5,
        player: 1,
        type: 'nuke',
        detail: '42 kills',
      });
    });
  });

  describe('finalize', () => {
    it('returns complete MatchStats', () => {
      recorder.tick(3000, [], createPlayers());
      const stats = recorder.finalize(1);

      expect(stats.winner).toBe(1);
      expect(stats.durationSec).toBe(3);
      expect(stats.samples.length).toBe(3);
      expect(stats.events).toEqual([]);
    });
  });
});

function createParticle(
  owner: 0 | 1,
  x: number = 0,
  y: number = 0,
  overrides: Partial<Pick<IParticle, 'health' | 'maxHealth' | 'attack' | 'speed' | 'radius'>> = {},
): IParticle {
  return {
    id: Math.random(),
    x, y,
    vx: 0, vy: 0,
    health: overrides.health ?? 3,
    maxHealth: overrides.maxHealth ?? overrides.health ?? 3,
    attack: overrides.attack ?? 1,
    radius: overrides.radius ?? 3,
    speed: overrides.speed ?? 180,
    owner,
    alive: true,
    spawnX: x, spawnY: y,
    age: 0,
    typeName: 'test',
    canMove: true,
    sprite: null,
    trail: null,
    update() {},
    onCollide() {},
    onDeath() {},
    getBaseDamage: () => 1,
    isStuck: () => false,
    takeDamage() {},
    destroy() {},
  };
}

function createPlayers(overrides?: {
  p1HP?: number; p2HP?: number;
  p1Gold?: number; p2Gold?: number;
  p1MaxParticles?: number; p2MaxParticles?: number;
  p1UpgradeLevels?: Partial<Record<string, number>>;
}): [IPlayer, IPlayer] {
  const defaultUpgrades = { health: 0, attack: 0, radius: 0, spawnRate: 0, speed: 0, maxParticles: 0 };

  const makePlayer = (id: 0 | 1, hp: number, gold: number, maxP: number, upgrades: Record<string, number>): IPlayer => ({
    id,
    baseHP: hp,
    gold,
    kills: 0,
    particleHealth: 3 + (upgrades.health ?? 0),
    particleAttack: 1 + (upgrades.attack ?? 0),
    particleRadius: 3 + (upgrades.radius ?? 0),
    spawnInterval: 60,
    particleSpeed: 180,
    maxParticles: maxP,
    isAlive: hp > 0,
    getUpgradeLevel: (type) => upgrades[type] ?? 0,
    getUpgradeCost: () => 5,
    canAfford: () => true,
    buyUpgrade: () => true,
    canUseNuke: () => false,
    useNuke: () => {},
    getNukeCooldownRemainingMs: () => 0,
    takeDamage: () => {},
  });

  const p1Upgrades = { ...defaultUpgrades, ...(overrides?.p1UpgradeLevels ?? {}) };

  return [
    makePlayer(0, overrides?.p1HP ?? 1000, overrides?.p1Gold ?? 10, overrides?.p1MaxParticles ?? 100, p1Upgrades),
    makePlayer(1, overrides?.p2HP ?? 1000, overrides?.p2Gold ?? 10, overrides?.p2MaxParticles ?? 100, defaultUpgrades),
  ];
}

function createSample(overrides: {
  timeSec: number;
  kills?: [number, number];
}): PerSecondSample {
  return {
    timeSec: overrides.timeSec,
    aliveUnits: [0, 0],
    powerCurve: [0, 0],
    killsThisSecond: overrides.kills ?? [0, 0],
    baseHP: [1000, 1000],
    goldIncome: [0, 0],
    goldSpent: [0, 0],
    goldBanked: [0, 0],
    upgradeLevels: [
      { health: 0, attack: 0, radius: 0, spawnRate: 0, speed: 0, maxParticles: 0 },
      { health: 0, attack: 0, radius: 0, spawnRate: 0, speed: 0, maxParticles: 0 },
    ],
    capPressure: [0, 0],
    unitDamageDealt: [0, 0],
    baseDamageDealt: [0, 0],
    frontlineXCell: [null, null],
  };
}
