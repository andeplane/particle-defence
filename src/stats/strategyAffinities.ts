import type { UpgradeType } from '../config';
import { ALL_PROFILES } from '../balance/AIProfiles';

/**
 * Computes a strategy affinity score (0-100) for each of the 6 AI profiles
 * based on a player's upgrade levels, tower usage, and gold production.
 *
 * Scores are normalized so the dominant strategy = 100; others are relative.
 */
export function computeStrategyAffinities(
  upgradeLevels: Record<UpgradeType, number>,
  towerCount: number,
  totalGoldProduced: number,
): Record<string, number> {
  const rawScores: Record<string, number> = {};

  for (const profile of ALL_PROFILES) {
    const weights = profile.upgradeWeights ?? {};
    let score = 0;

    for (const [type, level] of Object.entries(upgradeLevels) as [UpgradeType, number][]) {
      score += level * (weights[type] ?? 0);
    }

    if (profile.name === 'TowerFortress') {
      score += towerCount * 2;
    }

    if (profile.name === 'Economy') {
      // ~500 gold earned ≈ 1 extra point
      score += totalGoldProduced / 500;
    }

    if (profile.name === 'Rush' && towerCount > 0) {
      // Rush doesn't build towers; penalise if they did
      score = Math.max(0, score - towerCount * 3);
    }

    rawScores[profile.name] = Math.max(0, score);
  }

  const maxScore = Math.max(...Object.values(rawScores), 1);
  const result: Record<string, number> = {};
  for (const [name, score] of Object.entries(rawScores)) {
    result[name] = Math.round((score / maxScore) * 100);
  }
  return result;
}
