---
name: "run-balance-iterations"
description: "Iteratively run balance tournaments and tune AI profiles until the game is balanced. Loops until spread < target or max iterations reached."
argument-hint: "--games N --grid TYPE --max-iter N --target-spread N"
user-invocable: true
disable-model-invocation: false
---

## User Input

```text
$ARGUMENTS
```

Parse from arguments:
- `--games N` — games per matchup per iteration (default: 30, faster iterations)
- `--grid TYPE` — grid type: random or maze (default: random)
- `--max-iter N` — maximum balance iterations before stopping (default: 10)
- `--target-spread N` — acceptable spread in percentage points (default: 15)

## Task

Run iterative balance testing on the Particle Defence game. Each iteration runs a tournament, diagnoses issues, and proposes targeted fixes to `src/balance/AIProfiles.ts` until the tournament spread is within the target or max iterations are exhausted.

### Background

Balance is measured by the **spread**: top profile win rate minus bottom profile win rate. A spread under ~15pp means no strategy dominates. The goal is rich counter-play with multiple overlapping triangles, not a single dominant strategy.

The tuning lever is `src/balance/AIProfiles.ts` — adjust `upgradeWeights` multipliers per profile. Higher weight = AI prioritizes that upgrade more. Do NOT touch `src/config.ts` game constants.

### Iteration Loop

Repeat up to `--max-iter` times:

**A. Run the tournament**

```
npm run balance-test -- tournament --games <N> --grid <TYPE>
```

**B. Parse results**

From the output, extract:
- Overall rankings with win rates
- The win rate matrix (who beats whom)
- Current spread (highest - lowest win rate)

**C. Evaluate**

If spread ≤ target AND no profile has win rate > 60%:
- Report success: "Balance achieved in iteration N. Spread: Xpp."
- Stop the loop.

**D. Diagnose issues**

Look for:
1. **Dominant profile** (win rate > 60%) — its weights are too high overall, or it has no hard counter
2. **Weak profile** (win rate < 40%) — its weights need a boost in its core identity
3. **Missing counter triangles** — if one profile beats everything, find a profile that should counter it and strengthen that counter relationship
4. **Over-powered specific matchup** (one profile beats another >75%) — the loser's core strengths don't counter the winner's core weaknesses

**E. Propose and apply targeted fixes**

For each issue, make a small targeted adjustment to `src/balance/AIProfiles.ts`:
- Adjust `upgradeWeights` by ±0.2–0.4 per step (avoid large jumps)
- Only change the profiles directly involved in the imbalance
- Preserve each profile's identity (Rush stays fast, Tank stays tanky, etc.)
- Document what you changed and why in a comment above the profile

Read the current `src/balance/AIProfiles.ts`, apply the changes with Edit, then continue to the next iteration.

**F. Report iteration summary**

After each iteration, print:
```
Iteration N: spread=Xpp, top=ProfileName(X%), bottom=ProfileName(X%)
Changes: [list what was adjusted]
```

### After the loop

Report final state:
- Final spread and rankings
- Summary of all changes made across iterations
- Whether balance target was achieved
- If not achieved after max iterations, describe remaining issues and what to try next

If balance was achieved, suggest running `/generate-balance-report` with more games (e.g. `--games 100`) to produce the final authoritative report.
