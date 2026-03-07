import type { AIProfile } from '../ai';
import type { GridType } from '../grid/generators';
import { runBatch, type BatchConfig } from '../headless/BatchRunner';

export interface MatchupResult {
  readonly p0Profile: string;
  readonly p1Profile: string;
  readonly p0WinRate: number;
  readonly p1WinRate: number;
  readonly drawRate: number;
  readonly avgDurationSec: number;
  readonly gamesPlayed: number;
}

export interface TournamentResult {
  readonly profiles: readonly string[];
  readonly matchups: readonly MatchupResult[];
  /** Win rate matrix: winMatrix[i][j] = profile i's win rate against profile j */
  readonly winMatrix: readonly (readonly number[])[];
  /** Overall win rate for each profile (average across all opponents) */
  readonly overallWinRates: readonly { profile: string; winRate: number }[];
}

export interface TournamentConfig {
  readonly gamesPerMatchup: number;
  readonly gridType: GridType;
  readonly tickMs: number;
  readonly maxGameTimeSec: number;
  readonly onMatchupStart?: (p0Name: string, p1Name: string) => void;
  readonly onGameComplete?: (p0Name: string, p1Name: string, gameIndex: number) => void;
}

const defaultTournamentConfig: TournamentConfig = {
  gamesPerMatchup: 30,
  gridType: 'random',
  tickMs: 1000,
  maxGameTimeSec: 30 * 60,
};

export function runTournament(
  profiles: readonly AIProfile[],
  configOverrides?: Partial<TournamentConfig>,
): TournamentResult {
  const cfg = configOverrides
    ? { ...defaultTournamentConfig, ...configOverrides }
    : defaultTournamentConfig;

  const names = profiles.map(p => p.name);
  const matchups: MatchupResult[] = [];
  const winMatrix: number[][] = names.map(() => names.map(() => 0));

  for (let i = 0; i < profiles.length; i++) {
    for (let j = i + 1; j < profiles.length; j++) {
      cfg.onMatchupStart?.(names[i], names[j]);

      const batchCfg: Partial<BatchConfig> = {
        games: cfg.gamesPerMatchup,
        gridType: cfg.gridType,
        tickMs: cfg.tickMs,
        maxGameTimeSec: cfg.maxGameTimeSec,
        p0Profile: profiles[i],
        p1Profile: profiles[j],
        onGameComplete: cfg.onGameComplete
          ? (idx) => cfg.onGameComplete!(names[i], names[j], idx)
          : undefined,
      };

      const report = runBatch(batchCfg);
      const g = report.gamesPlayed;

      const result: MatchupResult = {
        p0Profile: names[i],
        p1Profile: names[j],
        p0WinRate: g > 0 ? report.p0Wins / g : 0,
        p1WinRate: g > 0 ? report.p1Wins / g : 0,
        drawRate: g > 0 ? report.draws / g : 0,
        avgDurationSec: report.durationStats.mean,
        gamesPlayed: g,
      };

      matchups.push(result);
      winMatrix[i][j] = result.p0WinRate;
      winMatrix[j][i] = result.p1WinRate;
    }
  }

  const overallWinRates = names.map((name, i) => {
    const rates = winMatrix[i].filter((_, j) => j !== i);
    const avg = rates.length > 0 ? rates.reduce((a, b) => a + b, 0) / rates.length : 0;
    return { profile: name, winRate: avg };
  });

  overallWinRates.sort((a, b) => b.winRate - a.winRate);

  return {
    profiles: names,
    matchups,
    winMatrix,
    overallWinRates,
  };
}
