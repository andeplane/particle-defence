import { CONFIG } from '../config';
import type { ResearchPath } from './types';

function makeLevels(count: number, costPerLevel: number): { cost: number }[] {
  return Array.from({ length: count }, (_, i) => ({
    cost: Math.floor(costPerLevel * Math.pow(1.3, i)),
  }));
}

/** Universal tower research: available after any tower is researched. */
export const TOWER_REGEN_PATH: ResearchPath<never> = {
  id: 'tower_regen',
  name: 'Tower Regen',
  description: 'All towers slowly regenerate HP',
  requiresAny: ['unlock_laser', 'unlock_weakness'],
  levels: makeLevels(5, CONFIG.TOWER_REGEN_COST_PER_LEVEL) as ResearchPath<never>['levels'],
};

export const TOWER_RANGE_PATH: ResearchPath<never> = {
  id: 'tower_range',
  name: 'Tower Range',
  description: 'All towers gain increased targeting range',
  requiresAny: ['unlock_laser', 'unlock_weakness'],
  levels: makeLevels(5, CONFIG.TOWER_RANGE_COST_PER_LEVEL) as ResearchPath<never>['levels'],
};

/** Laser-specific tier-2 research. */
export const LASER_BOUNCE_PATH: ResearchPath<never> = {
  id: 'laser_bounce',
  name: 'Laser Bounce',
  description: 'Laser chains to additional nearby targets after the primary hit',
  requires: ['unlock_laser'],
  levels: makeLevels(5, CONFIG.LASER_BOUNCE_COST_PER_LEVEL) as ResearchPath<never>['levels'],
};

export const LASER_OVERCHARGE_PATH: ResearchPath<never> = {
  id: 'laser_overcharge',
  name: 'Laser Overcharge',
  description: 'Every few shots fires a 3× damage burst',
  requires: ['unlock_laser'],
  levels: makeLevels(5, CONFIG.LASER_OVERCHARGE_COST_PER_LEVEL) as ResearchPath<never>['levels'],
};

/** Weakness-specific tier-2 research. */
export const WEAKNESS_SLOW_PATH: ResearchPath<never> = {
  id: 'weakness_slow',
  name: 'Weakness Slow',
  description: 'Weakness tower also slows enemies in range',
  requires: ['unlock_weakness'],
  levels: makeLevels(5, CONFIG.WEAKNESS_SLOW_COST_PER_LEVEL) as ResearchPath<never>['levels'],
};

export const WEAKNESS_STUN_PATH: ResearchPath<never> = {
  id: 'weakness_stun',
  name: 'Weakness Stun',
  description: 'Weakness tower periodically fires a stun shot that removes enemy attack temporarily',
  requires: ['unlock_weakness'],
  levels: makeLevels(5, CONFIG.WEAKNESS_STUN_COST_PER_LEVEL) as ResearchPath<never>['levels'],
};

export const TERRITORY_INCOME_RATE_PATH: ResearchPath<never> = {
  id: 'territory_income_rate',
  name: 'Territory Income Rate',
  description: 'Increase gold income per owned cell',
  requires: ['unlock_territory_income'],
  levels: makeLevels(CONFIG.TERRITORY_INCOME_MAX_LEVEL, CONFIG.TERRITORY_INCOME_PATH_COST_PER_LEVEL) as ResearchPath<never>['levels'],
};

export const ALL_GLOBAL_PATHS: ResearchPath<never>[] = [
  TOWER_REGEN_PATH,
  TOWER_RANGE_PATH,
  LASER_BOUNCE_PATH,
  LASER_OVERCHARGE_PATH,
  WEAKNESS_SLOW_PATH,
  WEAKNESS_STUN_PATH,
  TERRITORY_INCOME_RATE_PATH,
];
