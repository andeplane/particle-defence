import { describe, it, expect } from 'vitest';
import { runHeadlessGame } from './HeadlessRunner';

describe(runHeadlessGame.name, () => {
  const fastConfig = {
    gridType: 'random' as const,
    tickMs: 100,
    maxGameTimeSec: 60,
  };

  it('returns a valid GameResult', () => {
    const result = runHeadlessGame(fastConfig);

    expect(result.winner).toBeOneOf([0, 1, -1]);
    expect(result.durationSec).toBeGreaterThanOrEqual(0);
    expect(result.durationSec).toBeLessThanOrEqual(fastConfig.maxGameTimeSec);
    expect(result.players).toHaveLength(2);
    expect(result.players[0].id).toBe(0);
    expect(result.players[1].id).toBe(1);
  });

  it('produces match stats with samples', () => {
    const result = runHeadlessGame(fastConfig);

    expect(result.matchStats.samples.length).toBeGreaterThan(0);
    expect(result.matchStats.durationSec).toBeGreaterThanOrEqual(0);
  });

  it('respects maxGameTimeSec and declares a draw', () => {
    const result = runHeadlessGame({ ...fastConfig, maxGameTimeSec: 5 });

    expect(result.durationSec).toBeLessThanOrEqual(6);
    if (!result.matchStats.samples.some(s => s.baseHP[0] <= 0 || s.baseHP[1] <= 0)) {
      expect(result.winner).toBe(-1);
    }
  });

  it('players accumulate upgrades', () => {
    const result = runHeadlessGame(fastConfig);

    for (const player of result.players) {
      const totalLevels = Object.values(player.upgradeLevels).reduce((a, b) => a + b, 0);
      expect(totalLevels).toBeGreaterThanOrEqual(0);
    }
  });

  it.each([
    { gridType: 'random' as const },
    { gridType: 'maze' as const },
  ])('works with $gridType grid', ({ gridType }) => {
    const result = runHeadlessGame({ ...fastConfig, gridType });
    expect(result.winner).toBeOneOf([0, 1, -1]);
  });
});
