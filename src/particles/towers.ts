import { CONFIG, type TowerType } from '../config';

export interface TowerStats {
  readonly towerType: TowerType;
  readonly range: number;
  level: number;
}

export interface LaserTowerStats extends TowerStats {
  readonly towerType: 'laser';
  readonly damage: number;
  readonly attackSpeed: number;
}

export interface SlowTowerStats extends TowerStats {
  readonly towerType: 'slow';
  readonly slowFactor: number;
}

export function getLaserStats(level: number): { damage: number; range: number; attackSpeed: number; hp: number } {
  return {
    damage: CONFIG.TOWER_LASER_BASE_DAMAGE + level * CONFIG.TOWER_LASER_DAMAGE_PER_LEVEL,
    range: CONFIG.TOWER_LASER_BASE_RANGE + level * CONFIG.TOWER_LASER_RANGE_PER_LEVEL,
    attackSpeed: CONFIG.TOWER_LASER_BASE_ATTACK_SPEED + level * CONFIG.TOWER_LASER_ATTACK_SPEED_PER_LEVEL,
    hp: CONFIG.TOWER_LASER_BASE_HP + level * CONFIG.TOWER_LASER_HP_PER_LEVEL,
  };
}

export function getSlowStats(level: number): { slowFactor: number; range: number; hp: number } {
  return {
    slowFactor: Math.min(0.9, CONFIG.TOWER_SLOW_BASE_FACTOR + level * CONFIG.TOWER_SLOW_FACTOR_PER_LEVEL),
    range: CONFIG.TOWER_SLOW_BASE_RANGE + level * CONFIG.TOWER_SLOW_RANGE_PER_LEVEL,
    hp: CONFIG.TOWER_SLOW_BASE_HP + level * CONFIG.TOWER_SLOW_HP_PER_LEVEL,
  };
}
