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

  readonly capPressure: PerPlayer<number>;

  readonly unitDamageDealt: PerPlayer<number>;
  readonly baseDamageDealt: PerPlayer<number>;

  readonly frontlineXCell: PerPlayer<number | null>;
}

export interface MatchEvent {
  readonly timeSec: number;
  readonly player: 0 | 1;
  readonly type: 'upgrade' | 'nuke';
  readonly detail: string;
}

export interface MatchStats {
  readonly samples: PerSecondSample[];
  readonly events: MatchEvent[];
  readonly durationSec: number;
  readonly winner: 0 | 1;
}
