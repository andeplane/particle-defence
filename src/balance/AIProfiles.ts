import type { AIProfile } from '../ai';

export const BALANCED_PROFILE: AIProfile = {
  name: 'Balanced',
};

export const RUSH_PROFILE: AIProfile = {
  name: 'Rush',
  upgradeWeights: {
    spawnRate: 3.0,
    attack: 2.5,
    speed: 1.5,
    health: 0.5,
    defense: 0,
    interestRate: 0,
    maxParticles: 0.3,
    radius: 0.3,
  },
  towersEnabled: false,
};

export const ECONOMY_PROFILE: AIProfile = {
  name: 'Economy',
  upgradeWeights: {
    interestRate: 3.0,
    maxParticles: 2.0,
    health: 1.0,
    attack: 0.8,
    spawnRate: 0.5,
    defense: 0.5,
    speed: 0.5,
    radius: 0.3,
  },
};

export const TOWER_FORTRESS_PROFILE: AIProfile = {
  name: 'TowerFortress',
  upgradeWeights: {
    health: 1.5,
    attack: 1.0,
    spawnRate: 1.0,
    speed: 0.8,
    defense: 1.5,
    radius: 0.5,
    maxParticles: 0.8,
    interestRate: 1.5,
  },
  towerPriority: 'high',
};

export const GLASS_CANNON_PROFILE: AIProfile = {
  name: 'GlassCannon',
  upgradeWeights: {
    attack: 3.0,
    speed: 2.0,
    spawnRate: 2.0,
    health: 0.2,
    defense: 0,
    radius: 0.3,
    maxParticles: 0.5,
    interestRate: 0,
  },
  towersEnabled: false,
};

export const TANK_PROFILE: AIProfile = {
  name: 'Tank',
  upgradeWeights: {
    health: 3.0,
    defense: 2.5,
    radius: 1.5,
    attack: 0.8,
    spawnRate: 0.5,
    speed: 0.3,
    maxParticles: 1.0,
    interestRate: 0.5,
  },
};

export const ALL_PROFILES: readonly AIProfile[] = [
  BALANCED_PROFILE,
  RUSH_PROFILE,
  ECONOMY_PROFILE,
  TOWER_FORTRESS_PROFILE,
  GLASS_CANNON_PROFILE,
  TANK_PROFILE,
];
