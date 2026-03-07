import type { AIProfile } from '../ai';
import type { GridType } from '../grid/generators';
import { runHeadlessGame } from './HeadlessRunner';
import type { BatchReport, GameResult, HeadlessRunConfig } from './types';

export interface BatchConfig {
  readonly games: number;
  readonly gridType: GridType;
  readonly tickMs: number;
  readonly maxGameTimeSec: number;
  readonly p0Profile?: AIProfile;
  readonly p1Profile?: AIProfile;
  readonly onGameComplete?: (index: number, result: GameResult) => void;
}

const defaultBatchConfig: BatchConfig = {
  games: 100,
  gridType: 'random',
  tickMs: 1000,
  maxGameTimeSec: 30 * 60,
};

export function runBatch(configOverrides?: Partial<BatchConfig>): BatchReport {
  const config = configOverrides ? { ...defaultBatchConfig, ...configOverrides } : defaultBatchConfig;

  const runConfig: HeadlessRunConfig = {
    gridType: config.gridType,
    tickMs: config.tickMs,
    maxGameTimeSec: config.maxGameTimeSec,
    p0Profile: config.p0Profile,
    p1Profile: config.p1Profile,
  };

  const results: GameResult[] = [];
  let p0Wins = 0;
  let p1Wins = 0;
  let draws = 0;

  for (let i = 0; i < config.games; i++) {
    const result = runHeadlessGame(runConfig);
    results.push(result);

    if (result.winner === 0) p0Wins++;
    else if (result.winner === 1) p1Wins++;
    else draws++;

    config.onGameComplete?.(i, result);
  }

  const durations = results.map(r => r.durationSec).sort((a, b) => a - b);

  return {
    gamesPlayed: config.games,
    p0Wins,
    p1Wins,
    draws,
    durationStats: {
      min: durations[0],
      max: durations[durations.length - 1],
      mean: Math.round(durations.reduce((a, b) => a + b, 0) / durations.length),
      median: durations[Math.floor(durations.length / 2)],
    },
    results,
  };
}
