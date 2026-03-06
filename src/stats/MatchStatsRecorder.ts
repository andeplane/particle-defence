import type { UpgradeType } from '../config';
import type { IParticle } from '../particles';
import type { IPlayer } from '../player';
import type { MatchEvent, MatchStats, PerPlayer, PerSecondSample } from './types';

export interface MatchStatsRecorderDependencies {
  cellW: number;
  frontlineTopN: number;
}

const defaultDeps: MatchStatsRecorderDependencies = {
  cellW: 32,
  frontlineTopN: 20,
};

type MutablePerPlayer<T> = [T, T];

interface DeltaAccumulator {
  kills: MutablePerPlayer<number>;
  goldIncome: MutablePerPlayer<number>;
  goldSpent: MutablePerPlayer<number>;
  unitDamageDealt: MutablePerPlayer<number>;
  baseDamageDealt: MutablePerPlayer<number>;
}

export class MatchStatsRecorder {
  private readonly samples: PerSecondSample[] = [];
  private readonly events: MatchEvent[] = [];
  private readonly deps: MatchStatsRecorderDependencies;
  private elapsedMs: number = 0;
  private lastSampleSec: number = 0;

  private deltas: DeltaAccumulator = MatchStatsRecorder.freshDeltas();

  constructor(deps?: Partial<MatchStatsRecorderDependencies>) {
    this.deps = deps ? { ...defaultDeps, ...deps } : defaultDeps;
  }

  recordKill(killer: 0 | 1): void {
    this.deltas.kills[killer]++;
  }

  recordGoldIncome(player: 0 | 1, amount: number): void {
    this.deltas.goldIncome[player] += amount;
  }

  recordGoldSpent(player: 0 | 1, amount: number): void {
    this.deltas.goldSpent[player] += amount;
  }

  recordUnitDamage(attacker: 0 | 1, amount: number): void {
    this.deltas.unitDamageDealt[attacker] += amount;
  }

  recordBaseDamage(attacker: 0 | 1, amount: number): void {
    this.deltas.baseDamageDealt[attacker] += amount;
  }

  recordUpgrade(player: 0 | 1, type: UpgradeType): void {
    this.events.push({
      timeSec: Math.floor(this.elapsedMs / 1000),
      player,
      type: 'upgrade',
      detail: type,
    });
  }

  recordNuke(player: 0 | 1, killCount: number): void {
    this.events.push({
      timeSec: Math.floor(this.elapsedMs / 1000),
      player,
      type: 'nuke',
      detail: `${killCount} kills`,
    });
  }

  tick(
    deltaMs: number,
    particles: readonly IParticle[],
    players: readonly [IPlayer, IPlayer],
  ): void {
    this.elapsedMs += deltaMs;
    const currentSec = Math.floor(this.elapsedMs / 1000);

    while (currentSec > this.lastSampleSec) {
      this.lastSampleSec++;
      this.takeSample(this.lastSampleSec, particles, players);
      this.deltas = MatchStatsRecorder.freshDeltas();
    }
  }

  finalize(winner: 0 | 1): MatchStats {
    return {
      samples: [...this.samples],
      events: [...this.events],
      durationSec: Math.floor(this.elapsedMs / 1000),
      winner,
    };
  }

  private takeSample(
    timeSec: number,
    particles: readonly IParticle[],
    players: readonly [IPlayer, IPlayer],
  ): void {
    const alive: MutablePerPlayer<IParticle[]> = [[], []];
    for (const p of particles) {
      if (p.alive) alive[p.owner].push(p);
    }

    const aliveUnits: PerPlayer<number> = [alive[0].length, alive[1].length];

    const powerCurve: PerPlayer<number> = [
      MatchStatsRecorder.computePower(alive[0]),
      MatchStatsRecorder.computePower(alive[1]),
    ];

    const capPressure: PerPlayer<number> = [
      players[0].maxParticles > 0 ? alive[0].length / players[0].maxParticles : 0,
      players[1].maxParticles > 0 ? alive[1].length / players[1].maxParticles : 0,
    ];

    const frontlineXCell: PerPlayer<number | null> = [
      this.computeFrontline(alive[0], 0),
      this.computeFrontline(alive[1], 1),
    ];

    const upgradeLevels: PerPlayer<Record<UpgradeType, number>> = [
      MatchStatsRecorder.snapshotUpgrades(players[0]),
      MatchStatsRecorder.snapshotUpgrades(players[1]),
    ];

    const sample: PerSecondSample = {
      timeSec,
      aliveUnits,
      powerCurve,
      killsThisSecond: [this.deltas.kills[0], this.deltas.kills[1]],
      baseHP: [players[0].baseHP, players[1].baseHP],
      goldIncome: [this.deltas.goldIncome[0], this.deltas.goldIncome[1]],
      goldSpent: [this.deltas.goldSpent[0], this.deltas.goldSpent[1]],
      goldBanked: [players[0].gold, players[1].gold],
      upgradeLevels,
      capPressure,
      unitDamageDealt: [this.deltas.unitDamageDealt[0], this.deltas.unitDamageDealt[1]],
      baseDamageDealt: [this.deltas.baseDamageDealt[0], this.deltas.baseDamageDealt[1]],
      frontlineXCell,
    };

    this.samples.push(sample);
  }

  computeFrontline(aliveUnits: readonly IParticle[], owner: 0 | 1): number | null {
    if (aliveUnits.length === 0) return null;

    const sorted = [...aliveUnits].sort((a, b) =>
      owner === 0 ? b.x - a.x : a.x - b.x,
    );

    const topN = sorted.slice(0, this.deps.frontlineTopN);
    const sumX = topN.reduce((acc, p) => acc + p.x, 0);
    return sumX / topN.length / this.deps.cellW;
  }

  static computePower(units: readonly IParticle[]): number {
    let total = 0;
    for (const u of units) {
      total += u.health * 0.6 + u.attack * 1.2 + u.speed * 0.4 + u.radius * 0.2;
    }
    return Math.round(total * 100) / 100;
  }

  static rollingKPM(samples: readonly PerSecondSample[], windowSec: number = 30): PerPlayer<number>[] {
    return samples.map((_, i, arr) => {
      const start = Math.max(0, i - windowSec + 1);
      let p1Kills = 0;
      let p2Kills = 0;
      for (let j = start; j <= i; j++) {
        p1Kills += arr[j].killsThisSecond[0];
        p2Kills += arr[j].killsThisSecond[1];
      }
      const windowLen = i - start + 1;
      const scale = 60 / windowLen;
      return [Math.round(p1Kills * scale * 10) / 10, Math.round(p2Kills * scale * 10) / 10] as PerPlayer<number>;
    });
  }

  private static freshDeltas(): DeltaAccumulator {
    return {
      kills: [0, 0],
      goldIncome: [0, 0],
      goldSpent: [0, 0],
      unitDamageDealt: [0, 0],
      baseDamageDealt: [0, 0],
    };
  }

  private static snapshotUpgrades(player: IPlayer): Record<UpgradeType, number> {
    return {
      health: player.getUpgradeLevel('health'),
      attack: player.getUpgradeLevel('attack'),
      radius: player.getUpgradeLevel('radius'),
      spawnRate: player.getUpgradeLevel('spawnRate'),
      speed: player.getUpgradeLevel('speed'),
      defense: player.getUpgradeLevel('defense'),
      maxParticles: player.getUpgradeLevel('maxParticles'),
      interestRate: player.getUpgradeLevel('interestRate'),
    };
  }
}
