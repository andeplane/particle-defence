---
name: "generate-balance-report"
description: "Run a full round-robin balance tournament and write results to BALANCE_REPORT.md"
argument-hint: "--games N (default 100) --grid TYPE (default random)"
user-invocable: true
disable-model-invocation: false
---

## User Input

```text
$ARGUMENTS
```

Parse `--games N` (default: 100) and `--grid TYPE` (default: random) from the arguments if provided.

## Task

Generate a full balance report for the Particle Defence game by running a round-robin tournament across all AI strategy profiles and writing the results to `BALANCE_REPORT.md`.

### Step 1 — Run the tournament

Run:
```
npm run balance-test -- tournament --games <N> --grid <TYPE>
```

Use the `--games` and `--grid` values from arguments (defaults: 100 games, random grid).

Wait for it to complete and capture the full output. The tournament runs all 6 AI profiles (Balanced, Rush, Economy, TowerFortress, GlassCannon, Tank) against each other.

### Step 2 — Read the current AI profiles

Read `src/balance/AIProfiles.ts` to get the current profile definitions — their `upgradeWeights`, `towersEnabled`, `nukeEnabled`, etc. You'll use this to write accurate strategy descriptions.

### Step 3 — Run tests and build

Run:
```
npm run test:run && npm run build
```

Capture whether they pass.

### Step 4 — Write BALANCE_REPORT.md

Write `BALANCE_REPORT.md` in the project root with the following structure:

```markdown
# Balance Report — <Month Year>

## Tournament Results

Round-robin across all 6 AI strategy profiles, <N> games per matchup, <GRID> grid.

\`\`\`
<paste the full tournament output block from npm run balance-test>
\`\`\`

---

## Strategy Profiles

For each profile (ordered by overall ranking), write a section:

### <ProfileName> (<WinRate>%)
**Identity**: One sentence describing the strategy's core identity and win condition.
**Weights**: key weight values from upgradeWeights (e.g. attack:2.0, health:1.5), plus towersEnabled/nukeEnabled if disabled
**Counters**: profiles this one beats (with win rate %)
**Loses to**: profiles this one loses to (with win rate %)

---

## Counter-Play Web

Write a short paragraph describing the overall balance health — whether there's a dominant strategy, key counter triangles, and the spread.

Include an ASCII diagram showing the key counter relationships (who beats whom and by how much).

List 2–3 key counter triangles found in the data.

---

## Verification

- All <N> tests pass (`npm run test:run`) — or note failures
- Production build succeeds (`npm run build`) — or note failures
```

Use the actual tournament output numbers. Derive counters/loses-to from the win rate matrix (wins = row beats column with >52%, loses = row loses to column with <48%).

After writing the file, confirm completion and show the spread (top minus bottom win rate).
