import type { AIProfile } from '../ai';

// Balanced: consistent investment wins through mid-game efficiency.
// Counter: GlassCannon (burst damage overwhelms before defense accrues), Rush (volume + speed)
// Counters: TowerFortress (flexible spending out-values tower investment), Economy (fights before economy peaks)
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
// Counter: GlassCannon (superior individual attack kills Rush efficiently), Economy (outlasts the rush)
// Counters: TowerFortress (overwhelms before towers are operational), Balanced (volume outpaces defense)
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
// Counter: Rush (wins before economy scales), GlassCannon (burst kills before scaling kicks in)
// Counters: Tank (gold out-upgrades HP stacking), TowerFortress (out-scales tower investment)
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
// Counter: Rush (early pressure before towers are up), GlassCannon (burst melts towers quickly)
// Counters: Balanced (towers tip the scale in sustained fights), Economy (tower DPS outlasts interest)
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
// Counter: Tank (large durable army overwhelms the small fragile elite force),
//          TowerFortress (towers survive and punish glass particles)
// Counters: Economy (burst before scaling), Balanced (overwhelms before defense accrues)
export const GLASS_CANNON_PROFILE: AIProfile = {
  name: 'GlassCannon',
  upgradeWeights: {
    attack: 1.9,
    speed: 2.0,
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

// Tank: large durable army wins by numerical attrition and sustained pressure.
// spawnRate:3.0 fills the big army as fast as Rush — but particles have higher HP and defense.
// maxParticles:2.0 grows the cap to maintain sustained numerical pressure over time.
// Counter: Economy (gold snowball out-upgrades tank stats in long games)
// Counters: GlassCannon (1100-particle army overwhelms the small fragile elite force),
//           Rush (matching spawn rate + higher HP wins the attrition battle)
export const TANK_PROFILE: AIProfile = {
  name: 'Tank',
  upgradeWeights: {
    maxParticles: 2.0,
    spawnRate: 3.0,
    health: 2.5,
    attack: 2.0,
    defense: 1.5,
    speed: 1.8,
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
