import type { AIProfile } from '../ai';

export const BALANCED_PROFILE: AIProfile = {
  name: 'Balanced',
  upgradeWeights: {
    attack: 1.5,
    speed: 1.3,
    spawnRate: 1.5,
    health: 1.0,
    maxParticles: 1.0,
    defense: 0.5,
    radius: 0.5,
    interestRate: 0.5,
  },
};

export const RUSH_PROFILE: AIProfile = {
  name: 'Rush',
  upgradeWeights: {
    spawnRate: 3.0,
    speed: 2.0,
    attack: 2.0,
    health: 0.3,
    defense: 0,
    interestRate: 0,
    maxParticles: 0.5,
    radius: 0.3,
  },
  towersEnabled: false,
};

export const ECONOMY_PROFILE: AIProfile = {
  name: 'Economy',
  upgradeWeights: {
    interestRate: 2.0,
    attack: 2.0,
    speed: 1.5,
    spawnRate: 2.0,
    maxParticles: 1.5,
    health: 0.8,
    defense: 0.3,
    radius: 0.3,
  },
};

export const TOWER_FORTRESS_PROFILE: AIProfile = {
  name: 'TowerFortress',
  upgradeWeights: {
    attack: 1.5,
    speed: 1.3,
    spawnRate: 1.2,
    health: 1.0,
    defense: 1.0,
    maxParticles: 0.8,
    interestRate: 1.0,
    radius: 0.3,
  },
  towerPriority: 'high',
};

export const GLASS_CANNON_PROFILE: AIProfile = {
  name: 'GlassCannon',
  upgradeWeights: {
    attack: 2.2,
    speed: 1.8,
    spawnRate: 1.5,
    health: 0.3,
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
    health: 2.5,
    attack: 1.8,
    spawnRate: 1.5,
    defense: 1.5,
    maxParticles: 1.5,
    speed: 0.8,
    radius: 0.8,
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
