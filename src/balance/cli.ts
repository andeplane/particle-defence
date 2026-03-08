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
import { runAblation, type AblationReport } from './AblationRunner';
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
function printAblationResults(report: AblationReport): void {
  const { results, baselineP0WinRate, baselineAvgDuration, baselineDurationRange } = report;
  const hasSymmetric = results.some(r => r.symmetricP0WinRate !== undefined);

  if (jsonOutput) {
    console.log(JSON.stringify({
      baselineP0WinRate,
      baselineAvgDuration,
      baselineDurationRange,
      features: results.map(r => ({
        feature: r.feature,
        restrictedP0WinRate: r.restrictedP0WinRate,
        delta: r.delta,
        impact: r.impact,
        avgDuration: r.avgDurationRestricted,
        symmetricP0WinRate: r.symmetricP0WinRate,
        symmetricDelta: r.symmetricDelta,
      })),
    }, null, 2));
    return;
  }

  console.log('\n' + hr('='));
  console.log('  ABLATION TEST RESULTS');
  console.log(`  ${gamesPerTest} games per test, grid: ${gridType}`);
  console.log(`  Shared baseline: P0 win rate = ${(baselineP0WinRate * 100).toFixed(1)}%, avg duration = ${baselineAvgDuration}s (range: ${baselineDurationRange.min}-${baselineDurationRange.max}s)`);
  console.log(`  P0 is restricted, P1 is unrestricted. Negative delta = feature matters.`);
  if (hasSymmetric) {
    console.log(`  "Symmetric" column: BOTH players restricted (tests true game impact, not AI gold-waste)`);
  }
  console.log(hr('=') + '\n');

  const symHeader = hasSymmetric ? ` ${pad('Sym WR', 10)} ${pad('Sym Δ', 10)}` : '';
  console.log(`  ${pad('Feature', 16, 'left')} ${pad('P0 Only', 10)} ${pad('Delta', 10)} ${pad('Impact', 10)}${symHeader} ${pad('Avg Dur', 10)}`);
  console.log(`  ${hr('-', hasSymmetric ? 90 : 60)}`);

  for (const r of results) {
    const restStr = (r.restrictedP0WinRate * 100).toFixed(1) + '%';
    const deltaStr = (r.delta >= 0 ? '+' : '') + (r.delta * 100).toFixed(1) + '%';
    const impactStr = r.impact.toUpperCase();
    const durStr = r.avgDurationRestricted + 's';

    let symStr = '';
    if (hasSymmetric && r.symmetricP0WinRate !== undefined) {
      const symWR = (r.symmetricP0WinRate * 100).toFixed(1) + '%';
      const symD = (r.symmetricDelta! >= 0 ? '+' : '') + (r.symmetricDelta! * 100).toFixed(1) + '%';
      symStr = ` ${pad(symWR, 10)} ${pad(symD, 10)}`;
    } else if (hasSymmetric) {
      symStr = ` ${pad('-', 10)} ${pad('-', 10)}`;
    }

    console.log(`  ${pad(r.feature, 16, 'left')} ${pad(restStr, 10)} ${pad(deltaStr, 10)} ${pad(impactStr, 10)}${symStr} ${pad(durStr, 10)}`);
  }
  console.log();
}

let lastAblationReport: AblationReport | null = null;

function runAblationCommand(): AblationReport {
  const symmetric = !args.includes('--no-symmetric');
  console.log(`\n  Running ablation tests (${gamesPerTest} games/test, ${gridType} grid, symmetric=${symmetric})...`);
  let totalGames = 0;

  const report = runAblation({
    gamesPerTest,
    gridType,
    symmetric,
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
  printAblationResults(report);
  lastAblationReport = report;
  return report;
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

let lastTournamentResult: TournamentResult | null = null;

function runTournamentCommand(): TournamentResult {
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
  lastTournamentResult = result;
  return result;
}

// ---------------------------------------------------------------------------
// No-Nuke Tournament (tests strategy diversity without nuke domination)
// ---------------------------------------------------------------------------
let lastNoNukeTournament: TournamentResult | null = null;

function runNoNukeTournament(): TournamentResult {
  const noNukeProfiles = ALL_PROFILES.map(p => ({
    ...p,
    name: p.name,
    nukeEnabled: false,
  }));

  console.log(`\n  Running NO-NUKE tournament (${gamesPerTest} games/matchup, ${gridType} grid)...`);
  console.log(`  All profiles have nuke disabled to test pure strategy diversity.\n`);

  const result = runTournament(noNukeProfiles, {
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
  lastNoNukeTournament = result;
  return result;
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
// Diagnostic Summary
// ---------------------------------------------------------------------------
function printDiagnosticSummary(): void {
  console.log('\n' + hr('='));
  console.log('  BALANCE DIAGNOSTIC SUMMARY');
  console.log(hr('=') + '\n');

  const issues: string[] = [];
  const findings: string[] = [];

  if (lastAblationReport) {
    const abl = lastAblationReport;
    findings.push(`  Baseline symmetry: P0 wins ${(abl.baselineP0WinRate * 100).toFixed(1)}% (ideal: 50%). Avg game: ${abl.baselineAvgDuration}s (${abl.baselineDurationRange.min}-${abl.baselineDurationRange.max}s)`);

    const hasSymmetric = abl.results.some(r => r.symmetricP0WinRate !== undefined);

    for (const r of abl.results) {
      if (r.impact === 'critical' || r.impact === 'high') {
        if (r.delta < 0) {
          issues.push(`  [${r.impact.toUpperCase()}] "${r.feature}" is overpowered: removing it drops P0 win rate by ${(-r.delta * 100).toFixed(1)}pp`);
        } else {
          let explanation = `disabling it HELPS P0 by +${(r.delta * 100).toFixed(1)}pp`;
          if (hasSymmetric && r.symmetricP0WinRate !== undefined) {
            const symClose = Math.abs(r.symmetricDelta!) < 0.10;
            if (symClose) {
              explanation += ` (symmetric: ${(r.symmetricP0WinRate * 100).toFixed(1)}%, confirming AI wastes gold on it)`;
            } else {
              explanation += ` (symmetric: ${(r.symmetricP0WinRate * 100).toFixed(1)}%, suggests deeper balance issue)`;
            }
          }
          issues.push(`  [${r.impact.toUpperCase()}] "${r.feature}" is a TRAP: ${explanation}`);
        }
      }
    }

    const nukeDurations = abl.results.find(r => r.feature === 'nuke');
    if (nukeDurations && Math.abs(nukeDurations.avgDurationRestricted - abl.baselineAvgDuration) > 60) {
      findings.push(`  Nuke affects game length: baseline avg ${abl.baselineAvgDuration}s vs no-nuke ${nukeDurations.avgDurationRestricted}s`);
    }

    const trivial = abl.results.filter(r => r.impact === 'minimal');
    if (trivial.length > 0) {
      findings.push(`  Features with minimal impact: ${trivial.map(r => r.feature).join(', ')}`);
    }
  }

  if (lastTournamentResult) {
    const t = lastTournamentResult;
    const dominant = t.overallWinRates.filter(e => e.winRate > 0.60);
    const weak = t.overallWinRates.filter(e => e.winRate < 0.40);

    if (dominant.length > 0) {
      for (const d of dominant) {
        issues.push(`  [HIGH] "${d.profile}" dominates tournament at ${(d.winRate * 100).toFixed(1)}% avg win rate (threshold: <60%)`);
      }
    }
    if (weak.length > 0) {
      for (const w of weak) {
        findings.push(`  "${w.profile}" is weak at ${(w.winRate * 100).toFixed(1)}% avg win rate`);
      }
    }

    const spread = t.overallWinRates[0].winRate - t.overallWinRates[t.overallWinRates.length - 1].winRate;
    findings.push(`  Tournament strategy spread: ${(spread * 100).toFixed(1)}pp (top to bottom). Ideal: <20pp`);

    for (const m of t.matchups) {
      if (m.p0WinRate >= 0.80 || m.p1WinRate >= 0.80) {
        const winner = m.p0WinRate >= 0.80 ? m.p0Profile : m.p1Profile;
        const loser = m.p0WinRate >= 0.80 ? m.p1Profile : m.p0Profile;
        const rate = Math.max(m.p0WinRate, m.p1WinRate);
        issues.push(`  [MEDIUM] Hard counter: "${winner}" beats "${loser}" ${(rate * 100).toFixed(0)}% of the time`);
      }
    }
  }

  if (lastNoNukeTournament && lastTournamentResult) {
    const withNuke = lastTournamentResult;
    const noNuke = lastNoNukeTournament;
    const nukeSpread = withNuke.overallWinRates[0].winRate - withNuke.overallWinRates[withNuke.overallWinRates.length - 1].winRate;
    const noNukeSpread = noNuke.overallWinRates[0].winRate - noNuke.overallWinRates[noNuke.overallWinRates.length - 1].winRate;
    findings.push(`  Nuke effect on diversity: with nuke spread=${(nukeSpread * 100).toFixed(1)}pp, without nuke spread=${(noNukeSpread * 100).toFixed(1)}pp`);

    const noNukeDominant = noNuke.overallWinRates.filter(e => e.winRate > 0.60);
    if (noNukeDominant.length === 0 && withNuke.overallWinRates.some(e => e.winRate > 0.60)) {
      findings.push(`  Removing nuke eliminates strategy dominance -- nuke is the primary balance distorter`);
    }
    const noNukeTop = noNuke.overallWinRates[0];
    findings.push(`  No-nuke best strategy: "${noNukeTop.profile}" at ${(noNukeTop.winRate * 100).toFixed(1)}%`);
  }

  if (issues.length > 0) {
    console.log('  ISSUES FOUND:');
    for (const issue of issues) console.log(issue);
    console.log();
  } else {
    console.log('  No major balance issues detected.\n');
  }

  if (findings.length > 0) {
    console.log('  ADDITIONAL FINDINGS:');
    for (const f of findings) console.log(f);
    console.log();
  }

  console.log(hr('=') + '\n');
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
      runNoNukeTournament();
      printDiagnosticSummary();
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
