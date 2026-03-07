import { describe, it, expect } from 'vitest';
import { runBatch } from './BatchRunner';

describe(runBatch.name, () => {
  const fastBatchConfig = {
    games: 3,
    gridType: 'random' as const,
    tickMs: 100,
    maxGameTimeSec: 30,
  };

  it('runs the requested number of games', () => {
    const report = runBatch(fastBatchConfig);

    expect(report.gamesPlayed).toBe(3);
    expect(report.results).toHaveLength(3);
  });

  it('win counts add up to total games', () => {
    const report = runBatch(fastBatchConfig);

    expect(report.p0Wins + report.p1Wins + report.draws).toBe(report.gamesPlayed);
  });

  it('computes duration stats', () => {
    const report = runBatch(fastBatchConfig);

    expect(report.durationStats.min).toBeLessThanOrEqual(report.durationStats.max);
    expect(report.durationStats.mean).toBeGreaterThanOrEqual(report.durationStats.min);
    expect(report.durationStats.mean).toBeLessThanOrEqual(report.durationStats.max);
    expect(report.durationStats.median).toBeGreaterThanOrEqual(report.durationStats.min);
    expect(report.durationStats.median).toBeLessThanOrEqual(report.durationStats.max);
  });

  it('invokes onGameComplete callback', () => {
    const completed: number[] = [];

    runBatch({
      ...fastBatchConfig,
      onGameComplete: (i) => completed.push(i),
    });

    expect(completed).toEqual([0, 1, 2]);
  });

  it('each result has valid player summaries', () => {
    const report = runBatch(fastBatchConfig);

    for (const result of report.results) {
      expect(result.players[0].id).toBe(0);
      expect(result.players[1].id).toBe(1);
      expect(result.players[0].finalHP).toBeGreaterThanOrEqual(0);
      expect(result.players[1].finalHP).toBeGreaterThanOrEqual(0);
    }
  });
});
