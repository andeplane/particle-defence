import type { AIProfile } from '../ai';
import type { GridType } from '../grid/generators';
import { runBatch } from '../headless/BatchRunner';

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
  /** Run each matchup with sides swapped to eliminate positional bias (default: true) */
  readonly sideSwap: boolean;
  readonly onMatchupStart?: (p0Name: string, p1Name: string) => void;
  readonly onGameComplete?: (p0Name: string, p1Name: string, gameIndex: number) => void;
}

const defaultTournamentConfig: TournamentConfig = {
  gamesPerMatchup: 30,
  gridType: 'random',
  tickMs: 500,
  maxGameTimeSec: 20 * 60,
  sideSwap: true,
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

      const gamesNormal = cfg.sideSwap
        ? Math.ceil(cfg.gamesPerMatchup / 2)
        : cfg.gamesPerMatchup;
      const gamesSwapped = cfg.sideSwap
        ? cfg.gamesPerMatchup - gamesNormal
        : 0;

      const normalReport = runBatch({
        games: gamesNormal,
        gridType: cfg.gridType,
        tickMs: cfg.tickMs,
        maxGameTimeSec: cfg.maxGameTimeSec,
        p0Profile: profiles[i],
        p1Profile: profiles[j],
        onGameComplete: cfg.onGameComplete
          ? (idx) => cfg.onGameComplete!(names[i], names[j], idx)
          : undefined,
      });

      let iWins = normalReport.p0Wins;
      let jWins = normalReport.p1Wins;
      let draws = normalReport.draws;
      let totalDuration = normalReport.durationStats.mean * normalReport.gamesPlayed;
      let totalGames = normalReport.gamesPlayed;

      if (gamesSwapped > 0) {
        const swappedReport = runBatch({
          games: gamesSwapped,
          gridType: cfg.gridType,
          tickMs: cfg.tickMs,
          maxGameTimeSec: cfg.maxGameTimeSec,
          p0Profile: profiles[j],
          p1Profile: profiles[i],
          onGameComplete: cfg.onGameComplete
            ? (idx) => cfg.onGameComplete!(names[i], names[j], gamesNormal + idx)
            : undefined,
        });
        iWins += swappedReport.p1Wins;
        jWins += swappedReport.p0Wins;
        draws += swappedReport.draws;
        totalDuration += swappedReport.durationStats.mean * swappedReport.gamesPlayed;
        totalGames += swappedReport.gamesPlayed;
      }

      const result: MatchupResult = {
        p0Profile: names[i],
        p1Profile: names[j],
        p0WinRate: totalGames > 0 ? iWins / totalGames : 0,
        p1WinRate: totalGames > 0 ? jWins / totalGames : 0,
        drawRate: totalGames > 0 ? draws / totalGames : 0,
        avgDurationSec: totalGames > 0 ? Math.round(totalDuration / totalGames) : 0,
        gamesPlayed: totalGames,
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
