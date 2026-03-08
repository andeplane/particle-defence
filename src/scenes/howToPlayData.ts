import { CONFIG, getUpgradeCost, getTowerResearchCost, getTowerConstructionCost, getTowerUpgradeCost, type UpgradeType } from '../config';
import { getLaserStats, getSlowStats } from '../particles/towers';
import { computeMaxLevels, defaultPlayerConfig } from '../player';

export interface ContentSection {
  title: string;
  lines: string[];
}

export type TabId = 'overview' | 'techTree' | 'combat' | 'strategies';

export interface TabDef {
  id: TabId;
  label: string;
}

export const TABS: readonly TabDef[] = [
  { id: 'overview', label: 'OVERVIEW' },
  { id: 'techTree', label: 'TECH TREE' },
  { id: 'combat', label: 'COMBAT' },
  { id: 'strategies', label: 'STRATEGIES' },
];

export function getTabContent(tabId: TabId): ContentSection[] {
  switch (tabId) {
    case 'overview': return getOverviewSections();
    case 'techTree': return getTechTreeSections();
    case 'combat': return getCombatSections();
    case 'strategies': return getStrategySections();
  }
}

function getOverviewSections(): ContentSection[] {
  return [
    {
      title: 'How to Win',
      lines: [
        'Each player has a base with ' + CONFIG.BASE_HP + ' HP.',
        'Spawn particles from your base. They navigate the maze',
        'and attack the enemy base, dealing ' + CONFIG.BASE_DAMAGE_ON_REACH + ' damage on arrival.',
        'Reduce the enemy base to 0 HP to win.',
      ],
    },
    {
      title: 'Particles',
      lines: [
        'Particles spawn automatically at a fixed interval.',
        `Base stats:  ${CONFIG.PARTICLE_BASE_HEALTH} HP  |  ${CONFIG.PARTICLE_BASE_ATTACK} ATK  |  ${CONFIG.PARTICLE_SPEED} SPD  |  ${CONFIG.PARTICLE_BASE_RADIUS} RAD`,
        `Spawn interval: ${CONFIG.SPAWN_INTERVAL_MS}ms  |  Pop cap: ${CONFIG.MAX_PARTICLES_PER_PLAYER}`,
        '',
        'Particles fight enemy particles on contact.',
        'Survivors continue toward the enemy base.',
      ],
    },
    {
      title: 'Gold & Economy',
      lines: [
        `Starting gold: ${CONFIG.STARTING_GOLD}g`,
        `Kill reward: ${CONFIG.KILL_REWARD}g per enemy killed`,
        `Nuke kill reward: ${CONFIG.NUCLEAR_KILL_REWARD_FRACTION * 100}% of normal`,
        '',
        'Spend gold on upgrades, tower research, and construction.',
        `Upgrade costs scale: baseCost x ${CONFIG.UPGRADE_COST_MULTIPLIER} per level`,
      ],
    },
    {
      title: 'Territory & Cell Ownership',
      lines: [
        'When your particles enter a cell, you capture it.',
        `Your particles in owned cells get ${pct(CONFIG.OWNERSHIP_DEFENSE_BASE)} damage reduction.`,
        `Enemy particles in your cells are slowed by ${pct(1 - CONFIG.OWNERSHIP_SLOW_FACTOR)}.`,
        'Ownership shifts when your particles leave and enemies enter.',
      ],
    },
    {
      title: 'Nuclear Weapon',
      lines: [
        'Instantly kills ALL enemy particles (including towers).',
        `First available at ${formatTime(CONFIG.NUCLEAR_FIRST_AVAILABLE_MS)}.`,
        `Cooldown: ${formatTime(CONFIG.NUCLEAR_COOLDOWN_MS)}.`,
        `Kills from nukes give only ${CONFIG.NUCLEAR_KILL_REWARD_FRACTION * 100}% gold reward.`,
      ],
    },
  ];
}

function getTechTreeSections(): ContentSection[] {
  const maxLevels = computeMaxLevels(defaultPlayerConfig);

  const upgradeRows: ContentSection = {
    title: 'Particle Upgrades',
    lines: [
      pad('UPGRADE', 12) + pad('BASE$', 7) + pad('PER LVL', 18) + pad('MAX LVL', 9) + 'COST @ LV 1/3/5',
      '-'.repeat(72),
      ...getUpgradeDescriptions(maxLevels),
    ],
  };

  const towerResearch: ContentSection = {
    title: 'Tower Research (one-time unlock)',
    lines: [
      'You must research a tower type before you can build it.',
      '',
      `  Laser Tower research:  ${getTowerResearchCost('laser')}g`,
      `  Slow Tower research:   ${getTowerResearchCost('slow')}g`,
    ],
  };

  const towerConstruction: ContentSection = {
    title: 'Tower Construction',
    lines: [
      'Building a tower spawns a carrier particle from your base.',
      `Carrier HP: ${CONFIG.TOWER_CARRIER_HP}  (can be killed before placement)`,
      'Press PLACE to convert the carrier into a tower at its position.',
      `Max towers per player: ${CONFIG.TOWER_MAX_PER_PLAYER}`,
      '',
      `  Laser Tower build cost:  ${getTowerConstructionCost('laser')}g`,
      `  Slow Tower build cost:   ${getTowerConstructionCost('slow')}g`,
    ],
  };

  const laser0 = getLaserStats(0);
  const laser1 = getLaserStats(1);
  const slow0 = getSlowStats(0);
  const slow1 = getSlowStats(1);

  const towerStats: ContentSection = {
    title: 'Tower Stats & Upgrades',
    lines: [
      `Towers take ${pct(CONFIG.TOWER_DAMAGE_REDUCTION)} reduced damage.`,
      `Tower upgrade cost scales: base x ${CONFIG.TOWER_UPGRADE_COST_MULTIPLIER} per level`,
      '',
      '--- Laser Tower ---',
      `  HP: ${laser0.hp}  (+${laser1.hp - laser0.hp}/lvl)`,
      `  Damage: ${laser0.damage}  (+${laser1.damage - laser0.damage}/lvl)`,
      `  Attack speed: ${laser0.attackSpeed}/s  (+${(laser1.attackSpeed - laser0.attackSpeed).toFixed(1)}/lvl)`,
      `  DPS: ${(laser0.damage * laser0.attackSpeed).toFixed(1)}  at base level`,
      `  Range: ${laser0.range}  (+${laser1.range - laser0.range}/lvl)`,
      `  Upgrade cost: ${getTowerUpgradeCost('laser', 0)}g / ${getTowerUpgradeCost('laser', 1)}g / ${getTowerUpgradeCost('laser', 2)}g`,
      '',
      '--- Slow Tower ---',
      `  HP: ${slow0.hp}  (+${slow1.hp - slow0.hp}/lvl)`,
      `  Slow: ${pct(slow0.slowFactor)}  (+${pct(slow1.slowFactor - slow0.slowFactor)}/lvl, max ${pct(0.9)})`,
      `  Range: ${slow0.range}  (+${slow1.range - slow0.range}/lvl)`,
      `  Upgrade cost: ${getTowerUpgradeCost('slow', 0)}g / ${getTowerUpgradeCost('slow', 1)}g / ${getTowerUpgradeCost('slow', 2)}g`,
    ],
  };

  return [upgradeRows, towerResearch, towerConstruction, towerStats];
}

function getCombatSections(): ContentSection[] {
  return [
    {
      title: 'Base Damage Formula',
      lines: [
        'When two particles collide, each deals damage to the other.',
        'Base damage dealt = attacker\'s ATK value.',
        '',
        'Three modifiers multiply this damage:',
      ],
    },
    {
      title: '1. Speed Combat Bonus',
      lines: [
        'Faster particles deal bonus damage to slower ones.',
        '',
        `  speedBonus = 1 + ${CONFIG.SPEED_COMBAT_BONUS} x (attackerSpeed - targetSpeed) / ${CONFIG.PARTICLE_SPEED}`,
        '',
        'Only applies when the attacker is faster (otherwise 1.0).',
        `At +${CONFIG.PARTICLE_SPEED} speed advantage: +${pct(CONFIG.SPEED_COMBAT_BONUS)} damage.`,
        'This makes Speed a combat stat, not just a movement stat.',
      ],
    },
    {
      title: '2. Anti-Tank HP Scaling',
      lines: [
        'Attacking high-HP targets deals bonus damage proportional',
        'to the target\'s max health. This prevents pure HP stacking.',
        '',
        `  hpScaling = 1 + ${CONFIG.PERCENT_HP_DAMAGE_SCALING} x (targetMaxHP / ${CONFIG.PARTICLE_BASE_HEALTH})`,
        '',
        `At 2x base HP: +${pct(CONFIG.PERCENT_HP_DAMAGE_SCALING)} extra damage taken.`,
        `At 5x base HP: +${pct(CONFIG.PERCENT_HP_DAMAGE_SCALING * 4)} extra damage taken.`,
      ],
    },
    {
      title: '3. Defense Reduces HP Scaling',
      lines: [
        'The defense stat directly counters the anti-tank penalty.',
        '',
        `  reduction = min(1, defenseFactor x ${CONFIG.DEFENSE_HP_SCALING_REDUCTION})`,
        '  hpScaling = 1 + rawHpScaling x (1 - reduction)',
        '',
        'High defense can fully negate the HP scaling penalty,',
        'making health investment viable for defensive builds.',
      ],
    },
    {
      title: 'Defense Sources',
      lines: [
        `Cell ownership base: ${pct(CONFIG.OWNERSHIP_DEFENSE_BASE)} (in your cells)`,
        `Per defense level:   +${pct(CONFIG.OWNERSHIP_DEFENSE_PER_LEVEL)} in cells (max ${pct(CONFIG.OWNERSHIP_DEFENSE_MAX)})`,
        `Global defense:      +${pct(CONFIG.GLOBAL_DEFENSE_PER_LEVEL)} everywhere (max ${pct(CONFIG.GLOBAL_DEFENSE_MAX)})`,
        '',
        'Global defense applies even in enemy territory.',
        'Cell defense only applies in cells you own.',
      ],
    },
    {
      title: 'Tower Combat',
      lines: [
        `Towers take ${pct(CONFIG.TOWER_DAMAGE_REDUCTION)} reduced damage from collisions.`,
        'Towers do NOT use the speed/HP-scaling formula.',
        'Towers can be destroyed by enemy particles.',
        'Nukes kill enemy towers.',
      ],
    },
    {
      title: 'Final Damage',
      lines: [
        '  damage = ATK x speedBonus x hpScaling x (1 - defense)',
        '',
        'All three multipliers stack multiplicatively.',
      ],
    },
  ];
}

function getStrategySections(): ContentSection[] {
  return [
    {
      title: 'Strategy Archetypes',
      lines: [
        'There are many ways to play. Here are six common approaches.',
        'No single strategy dominates -- each has trade-offs.',
      ],
    },
    {
      title: 'Balanced',
      lines: [
        'Jack of all trades. Even investment across attack,',
        'spawn rate, speed, and health. Uses towers mid-game.',
        'No hard counters but doesn\'t excel in any area.',
        'Priority: Attack = Spawn Rate > Speed > Health',
      ],
    },
    {
      title: 'Rush',
      lines: [
        'Overwhelm early with sheer numbers and speed.',
        'Maximize spawn rate first, then speed and attack.',
        'No towers. Win before the opponent scales.',
        'Priority: Spawn Rate >>> Speed > Attack',
      ],
    },
    {
      title: 'Economy',
      lines: [
        'Invest in interest early for compounding gold income.',
        'Vulnerable in the first 2-3 minutes but outscales',
        'everyone in the late game.',
        'Priority: Interest > Attack = Spawn Rate > Speed',
      ],
    },
    {
      title: 'Tower Fortress',
      lines: [
        'Aggressive tower deployment + strong particle combat.',
        'Researches towers early, invests in defense for',
        'territory control. Expensive but hard to break.',
        'Priority: Attack > Defense > Speed > Towers',
      ],
    },
    {
      title: 'Glass Cannon',
      lines: [
        'Maximize attack and speed. Kill before being killed.',
        'No towers, no defense. Speed bonus amplifies high ATK.',
        'Shreds tanky targets but dies fast if caught.',
        'Priority: Attack >>> Speed >> Spawn Rate',
      ],
    },
    {
      title: 'Tank',
      lines: [
        'Durable wall of high-HP particles. Invest in health',
        'and defense. Defense counters the anti-tank HP penalty.',
        'Global defense helps when pushing into enemy territory.',
        'Priority: Health = Defense >>> Attack > Spawn Rate',
      ],
    },
    {
      title: 'Tips',
      lines: [
        '- Spawn Rate is king early; get particles flowing fast.',
        '- Speed is both a movement AND combat stat.',
        '- Defense is expensive but enables health-heavy builds.',
        '- Interest pays off only if you survive long enough.',
        '- Towers are powerful but cost 700g total (research + build).',
        '- Nukes are devastating -- save yours, and spread out.',
        '- Territory control (cell ownership) gives defense + slow.',
      ],
    },
  ];
}

function getUpgradeDescriptions(maxLevels: Record<UpgradeType, number>): string[] {
  const upgrades: { type: UpgradeType; label: string; perLevel: string }[] = [
    { type: 'health', label: 'Health', perLevel: `+${CONFIG.HEALTH_PER_LEVEL} HP` },
    { type: 'attack', label: 'Attack', perLevel: `+${CONFIG.ATTACK_PER_LEVEL} ATK` },
    { type: 'radius', label: 'Radius', perLevel: '+1 radius' },
    { type: 'spawnRate', label: 'Spawn Rate', perLevel: `-${CONFIG.SPAWN_RATE_REDUCTION_PER_LEVEL}ms interval` },
    { type: 'speed', label: 'Speed', perLevel: `+${CONFIG.SPEED_PER_LEVEL} speed` },
    { type: 'maxParticles', label: 'Max Pop', perLevel: `+${CONFIG.MAX_PARTICLES_PER_LEVEL} cap` },
    { type: 'defense', label: 'Defense', perLevel: `+${pct(CONFIG.OWNERSHIP_DEFENSE_PER_LEVEL)} cell def` },
    { type: 'interestRate', label: 'Interest', perLevel: `+${(CONFIG.INTEREST_RATE_PER_LEVEL * 100).toFixed(2)}% / 30s` },
  ];

  return upgrades.map(u => {
    const base = CONFIG.UPGRADE_COSTS[u.type];
    const max = maxLevels[u.type];
    const maxStr = max === Infinity ? 'none' : String(max);
    const costs = `${getUpgradeCost(u.type, 1)}/${getUpgradeCost(u.type, 3)}/${getUpgradeCost(u.type, 5)}`;
    return pad(u.label, 12) + pad(base + 'g', 7) + pad(u.perLevel, 18) + pad(maxStr, 9) + costs;
  });
}

function pad(s: string, width: number): string {
  return s.padEnd(width);
}

function pct(v: number): string {
  return Math.round(v * 100) + '%';
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  if (sec === 0) return `${min}min`;
  return `${min}min ${sec}s`;
}
