import type { UpgradeType } from '../config';
import type { GridType } from '../grid/generators';
import type { MatchStats } from '../stats/types';

export interface PlayerSummary {
  readonly id: 0 | 1;
  readonly finalHP: number;
  readonly finalGold: number;
  readonly kills: number;
  readonly upgradeLevels: Record<UpgradeType, number>;
  readonly towerCount: number;
}

export interface GameResult {
  readonly winner: 0 | 1 | -1;
  readonly durationSec: number;
  readonly players: readonly [PlayerSummary, PlayerSummary];
  readonly matchStats: MatchStats;
}

export interface HeadlessRunConfig {
  readonly gridType: GridType;
  readonly tickMs: number;
  readonly maxGameTimeSec: number;
}

export interface BatchReport {
  readonly gamesPlayed: number;
  readonly p0Wins: number;
  readonly p1Wins: number;
  readonly draws: number;
  readonly durationStats: {
    readonly min: number;
    readonly max: number;
    readonly mean: number;
    readonly median: number;
  };
  readonly results: readonly GameResult[];
}
