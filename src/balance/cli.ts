/**
 * Unified balance testing CLI.
 *
 * Usage:
 *   npx tsx src/balance/cli.ts math              -- Pure mathematical analysis (instant)
 *   npx tsx src/balance/cli.ts ablation [--games N] [--grid TYPE]  -- Feature ablation
 *   npx tsx src/balance/cli.ts tournament [--games N] [--grid TYPE] -- Round-robin tournament
 *   npx tsx src/balance/cli.ts full [--games N] [--grid TYPE]      -- All analyses
 */
import type { GridType } from '../grid/generators';
import { runAblation, type AblationResult } from './AblationRunner';
import { runTournament, type TournamentResult } from './TournamentRunner';
import { ALL_PROFILES } from './AIProfiles';

const args = process.argv.slice(2);
const command = args[0] ?? 'help';

function getArg(name: string, fallback: string): string {
  const idx = args.indexOf(name);
  return idx >= 0 && idx + 1 < args.length ? args[idx + 1] : fallback;
}

const gamesPerTest = parseInt(getArg('--games', '30'), 10);
const gridType = getArg('--grid', 'random') as GridType;
const jsonOutput = args.includes('--json');

function hr(char = '─', len = 80): string { return char.repeat(len); }
function pad(s: string, len: number, align: 'left' | 'right' = 'right'): string {
  return align === 'right' ? s.padStart(len) : s.padEnd(len);
}

// ---------------------------------------------------------------------------
// Math report (delegates to math-report.ts equivalent)
// ---------------------------------------------------------------------------
async function runMathReport(): Promise<void> {
  console.log('\n  Running mathematical balance analysis...\n');
  await import('./math-report.js');
}

// ---------------------------------------------------------------------------
// Ablation
// ---------------------------------------------------------------------------
function printAblationResults(results: AblationResult[]): void {
  if (jsonOutput) {
    console.log(JSON.stringify(results.map(r => ({
      feature: r.feature,
      baselineP0WinRate: r.baselineP0WinRate,
      restrictedP0WinRate: r.restrictedP0WinRate,
      delta: r.delta,
      impact: r.impact,
    })), null, 2));
    return;
  }

  console.log('\n' + hr('='));
  console.log('  ABLATION TEST RESULTS');
  console.log(`  ${gamesPerTest} games per test, grid: ${gridType}`);
  console.log(`  P0 is restricted, P1 is unrestricted. Negative delta = feature matters.`);
  console.log(hr('=') + '\n');

  console.log(`  ${pad('Feature', 16, 'left')} ${pad('Baseline', 10)} ${pad('Without', 10)} ${pad('Delta', 10)} ${pad('Impact', 10)}`);
  console.log(`  ${hr('-', 60)}`);

  for (const r of results) {
    const baseStr = (r.baselineP0WinRate * 100).toFixed(1) + '%';
    const restStr = (r.restrictedP0WinRate * 100).toFixed(1) + '%';
    const deltaStr = (r.delta >= 0 ? '+' : '') + (r.delta * 100).toFixed(1) + '%';
    const impactStr = r.impact.toUpperCase();
    console.log(`  ${pad(r.feature, 16, 'left')} ${pad(baseStr, 10)} ${pad(restStr, 10)} ${pad(deltaStr, 10)} ${pad(impactStr, 10)}`);
  }
  console.log();
}

function runAblationCommand(): void {
  console.log(`\n  Running ablation tests (${gamesPerTest} games/test, ${gridType} grid)...`);
  let totalGames = 0;

  const results = runAblation({
    gamesPerTest,
    gridType,
    onProgress: (feature, phase, idx) => {
      totalGames++;
      if (idx === 0) {
        process.stdout.write(`  [${feature}] ${phase}...`);
      }
      if ((idx + 1) % 10 === 0 || idx === gamesPerTest - 1) {
        process.stdout.write(` ${idx + 1}`);
      }
      if (idx === gamesPerTest - 1) {
        process.stdout.write('\n');
      }
    },
  });

  console.log(`  Total games: ${totalGames}`);
  printAblationResults(results);
}

// ---------------------------------------------------------------------------
// Tournament
// ---------------------------------------------------------------------------
function printTournamentResults(result: TournamentResult): void {
  if (jsonOutput) {
    console.log(JSON.stringify({
      overallWinRates: result.overallWinRates,
      matchups: result.matchups.map(m => ({
        p0: m.p0Profile,
        p1: m.p1Profile,
        p0WinRate: m.p0WinRate,
        p1WinRate: m.p1WinRate,
        avgDuration: m.avgDurationSec,
      })),
    }, null, 2));
    return;
  }

  console.log('\n' + hr('='));
  console.log('  ROUND-ROBIN TOURNAMENT RESULTS');
  console.log(`  ${gamesPerTest} games per matchup, grid: ${gridType}`);
  console.log(hr('=') + '\n');

  console.log('  OVERALL RANKINGS:');
  console.log(`  ${pad('#', 4, 'left')} ${pad('Profile', 18, 'left')} ${pad('Avg Win Rate', 14)}`);
  console.log(`  ${hr('-', 38)}`);
  result.overallWinRates.forEach((entry, i) => {
    console.log(`  ${pad(String(i + 1), 4, 'left')} ${pad(entry.profile, 18, 'left')} ${pad((entry.winRate * 100).toFixed(1) + '%', 14)}`);
  });

  console.log('\n  WIN RATE MATRIX (row vs column):');
  const names = result.profiles;
  const colW = 12;
  const header = '  ' + pad('', 16, 'left') + names.map(n => pad(n.slice(0, colW - 1), colW)).join('');
  console.log(header);
  console.log('  ' + hr('-', 16 + names.length * colW));

  for (let i = 0; i < names.length; i++) {
    const cells = result.winMatrix[i].map((wr, j) => {
      if (i === j) return pad('-', colW);
      return pad((wr * 100).toFixed(0) + '%', colW);
    }).join('');
    console.log(`  ${pad(names[i], 16, 'left')}${cells}`);
  }

  console.log('\n  MATCHUP DETAILS:');
  for (const m of result.matchups) {
    console.log(`  ${m.p0Profile} vs ${m.p1Profile}: ${(m.p0WinRate * 100).toFixed(0)}% / ${(m.p1WinRate * 100).toFixed(0)}% (draws: ${(m.drawRate * 100).toFixed(0)}%, avg ${m.avgDurationSec}s)`);
  }
  console.log();
}

function runTournamentCommand(): void {
  console.log(`\n  Running round-robin tournament (${gamesPerTest} games/matchup, ${gridType} grid)...`);
  console.log(`  Profiles: ${ALL_PROFILES.map(p => p.name).join(', ')}\n`);

  const result = runTournament(ALL_PROFILES, {
    gamesPerMatchup: gamesPerTest,
    gridType,
    onMatchupStart: (p0, p1) => {
      process.stdout.write(`  ${p0} vs ${p1}...`);
    },
    onGameComplete: (_p0, _p1, idx) => {
      if ((idx + 1) % 10 === 0 || idx === gamesPerTest - 1) {
        process.stdout.write(` ${idx + 1}`);
      }
      if (idx === gamesPerTest - 1) {
        process.stdout.write('\n');
      }
    },
  });

  printTournamentResults(result);
}

// ---------------------------------------------------------------------------
// Help
// ---------------------------------------------------------------------------
function printHelp(): void {
  console.log(`
  Particle Defence -- Balance Testing CLI

  Usage: npx tsx src/balance/cli.ts <command> [options]

  Commands:
    math         Pure mathematical analysis (instant, no simulation)
    ablation     Feature ablation tests (disable one feature at a time)
    tournament   Round-robin tournament across AI strategy profiles
    full         Run all analyses

  Options:
    --games N    Games per test/matchup (default: 30)
    --grid TYPE  Grid type: random, maze (default: random)
    --json       Output raw JSON instead of formatted tables
    --help       Show this help message
`);
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------
async function main(): Promise<void> {
  switch (command) {
    case 'math':
      await runMathReport();
      break;
    case 'ablation':
      runAblationCommand();
      break;
    case 'tournament':
      runTournamentCommand();
      break;
    case 'full':
      await runMathReport();
      runAblationCommand();
      runTournamentCommand();
      break;
    case 'help':
    case '--help':
      printHelp();
      break;
    default:
      console.error(`  Unknown command: ${command}`);
      printHelp();
      process.exit(1);
  }
}

main().catch(console.error);
