import { CONFIG } from '../config';
import type { IPlayer } from '../player';

export type ResearchNodeDef = {
  /** Registry ID (e.g. 'unlock_laser', 'tower_regen') */
  id: string;
  label: string;
  tooltip: string;
  /** false = one-time unlock; true = multi-level path */
  isPath: boolean;
  maxLevel: number;
  durationMs: number;
};

// ── Node definitions ──────────────────────────────────────────────────

const LASER_UNLOCK: ResearchNodeDef = {
  id: 'unlock_laser',
  label: 'LASER',
  tooltip: 'Unlock laser tower construction',
  isPath: false, maxLevel: 1,
  durationMs: CONFIG.TOWER_RESEARCH_DURATION_MS.laser,
};

const WEAKNESS_UNLOCK: ResearchNodeDef = {
  id: 'unlock_weakness',
  label: 'WEAKNESS',
  tooltip: 'Unlock weakness tower construction (drains HP, reduces attack)',
  isPath: false, maxLevel: 1,
  durationMs: CONFIG.TOWER_RESEARCH_DURATION_MS.weakness,
};

const NUKE_UNLOCK: ResearchNodeDef = {
  id: 'unlock_nuke',
  label: 'NUKE',
  tooltip: 'Unlock nuclear weapon launch',
  isPath: false, maxLevel: 1,
  durationMs: CONFIG.NUKE_RESEARCH_DURATION_MS,
};

const LASER_BOUNCE: ResearchNodeDef = {
  id: 'laser_bounce',
  label: 'BOUNCE',
  tooltip: 'Laser chains to additional nearby targets after the primary hit',
  isPath: true, maxLevel: 5,
  durationMs: CONFIG.LASER_BOUNCE_DURATION_MS,
};

const LASER_OVERCHARGE: ResearchNodeDef = {
  id: 'laser_overcharge',
  label: 'OVRCHG',
  tooltip: 'Every few shots fires a 3× damage burst',
  isPath: true, maxLevel: 5,
  durationMs: CONFIG.LASER_OVERCHARGE_DURATION_MS,
};

const WEAKNESS_SLOW: ResearchNodeDef = {
  id: 'weakness_slow',
  label: 'SLOW',
  tooltip: 'Weakness tower also slows enemies in range',
  isPath: true, maxLevel: 5,
  durationMs: CONFIG.WEAKNESS_SLOW_DURATION_MS,
};

const WEAKNESS_STUN: ResearchNodeDef = {
  id: 'weakness_stun',
  label: 'STUN',
  tooltip: 'Weakness tower periodically stuns enemies, removing their attack',
  isPath: true, maxLevel: 5,
  durationMs: CONFIG.WEAKNESS_STUN_DURATION_MS,
};

const TOWER_REGEN: ResearchNodeDef = {
  id: 'tower_regen',
  label: 'REGEN',
  tooltip: 'All towers slowly regenerate HP over time',
  isPath: true, maxLevel: 5,
  durationMs: CONFIG.TOWER_REGEN_DURATION_MS,
};

const TOWER_RANGE: ResearchNodeDef = {
  id: 'tower_range',
  label: 'RANGE',
  tooltip: 'All towers gain increased targeting range',
  isPath: true, maxLevel: 5,
  durationMs: CONFIG.TOWER_RANGE_DURATION_MS,
};

const TERRITORY_INCOME_UNLOCK: ResearchNodeDef = {
  id: 'unlock_territory_income',
  label: 'INCOME',
  tooltip: 'Owned cells generate passive gold income (+$every 5s based on territory)',
  isPath: false, maxLevel: 1,
  durationMs: CONFIG.TERRITORY_INCOME_RESEARCH_DURATION_MS,
};

const TERRITORY_INCOME_RATE: ResearchNodeDef = {
  id: 'territory_income_rate',
  label: 'RATE+',
  tooltip: 'Increase gold earned per owned cell',
  isPath: true, maxLevel: CONFIG.TERRITORY_INCOME_MAX_LEVEL,
  durationMs: CONFIG.TERRITORY_INCOME_PATH_DURATION_MS,
};

// ── Visibility logic ──────────────────────────────────────────────────

/** Returns the ordered list of research nodes visible to this player. */
export function getVisibleResearchNodes(player: IPlayer): ResearchNodeDef[] {
  const hasLaser = player.hasResearched('laser');
  const hasWeakness = player.hasResearched('weakness');
  const hasTower = hasLaser || hasWeakness;
  const hasNuke = player.hasUnlocked('unlock_nuke');

  const nodes: ResearchNodeDef[] = [];

  if (!hasLaser) {
    nodes.push(LASER_UNLOCK);
  } else {
    nodes.push(LASER_BOUNCE);
  }

  if (!hasWeakness) {
    nodes.push(WEAKNESS_UNLOCK);
  } else {
    nodes.push(WEAKNESS_SLOW);
  }

  if (!hasNuke) nodes.push(NUKE_UNLOCK);

  if (hasLaser) nodes.push(LASER_OVERCHARGE);
  if (hasWeakness) nodes.push(WEAKNESS_STUN);

  if (hasTower) {
    nodes.push(TOWER_REGEN);
    nodes.push(TOWER_RANGE);
  }

  const hasTerritoryIncome = player.hasUnlocked('unlock_territory_income');
  if (!hasTerritoryIncome) {
    nodes.push(TERRITORY_INCOME_UNLOCK);
  } else {
    nodes.push(TERRITORY_INCOME_RATE);
  }

  return nodes;
}
