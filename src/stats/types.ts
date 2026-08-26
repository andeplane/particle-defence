import type { UpgradeType } from '../config';

export type PerPlayer<T> = readonly [T, T];

export interface PerSecondSample {
  readonly timeSec: number;

  readonly aliveUnits: PerPlayer<number>;
  readonly powerCurve: PerPlayer<number>;
  readonly killsThisSecond: PerPlayer<number>;
  readonly baseHP: PerPlayer<number>;

  readonly goldIncome: PerPlayer<number>;
  readonly goldSpent: PerPlayer<number>;
  readonly goldBanked: PerPlayer<number>;

  readonly upgradeLevels: PerPlayer<Record<UpgradeType, number>>;
  /** Research level per node id (unlocks are 0/1, paths are 0..maxLevel). See ResearchRegistry.allNodes(). */
  readonly researchLevels: PerPlayer<Readonly<Record<string, number>>>;

  readonly capPressure: PerPlayer<number>;

  readonly unitDamageDealt: PerPlayer<number>;
  readonly baseDamageDealt: PerPlayer<number>;

  readonly frontlineXCell: PerPlayer<number | null>;

  readonly towerCount: PerPlayer<number>;
  readonly towerKillsCumulative: PerPlayer<number>;

  readonly territoryCells: PerPlayer<number>;

  readonly totalGoldProduced: PerPlayer<number>;
}

export interface MatchEvent {
  readonly timeSec: number;
  readonly player: 0 | 1;
  readonly type: 'upgrade' | 'nuke' | 'towerPlaced';
  readonly detail: string;
}

export interface MatchStats {
  readonly samples: PerSecondSample[];
  readonly events: MatchEvent[];
  readonly durationSec: number;
  readonly winner: 0 | 1;
  readonly strategyAffinities: PerPlayer<Record<string, number>>;
}
