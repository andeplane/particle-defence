import type { GridType } from '../grid/generators';
import type { UpgradeType } from '../config';
import { runBatch } from './BatchRunner';
import type { BatchReport, GameResult } from './types';

function parseArgs(argv: string[]): { games: number; gridType: GridType; tickMs: number; json: boolean; maxTimeSec: number } {
  let games = 10;
  let gridType: GridType = 'random';
  let tickMs = 1000;
  let json = false;
  let maxTimeSec = 30 * 60;

  for (let i = 2; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === '--games' && argv[i + 1]) {
      games = parseInt(argv[++i], 10);
    } else if (arg === '--grid' && argv[i + 1]) {
      gridType = argv[++i] as GridType;
    } else if (arg === '--tick-ms' && argv[i + 1]) {
      tickMs = parseInt(argv[++i], 10);
    } else if (arg === '--max-time' && argv[i + 1]) {
      maxTimeSec = parseInt(argv[++i], 10);
    } else if (arg === '--json') {
      json = true;
    } else if (arg === '--help') {
      console.log(`Usage: npx tsx src/headless/cli.ts [options]

Options:
  --games N       Number of games to simulate (default: 10)
  --grid TYPE     Grid type: random|maze|hourglass|lanes|islands|rooms|fortress (default: random)
  --tick-ms N     Simulation tick size in ms; larger = faster (default: 1000)
  --max-time N    Max game duration in seconds (default: 1800)
  --json          Output raw JSON results
  --help          Show this help message`);
      process.exit(0);
    }
  }

  return { games, gridType, tickMs, json, maxTimeSec };
}

function formatDuration(sec: number): string {
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}m${s.toString().padStart(2, '0')}s`;
}

function printReport(report: BatchReport): void {
  const total = report.gamesPlayed;
  const p0Pct = ((report.p0Wins / total) * 100).toFixed(1);
  const p1Pct = ((report.p1Wins / total) * 100).toFixed(1);
  const drawPct = ((report.draws / total) * 100).toFixed(1);

  console.log('\n=== Headless AI-vs-AI Simulation Results ===\n');
  console.log(`Games played:  ${total}`);
  console.log(`P0 (cyan) wins: ${report.p0Wins} (${p0Pct}%)`);
  console.log(`P1 (red) wins:  ${report.p1Wins} (${p1Pct}%)`);
  console.log(`Draws:          ${report.draws} (${drawPct}%)`);

  console.log('\n--- Game Duration ---');
  console.log(`  Min:    ${formatDuration(report.durationStats.min)}`);
  console.log(`  Max:    ${formatDuration(report.durationStats.max)}`);
  console.log(`  Mean:   ${formatDuration(report.durationStats.mean)}`);
  console.log(`  Median: ${formatDuration(report.durationStats.median)}`);

  printUpgradeDistribution(report.results);
  printTowerStats(report.results);
}

function printUpgradeDistribution(results: readonly GameResult[]): void {
  const upgradeTypes: UpgradeType[] = ['health', 'attack', 'radius', 'spawnRate', 'speed', 'defense', 'maxParticles', 'interestRate'];

  console.log('\n--- Average Final Upgrade Levels ---');
  console.log('  Upgrade        P0     P1');
  console.log('  ─────────────────────────');

  for (const type of upgradeTypes) {
    let p0Sum = 0;
    let p1Sum = 0;
    for (const r of results) {
      p0Sum += r.players[0].upgradeLevels[type];
      p1Sum += r.players[1].upgradeLevels[type];
    }
    const p0Avg = (p0Sum / results.length).toFixed(1);
    const p1Avg = (p1Sum / results.length).toFixed(1);
    console.log(`  ${type.padEnd(14)} ${p0Avg.padStart(5)}  ${p1Avg.padStart(5)}`);
  }
}

function printTowerStats(results: readonly GameResult[]): void {
  let p0Towers = 0;
  let p1Towers = 0;
  for (const r of results) {
    p0Towers += r.players[0].towerCount;
    p1Towers += r.players[1].towerCount;
  }

  const n = results.length;
  console.log('\n--- Average Final Tower Count ---');
  console.log(`  P0: ${(p0Towers / n).toFixed(1)}`);
  console.log(`  P1: ${(p1Towers / n).toFixed(1)}`);
}

const args = parseArgs(process.argv);

console.log(`Simulating ${args.games} games (grid: ${args.gridType}, tick: ${args.tickMs}ms, max: ${formatDuration(args.maxTimeSec)})...`);

const startTime = Date.now();

const report = runBatch({
  games: args.games,
  gridType: args.gridType,
  tickMs: args.tickMs,
  maxGameTimeSec: args.maxTimeSec,
  onGameComplete: (i, result) => {
    const winnerStr = result.winner === -1 ? 'draw' : `P${result.winner} wins`;
    process.stdout.write(`  Game ${(i + 1).toString().padStart(3)}/${args.games}: ${winnerStr} in ${formatDuration(result.durationSec)}\n`);
  },
});

const elapsedSec = ((Date.now() - startTime) / 1000).toFixed(1);
console.log(`\nCompleted in ${elapsedSec}s wall time`);

if (args.json) {
  console.log('\n--- JSON Output ---');
  console.log(JSON.stringify(report, null, 2));
} else {
  printReport(report);
}
