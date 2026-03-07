import type { AIProfile } from '../ai';
import type { UpgradeType } from '../config';
import type { GridType } from '../grid/generators';
import { runBatch, type BatchConfig } from '../headless/BatchRunner';
import type { BatchReport } from '../headless/types';

export interface AblationResult {
  readonly feature: string;
  readonly baselineP0WinRate: number;
  readonly restrictedP0WinRate: number;
  readonly delta: number;
  readonly impact: 'critical' | 'high' | 'medium' | 'low' | 'minimal';
  readonly restricted: BatchReport;
  readonly avgDurationRestricted: number;
  /** When symmetric mode is used: win rate when BOTH players lose the feature */
  readonly symmetricP0WinRate?: number;
  readonly symmetricDelta?: number;
}

export interface AblationReport {
  readonly baseline: BatchReport;
  readonly baselineP0WinRate: number;
  readonly baselineAvgDuration: number;
  readonly baselineDurationRange: { min: number; max: number };
  readonly results: readonly AblationResult[];
}

export interface AblationConfig {
  readonly gamesPerTest: number;
  readonly gridType: GridType;
  readonly tickMs: number;
  readonly maxGameTimeSec: number;
  /** Also run symmetric tests (both players restricted) to separate AI gold-waste from balance issues */
  readonly symmetric: boolean;
  readonly onProgress?: (feature: string, phase: 'baseline' | 'restricted' | 'symmetric', gameIndex: number) => void;
}

const defaultAblationConfig: AblationConfig = {
  gamesPerTest: 50,
  gridType: 'random',
  tickMs: 500,
  maxGameTimeSec: 20 * 60,
  symmetric: true,
};

function winRate(report: BatchReport, player: 0 | 1): number {
  const wins = player === 0 ? report.p0Wins : report.p1Wins;
  return report.gamesPlayed > 0 ? wins / report.gamesPlayed : 0;
}

function classifyImpact(delta: number): AblationResult['impact'] {
  const abs = Math.abs(delta);
  if (abs >= 0.30) return 'critical';
  if (abs >= 0.20) return 'high';
  if (abs >= 0.10) return 'medium';
  if (abs >= 0.05) return 'low';
  return 'minimal';
}

const UPGRADE_FEATURES: UpgradeType[] = [
  'attack', 'health', 'spawnRate', 'speed', 'radius',
  'maxParticles', 'defense', 'interestRate',
];

function runRestricted(
  feature: string,
  profile: AIProfile,
  batchBase: Partial<BatchConfig>,
  baseP0: number,
  cfg: AblationConfig,
): AblationResult {
  const restricted = runBatch({
    ...batchBase,
    p0Profile: profile,
    onGameComplete: cfg.onProgress
      ? (i) => cfg.onProgress!(feature, 'restricted', i)
      : undefined,
  });
  const restP0 = winRate(restricted, 0);
  const delta = restP0 - baseP0;

  let symmetricP0WinRate: number | undefined;
  let symmetricDelta: number | undefined;

  if (cfg.symmetric) {
    const symmetricReport = runBatch({
      ...batchBase,
      p0Profile: profile,
      p1Profile: profile,
      onGameComplete: cfg.onProgress
        ? (i) => cfg.onProgress!(feature, 'symmetric', i)
        : undefined,
    });
    symmetricP0WinRate = winRate(symmetricReport, 0);
    symmetricDelta = symmetricP0WinRate - baseP0;
  }

  return {
    feature,
    baselineP0WinRate: baseP0,
    restrictedP0WinRate: restP0,
    delta,
    impact: classifyImpact(delta),
    restricted,
    avgDurationRestricted: restricted.durationStats.mean,
    symmetricP0WinRate,
    symmetricDelta,
  };
}

/**
 * Run ablation tests with a single shared baseline.
 * Negative delta = feature is important (P0 loses more without it).
 */
export function runAblation(configOverrides?: Partial<AblationConfig>): AblationReport {
  const cfg = configOverrides ? { ...defaultAblationConfig, ...configOverrides } : defaultAblationConfig;

  const batchBase: Partial<BatchConfig> = {
    games: cfg.gamesPerTest,
    gridType: cfg.gridType,
    tickMs: cfg.tickMs,
    maxGameTimeSec: cfg.maxGameTimeSec,
  };

  const baseline = runBatch({
    ...batchBase,
    onGameComplete: cfg.onProgress
      ? (i) => cfg.onProgress!('baseline', 'baseline', i)
      : undefined,
  });
  const baseP0 = winRate(baseline, 0);

  const results: AblationResult[] = [];

  for (const upgrade of UPGRADE_FEATURES) {
    const profile: AIProfile = {
      name: `No${upgrade}`,
      disabledUpgrades: new Set([upgrade]),
    };
    results.push(runRestricted(upgrade, profile, batchBase, baseP0, cfg));
  }

  results.push(runRestricted(
    'towers',
    { name: 'NoTowers', towersEnabled: false },
    batchBase, baseP0, cfg,
  ));

  results.push(runRestricted(
    'nuke',
    { name: 'NoNuke', nukeEnabled: false },
    batchBase, baseP0, cfg,
  ));

  results.sort((a, b) => a.delta - b.delta);

  return {
    baseline,
    baselineP0WinRate: baseP0,
    baselineAvgDuration: baseline.durationStats.mean,
    baselineDurationRange: {
      min: baseline.durationStats.min,
      max: baseline.durationStats.max,
    },
    results,
  };
}
