/**
 * CLI script: npx tsx src/balance/math-report.ts
 *
 * Prints mathematical balance analysis tables to the console.
 * No simulation needed -- pure calculation from config values.
 */
import {
  defaultBalanceConfig,
  upgradeEfficiencyTable,
  maxUpgradeLevel,
  statAtLevel,
  duelMatrix,
  lanchesterPower,
  lanchesterROIPerGold,
  spawnRateTable,
  laserTowerROI,
  interestBreakEvenTable,
  detectRedFlags,
  type BalanceConfig,
} from './BalanceCalculator';
import type { UpgradeType } from '../config';

const cfg = defaultBalanceConfig();

const UPGRADE_TYPES: UpgradeType[] = [
  'health', 'attack', 'radius', 'spawnRate', 'speed', 'maxParticles', 'defense', 'interestRate',
];

function hr(char = '─', len = 80): string {
  return char.repeat(len);
}

function pad(str: string, len: number, align: 'left' | 'right' = 'right'): string {
  const s = str.slice(0, len);
  return align === 'right' ? s.padStart(len) : s.padEnd(len);
}

function fmtNum(n: number, decimals = 2): string {
  if (!isFinite(n)) return 'INF';
  return n.toFixed(decimals);
}

// ---------------------------------------------------------------------------
// 1. Red Flags
// ---------------------------------------------------------------------------
function printRedFlags(): void {
  console.log('\n' + hr('='));
  console.log('  AUTOMATED RED FLAG DETECTION');
  console.log(hr('='));

  const flags = detectRedFlags(cfg);
  if (flags.length === 0) {
    console.log('  No red flags detected.\n');
    return;
  }

  for (const flag of flags) {
    const severity = flag.severity.toUpperCase();
    console.log(`\n  [${severity}] ${flag.category}: ${flag.description}`);
    console.log(`  ${flag.details}`);
  }
  console.log();
}

// ---------------------------------------------------------------------------
// 2. Gold Efficiency Table
// ---------------------------------------------------------------------------
function printGoldEfficiency(): void {
  console.log(hr('='));
  console.log('  GOLD EFFICIENCY PER UPGRADE (stat gained / gold spent per level)');
  console.log(hr('='));

  for (const type of UPGRADE_TYPES) {
    const maxLvl = Math.min(maxUpgradeLevel(type, cfg), 10);
    if (maxLvl === 0) continue;
    const table = upgradeEfficiencyTable(type, maxLvl, cfg);

    console.log(`\n  ${type.toUpperCase()} (base cost: ${cfg.upgradeCosts[type]}g, max level: ${maxUpgradeLevel(type, cfg) === Infinity ? 'unlimited' : maxUpgradeLevel(type, cfg)})`);
    console.log(`  ${pad('Lvl', 4, 'left')} ${pad('Cost', 7)} ${pad('CumCost', 9)} ${pad('Stat', 10)} ${pad('Delta', 8)} ${pad('Eff', 10)}`);
    console.log(`  ${hr('-', 52)}`);

    for (const row of table) {
      const statStr = fmtNum(row.statValue, 4);
      const deltaStr = fmtNum(row.statDelta, 4);
      const effStr = row.efficiency === 0 ? '0 (MAX)' : fmtNum(row.efficiency, 6);
      console.log(`  ${pad(String(row.level), 4, 'left')} ${pad(String(row.cost) + 'g', 7)} ${pad(String(row.cumulativeCost) + 'g', 9)} ${pad(statStr, 10)} ${pad(deltaStr, 8)} ${pad(effStr, 10)}`);
    }
  }
  console.log();
}

// ---------------------------------------------------------------------------
// 3. Duel Matrix (Attack vs Health)
// ---------------------------------------------------------------------------
function printDuelMatrix(): void {
  console.log(hr('='));
  console.log('  DUEL MATRIX: Hits for attacker to kill target (attack level vs health level)');
  console.log(hr('='));

  const atkLevels = [0, 1, 2, 3, 5, 10];
  const hpLevels = [0, 1, 2, 3, 5, 10, 20];
  const matrix = duelMatrix(atkLevels, hpLevels, cfg);

  const hpHeader = '  ' + pad('Atk\\HP', 10, 'left') + hpLevels.map(l =>
    pad(`+${l} (${statAtLevel('health', l, cfg)}HP)`, 12)
  ).join('');
  console.log(`\n${hpHeader}`);
  console.log('  ' + hr('-', 10 + hpLevels.length * 12));

  for (let i = 0; i < atkLevels.length; i++) {
    const atkLvl = atkLevels[i];
    const atkVal = statAtLevel('attack', atkLvl, cfg);
    const rowLabel = pad(`+${atkLvl} (${atkVal}A)`, 10, 'left');
    const cells = matrix[i].map(hits => pad(hits === 1 ? '1 HIT!' : `${hits}`, 12)).join('');
    console.log(`  ${rowLabel}${cells}`);
  }

  console.log('\n  Key insight: "1 HIT!" = one-shot kill. Lower is stronger for the attacker.');
  console.log();
}

// ---------------------------------------------------------------------------
// 4. Lanchester ROI Comparison
// ---------------------------------------------------------------------------
function printLanchesterROI(): void {
  console.log(hr('='));
  console.log('  LANCHESTER ROI: Combat power gain per gold (higher = better investment)');
  console.log('  Lanchester\'s Square Law: army_power = N^2 * attack * health / (1 - defense)');
  console.log(hr('='));

  const armySizes = [50, 100, 300, 500, 800];
  const types: UpgradeType[] = ['attack', 'health', 'radius', 'speed', 'defense'];

  console.log(`\n  At base stats (Level 0), comparing first upgrade purchase:`);
  const header = '  ' + pad('Type', 10, 'left') + armySizes.map(n => pad(`N=${n}`, 14)).join('');
  console.log(header);
  console.log('  ' + hr('-', 10 + armySizes.length * 14));

  for (const type of types) {
    const cells = armySizes.map(n => {
      const roi = lanchesterROIPerGold(type, 0, n, cfg);
      return pad(fmtNum(roi, 1), 14);
    }).join('');
    console.log(`  ${pad(type, 10, 'left')}${cells}`);
  }

  console.log(`\n  Note: spawnRate/maxParticles/interestRate affect army SIZE (N), which has`);
  console.log(`  QUADRATIC impact on power. They are not shown here but are often the`);
  console.log(`  highest-value investments because power ~ N^2.`);

  console.log(`\n  Example: Army of 300 vs 310 (+10 units from spawn rate over time):`);
  const p300 = lanchesterPower(300, cfg.particleBaseAttack, cfg.particleBaseHealth);
  const p310 = lanchesterPower(310, cfg.particleBaseAttack, cfg.particleBaseHealth);
  console.log(`    Power at N=300: ${fmtNum(p300, 0)}`);
  console.log(`    Power at N=310: ${fmtNum(p310, 0)} (+${fmtNum((p310 / p300 - 1) * 100, 1)}%)`);
  console.log(`    Marginal value of +10 units: ${fmtNum(p310 - p300, 0)} power`);
  console.log();
}

// ---------------------------------------------------------------------------
// 5. Spawn Rate Analysis
// ---------------------------------------------------------------------------
function printSpawnRateAnalysis(): void {
  console.log(hr('='));
  console.log('  SPAWN RATE ANALYSIS');
  console.log(hr('='));

  const table = spawnRateTable(cfg);
  console.log(`\n  ${pad('Level', 6, 'left')} ${pad('Interval', 10)} ${pad('Spawns/s', 10)} ${pad('Delta', 10)} ${pad('Cost', 8)}`);
  console.log(`  ${hr('-', 48)}`);

  for (const row of table) {
    console.log(`  ${pad(String(row.level), 6, 'left')} ${pad(row.intervalMs + 'ms', 10)} ${pad(fmtNum(row.spawnsPerSecond, 2), 10)} ${pad(row.level === 0 ? '-' : '+' + fmtNum(row.deltaSpawnsPerSecond, 2), 10)} ${pad(row.cost === 0 ? '-' : row.cost + 'g', 8)}`);
  }

  if (table.length <= 2) {
    console.log(`\n  WARNING: Spawn rate has only ${table.length - 1} upgrade level(s)!`);
    console.log(`  This is the single most impactful upgrade category by Lanchester's law`);
    console.log(`  yet players can barely improve it.`);
  }
  console.log();
}

// ---------------------------------------------------------------------------
// 6. Tower ROI
// ---------------------------------------------------------------------------
function printTowerROI(): void {
  console.log(hr('='));
  console.log('  TOWER ROI vs UPGRADE EQUIVALENTS');
  console.log(hr('='));

  const roi = laserTowerROI(cfg.particleBaseHealth, cfg);

  console.log(`\n  LASER TOWER (base level):`);
  console.log(`    Research cost:        ${roi.researchCost}g (one-time)`);
  console.log(`    Construction cost:    ${roi.constructionCost}g (per tower)`);
  console.log(`    Total (first tower):  ${roi.totalFirstCost}g`);
  console.log(`    DPS:                  ${fmtNum(roi.dps, 1)} (${cfg.laserBaseDamage} dmg x ${cfg.laserBaseAttackSpeed}/s)`);
  console.log(`    Kill rate:            ${fmtNum(roi.killRatePerSec, 2)} kills/s (vs ${cfg.particleBaseHealth}HP enemies)`);
  console.log(`    Gold income:          ${fmtNum(roi.goldPerSec, 2)} gold/s`);
  console.log(`    Break-even (first):   ${fmtNum(roi.breakEvenFirstSec / 60, 1)} minutes`);
  console.log(`    Break-even (2nd+):    ${fmtNum(roi.breakEvenSubsequentSec / 60, 1)} minutes`);

  console.log(`\n  EQUIVALENT UPGRADE SPENDING (${roi.totalFirstCost}g budget):`);
  console.log(`    Attack levels:        +${roi.equivalentAttackLevels} (applied to EVERY particle)`);

  const armySizes = [100, 300, 500];
  for (const n of armySizes) {
    const totalDPS = roi.equivalentAttackLevels * n;
    console.log(`    Total army DPS at N=${n}: +${totalDPS} (vs tower's ${fmtNum(roi.dps, 1)} local DPS)`);
  }

  console.log();
}

// ---------------------------------------------------------------------------
// 7. Interest Break-Even
// ---------------------------------------------------------------------------
function printInterestBreakEven(): void {
  console.log(hr('='));
  console.log('  INTEREST RATE BREAK-EVEN ANALYSIS');
  console.log(`  Interest applied every ${cfg.interestIntervalMs / 1000}s. Rate = level * ${(cfg.interestRatePerLevel * 100).toFixed(2)}%, max ${(cfg.maxInterestRate * 100).toFixed(0)}%.`);
  console.log(hr('='));

  const banks = [50, 100, 200, 500, 1000];
  const table = interestBreakEvenTable(banks, cfg);

  console.log(`\n  ${pad('Lvl', 4, 'left')} ${pad('Rate', 7)} ${pad('CumCost', 9)} ${banks.map(b => pad(`@${b}g`, 12)).join('')}`);
  console.log(`  ${hr('-', 20 + banks.length * 12)}`);

  for (const row of table.slice(0, 5)) {
    const rateStr = (row.rate * 100).toFixed(2) + '%';
    const cells = banks.map(b => {
      const secs = row.breakEvenSecondsAtBank[b];
      if (!isFinite(secs)) return pad('never', 12);
      return pad(fmtNum(secs / 60, 1) + 'min', 12);
    }).join('');
    console.log(`  ${pad(String(row.level), 4, 'left')} ${pad(rateStr, 7)} ${pad(row.cumulativeCost + 'g', 9)} ${cells}`);
  }

  console.log(`\n  Values show time (minutes) to recoup cumulative investment from interest income.`);
  console.log(`  "never" means floor(bank * rate) = 0 (bank too small for any income).`);
  console.log();
}

// ---------------------------------------------------------------------------
// 8. Cross-Upgrade Comparison
// ---------------------------------------------------------------------------
function printCrossComparison(cfg: BalanceConfig): void {
  console.log(hr('='));
  console.log('  CROSS-UPGRADE COMPARISON: First-level purchase value');
  console.log(hr('='));

  console.log(`\n  ${pad('Upgrade', 14, 'left')} ${pad('Cost', 6)} ${pad('Stat Gain', 20, 'left')} ${pad('Notes', 40, 'left')}`);
  console.log(`  ${hr('-', 84)}`);

  const rows: Array<{ type: UpgradeType; cost: number; gain: string; notes: string }> = [
    {
      type: 'attack',
      cost: cfg.upgradeCosts.attack,
      gain: '+1 atk (1 -> 2)',
      notes: '2x damage per particle; 2 hits to kill (was 3)',
    },
    {
      type: 'health',
      cost: cfg.upgradeCosts.health,
      gain: '+1 HP (3 -> 4)',
      notes: '+33% survivability; 4 hits to die (was 3)',
    },
    {
      type: 'spawnRate',
      cost: cfg.upgradeCosts.spawnRate,
      gain: `${fmtNum(1000/60,1)} -> ${fmtNum(1000/50,1)} sps`,
      notes: `+20% spawn throughput (only 1 level exists!)`,
    },
    {
      type: 'speed',
      cost: cfg.upgradeCosts.speed,
      gain: `+${cfg.speedPerLevel} px/s (${cfg.particleBaseSpeed} -> ${cfg.particleBaseSpeed + cfg.speedPerLevel})`,
      notes: `+${((cfg.speedPerLevel / cfg.particleBaseSpeed) * 100).toFixed(0)}% speed; faster base reach`,
    },
    {
      type: 'radius',
      cost: cfg.upgradeCosts.radius,
      gain: `+1 px (${cfg.particleBaseRadius} -> ${cfg.particleBaseRadius + 1})`,
      notes: 'More collision area; marginal impact',
    },
    {
      type: 'maxParticles',
      cost: cfg.upgradeCosts.maxParticles,
      gain: `+${cfg.maxParticlesPerLevel} cap (${cfg.maxParticlesPerPlayer} -> ${cfg.maxParticlesPerPlayer + cfg.maxParticlesPerLevel})`,
      notes: 'Only matters at cap; huge if you hit it',
    },
    {
      type: 'defense',
      cost: cfg.upgradeCosts.defense,
      gain: `+${(cfg.ownershipDefensePerLevel * 100).toFixed(1)}% def`,
      notes: 'Only in owned cells; 40x pricier than attack',
    },
    {
      type: 'interestRate',
      cost: cfg.upgradeCosts.interestRate,
      gain: `+${(cfg.interestRatePerLevel * 100).toFixed(2)}%/30s`,
      notes: 'Economic; needs gold bank to be worthwhile',
    },
  ];

  for (const row of rows) {
    console.log(`  ${pad(row.type, 14, 'left')} ${pad(row.cost + 'g', 6)} ${pad(row.gain, 20, 'left')} ${pad(row.notes, 40, 'left')}`);
  }
  console.log();
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
console.log('\n' + hr('='));
console.log('  PARTICLE DEFENCE -- MATHEMATICAL BALANCE REPORT');
console.log(hr('='));

printRedFlags();
printCrossComparison(cfg);
printGoldEfficiency();
printDuelMatrix();
printLanchesterROI();
printSpawnRateAnalysis();
printTowerROI();
printInterestBreakEven();

console.log(hr('='));
console.log('  END OF REPORT');
console.log(hr('=') + '\n');
