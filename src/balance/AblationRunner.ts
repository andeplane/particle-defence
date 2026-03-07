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
  readonly baseline: BatchReport;
  readonly restricted: BatchReport;
}

export interface AblationConfig {
  readonly gamesPerTest: number;
  readonly gridType: GridType;
  readonly tickMs: number;
  readonly maxGameTimeSec: number;
  readonly onProgress?: (feature: string, phase: 'baseline' | 'restricted', gameIndex: number) => void;
}

const defaultAblationConfig: AblationConfig = {
  gamesPerTest: 50,
  gridType: 'random',
  tickMs: 1000,
  maxGameTimeSec: 30 * 60,
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

function runPair(
  feature: string,
  restrictedProfile: AIProfile,
  cfg: AblationConfig,
): AblationResult {
  const batchBase: Partial<BatchConfig> = {
    games: cfg.gamesPerTest,
    gridType: cfg.gridType,
    tickMs: cfg.tickMs,
    maxGameTimeSec: cfg.maxGameTimeSec,
  };

  const baseline = runBatch({
    ...batchBase,
    onGameComplete: cfg.onProgress
      ? (i) => cfg.onProgress!(feature, 'baseline', i)
      : undefined,
  });

  const restricted = runBatch({
    ...batchBase,
    p0Profile: restrictedProfile,
    onGameComplete: cfg.onProgress
      ? (i) => cfg.onProgress!(feature, 'restricted', i)
      : undefined,
  });

  const baseP0 = winRate(baseline, 0);
  const restP0 = winRate(restricted, 0);
  const delta = restP0 - baseP0;

  return {
    feature,
    baselineP0WinRate: baseP0,
    restrictedP0WinRate: restP0,
    delta,
    impact: classifyImpact(delta),
    baseline,
    restricted,
  };
}

const UPGRADE_FEATURES: UpgradeType[] = [
  'attack', 'health', 'spawnRate', 'speed', 'radius',
  'maxParticles', 'defense', 'interestRate',
];

/**
 * Run ablation tests: for each feature, disable it for P0 and measure win rate change.
 * Negative delta = feature is important (P0 loses more without it).
 */
export function runAblation(configOverrides?: Partial<AblationConfig>): AblationResult[] {
  const cfg = configOverrides ? { ...defaultAblationConfig, ...configOverrides } : defaultAblationConfig;
  const results: AblationResult[] = [];

  for (const upgrade of UPGRADE_FEATURES) {
    const profile: AIProfile = {
      name: `No${upgrade}`,
      disabledUpgrades: new Set([upgrade]),
    };
    results.push(runPair(upgrade, profile, cfg));
  }

  const noTowersProfile: AIProfile = { name: 'NoTowers', towersEnabled: false };
  results.push(runPair('towers', noTowersProfile, cfg));

  const noNukeProfile: AIProfile = { name: 'NoNuke', nukeEnabled: false };
  results.push(runPair('nuke', noNukeProfile, cfg));

  results.sort((a, b) => a.delta - b.delta);
  return results;
}
