import type { AIProfile } from '../ai';

// Balanced: consistent investment wins through mid-game efficiency.
// Counter: GlassCannon (burst overwhelms), Tank (armor absorbs balanced damage), Rush (volume)
// Counters: Economy (combat before economy peaks), TowerFortress (flexible spending beats tower investment)
export const BALANCED_PROFILE: AIProfile = {
  name: 'Balanced',
  upgradeWeights: {
    attack: 1.8,
    speed: 1.6,
    spawnRate: 2.0,
    health: 1.5,
    maxParticles: 1.0,
    defense: 0.8,
    radius: 0.5,
    interestRate: 0.5,
  },
};

// Rush: fastest spawn rate + speed overwhelms before the opponent scales.
// Counter: GlassCannon (kills efficiently), Tank (HP absorbs the rush), Economy (outlasts)
// Counters: Balanced (volume outpaces), TowerFortress (overwhelms before towers are up)
export const RUSH_PROFILE: AIProfile = {
  name: 'Rush',
  upgradeWeights: {
    spawnRate: 3.0,
    speed: 1.9,
    attack: 1.8,
    maxParticles: 1.0,
    health: 0.5,
    defense: 0,
    interestRate: 0,
    radius: 0.3,
  },
  towersEnabled: false,
  territoryIncomeEnabled: false,
};

// Economy: interest snowball into late-game military dominance.
// Counter: Balanced (fights before economy peaks), TowerFortress (tower DPS outlasts interest)
// Counters: GlassCannon (outlasts burst damage), Rush (scale over volume)
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

// TowerFortress: tower network + durable army wins by attrition.
// Counter: Tank (large army overwhelms towers), Balanced (flexible spending beats tower lock-in), Rush
// Counters: GlassCannon (durable towers outlast glass particles), Economy (tower DPS > interest)
export const TOWER_FORTRESS_PROFILE: AIProfile = {
  name: 'TowerFortress',
  upgradeWeights: {
    attack: 1.8,
    speed: 1.2,
    spawnRate: 1.5,
    health: 2.0,
    defense: 2.0,
    maxParticles: 0.8,
    interestRate: 1.5,
    radius: 0.3,
  },
  towerPriority: 'high',
};

// GlassCannon: devastating burst damage — kills fast or dies trying.
// Counter: Economy (outlasts the burst), TowerFortress (durable towers survive and punish)
// Counters: Balanced (burst overwhelms), Rush (kills efficiently), Tank (speed penetrates armor)
export const GLASS_CANNON_PROFILE: AIProfile = {
  name: 'GlassCannon',
  upgradeWeights: {
    attack: 1.6,
    speed: 1.6,
    spawnRate: 1.5,
    radius: 0.4,
    maxParticles: 1.0,
    health: 0.3,
    defense: 0,
    interestRate: 0,
  },
  towersEnabled: false,
  territoryIncomeEnabled: false,
};

// Tank: durable high-defense army wins by attrition — high HP+defense negates HP-scaling attacks.
// Counter: GlassCannon (burst speed penetrates armor), Economy (gold outlasts HP stacking)
// Counters: TowerFortress (large army overwhelms towers), Balanced (armor absorbs damage), Rush (HP wins attrition)
export const TANK_PROFILE: AIProfile = {
  name: 'Tank',
  upgradeWeights: {
    maxParticles: 1.5,
    spawnRate: 2.2,
    health: 2.5,
    attack: 2.0,
    defense: 1.7,
    speed: 1.2,
    radius: 0.5,
    interestRate: 0.8,
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
