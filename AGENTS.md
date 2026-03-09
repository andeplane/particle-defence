# Tower Defence Game - Agent Documentation

## Overview
A 2-player tower defence game built with Phaser 3, TypeScript, and Vite. Players spawn particles from their bases that navigate through procedurally generated mazes to attack the enemy base. The game features an upgrade system, nuclear weapons, and real-time particle combat. Supports **1 Player vs AI** and **2 Player** modes selected from the main menu.

## Project Structure

### Core Files
- **`src/main.ts`** - Entry point, initializes Phaser game with MenuScene, MapSelectScene, GameScene, UIScene, PostGameStatsScene, and HowToPlayScene
- **`src/config.ts`** - **ALL GAME CONFIGURATION** - Contains all game constants, parameters, and configuration values
- **`index.html`** - HTML entry point with game container

### Scenes
- **`src/scenes/MenuScene.ts`** - Main menu with mode selection (1 Player vs AI / 2 Player) and How to Play button. Navigates to MapSelectScene or HowToPlayScene
- **`src/scenes/MapSelectScene.ts`** - Map type selection (Random, Maze), starts GameScene with `{ mode, gridType }`
- **`src/scenes/GameScene.ts`** - Main game logic, particle spawning, collision detection, base damage, win conditions. Accepts mode and gridType from init, runs AIController when mode is 'ai'
- **`src/scenes/UIScene.ts`** - UI overlay with HP bars, gold display, upgrade buttons, nuke buttons, keyboard controls. Hides P2 controls and labels as "AI" when mode is 'ai'
- **`src/scenes/HowToPlayScene.ts`** - In-game help screen with 4 tabs (Overview, Tech Tree, Combat, Strategies). Accessible from MenuScene via "How to Play" button or [H] key. Data-driven: all numbers pulled from CONFIG at runtime via `howToPlayData.ts`. Scrollable content, ESC to return to menu
- **`src/scenes/howToPlayData.ts`** - Pure functions that generate content sections from CONFIG values. Exports `getTabContent(tabId)` returning `ContentSection[]` for each tab. No duplicated data -- uses `getUpgradeCost()`, `getLaserStats()`, `getSlowStats()`, `computeMaxLevels()`, etc.
- **`src/scenes/PostGameStatsScene.ts`** - Post-game statistics screen with 9 dual-series timeline graphs (AoE-style). Receives `MatchStats` from GameScene on game over. Displays blue (P1) vs red (P2) line charts with glow effects, grid lines, nuke event markers, and legends. Click to return to menu

### Game Entities
- **`src/player.ts`** - Player class with base HP, gold, kills, upgrade levels, nuke cooldown management, and tower research state
- **`src/particles/`** - Particle type hierarchy:
 - **`AbstractParticle.ts`** - Abstract base class with shared state, movement logic, and lifecycle hooks
 - **`BasicParticle.ts`** - Default particle type (current behavior)
 - **`TowerCarrierParticle.ts`** - Carrier particle that delivers towers to placement sites. Moves through maze, vulnerable but does not attack
 - **`LaserTowerParticle.ts`** - Stationary laser tower. Fires at nearest enemy in range. Properties: damage, attackSpeed, range (upgradeable)
 - **`SlowTowerParticle.ts`** - Stationary slow tower. Slows all enemies in range. Properties: slowFactor, range (upgradeable)
 - **`towers.ts`** - Shared tower types, stat calculation helpers (`getLaserStats`, `getSlowStats`)
 - **`GameContext.ts`** - Context interface passed to particle hooks (grid, spatial hash, players, spawnExplosion)
 - **`index.ts`** - Re-exports
- **`src/grid/`** - Grid, cell effects, and map generators:
  - **`Grid.ts`** - Grid class with cells, isWall, isInBase, cellW/cellH, hasPath
  - **`CellEffect.ts`** - Cell effect type definitions (discriminated union) and `ICellEffectMap` interface
  - **`CellEffectMap.ts`** - Cell effect map implementation: manages per-cell effects, queries, timer/HP updates, and cell ownership (enterCell/leaveCell, getOwnerAt, forEachOwnedCell)
  - **`generators/random.ts`** - Percolation-based random grid
  - **`generators/maze.ts`** - Recursive backtracker maze with extra carved paths
  - **`generators/index.ts`** - GridType union, generateGrid, re-exports

### Systems
- **`src/ai.ts`** - AIController for single-player and headless modes. Automatically upgrades (prioritizes spawn rate, attack, health), manages towers, and uses nuke when behind or when enemy has many particles. Uses dynamic `opponentId` so it can control either player. Accepts optional `AIProfile` for configurable behavior: `upgradeWeights` (per-type score multipliers), `disabledUpgrades` (hard-block set), `towersEnabled`, `nukeEnabled`
- **`src/collision.ts`** - Collision resolution; calls `onCollide`/`onDeath` hooks, handles bouncing and kill tracking
- **`src/spatial-hash.ts`** - Spatial partitioning for efficient collision detection

### Headless Simulation
- **`src/headless/HeadlessRunner.ts`** - Runs a single AI-vs-AI game without Phaser. Creates a `GameEngine` with no-op callbacks, two `AIController` instances, real grid/collision/spatial-hash, and a `MatchStatsRecorder`. Returns a `GameResult` with winner, duration, player summaries, and full match stats. Supports per-player `AIProfile` overrides via `HeadlessRunConfig.p0Profile` / `p1Profile`
- **`src/headless/BatchRunner.ts`** - Runs N headless games sequentially. Aggregates win rates, draw rate, duration stats (min/max/mean/median), and returns all individual results. Forwards AI profiles to each game
- **`src/headless/cli.ts`** - CLI entry point. Parses args, runs batch, prints summary table with win rates, duration, upgrade distributions, and tower stats
- **`src/headless/types.ts`** - Type definitions: `GameResult`, `PlayerSummary`, `HeadlessRunConfig`, `BatchReport`

### Balance Testing
- **`src/balance/BalanceCalculator.ts`** - Pure mathematical balance analysis. Computes gold efficiency curves, duel outcomes (hits-to-kill), Lanchester power estimates, tower ROI, interest break-even, spawn rate analysis, and automated red flag detection. No simulation needed -- operates purely on config values
- **`src/balance/math-report.ts`** - CLI script that prints all mathematical analysis tables (run via `npm run balance`)
- **`src/balance/AIProfiles.ts`** - 6 predefined AI strategy profiles: Balanced, Rush, Economy, TowerFortress, GlassCannon, Tank. Each profile defines `upgradeWeights` and feature toggles
- **`src/balance/AblationRunner.ts`** - Ablation testing: disables one feature at a time for P0, runs N headless games, measures win rate delta vs symmetric baseline
- **`src/balance/TournamentRunner.ts`** - Round-robin tournament: all AI profiles play each other, produces win-rate matrix and overall rankings
- **`src/balance/cli.ts`** - Unified balance CLI with subcommands: `math`, `ablation`, `tournament`, `full`

### Stats & Post-Game Analytics
- **`src/stats/types.ts`** - Type definitions: `PerSecondSample`, `MatchEvent`, `MatchStats`, `PerPlayer<T>`
- **`src/stats/MatchStatsRecorder.ts`** - Core recorder class. Samples game state at 1Hz, accumulates per-second deltas (kills, gold, damage), computes frontline positions, and provides `rollingKPM()` and `computePower()` static helpers
- **`src/stats/index.ts`** - Barrel re-exports

**How stats integration works**: `GameScene` owns a `MatchStatsRecorder`. Engine callbacks feed event deltas (kills, gold income/spend, base damage, nuke usage, upgrades) into the recorder. Each frame, `recorder.tick()` is called with current particles and players. On game over, `recorder.finalize(winner)` produces a `MatchStats` object passed to `PostGameStatsScene`.

**Graphs rendered** (all with dual blue/red player series):
1. Army Size Over Time
2. Military Power Curve (weighted: health×0.6 + attack×1.2 + speed×0.4 + radius×0.2)
3. Kills / Minute (30s rolling window)
4. Base HP Over Time
5. Gold (Unspent)
6. Total Upgrade Levels (step chart)
7. Population Cap Pressure (alive/max ratio)
8. Damage / Second (unit + base combined)
9. Frontline Position (mean X cell-index of top-20 frontmost particles per player)

## Configuration (`src/config.ts`)

**`src/config.ts` is the single source of truth for ALL game parameters.** Never duplicate concrete values elsewhere; always refer to the config file for current numbers.

Config values are organized into these categories:

- **Resolution & Display** - Game dimensions (scaled by `RESOLUTION_SCALE`), background/floor/wall colors
- **Maze** - Grid dimensions, percolation threshold, base width
- **Particles** - Base health/attack/radius/speed, spawn interval, population caps, drift and stuck detection, `PERCENT_HP_DAMAGE_SCALING` (multiplicative anti-tank), `SPEED_COMBAT_BONUS` (speed combat advantage), `DEFENSE_HP_SCALING_REDUCTION` (defense counters HP scaling), `GLOBAL_DEFENSE_PER_LEVEL` / `GLOBAL_DEFENSE_MAX` (defense outside owned cells)
- **Bases** - Starting HP, damage dealt on reach
- **Economy & Upgrades** - Starting gold, kill reward, nuke reward fraction/timing/cooldown, interest rate settings, per-type base costs (`UPGRADE_COSTS`), cost multiplier
- **Cell Effects** - Default slow factor, damage DPS, temp wall duration/HP, rendering alphas
- **Cell Ownership** - Enemy slow factor, defense base/per-level/max, capture flash settings
- **Towers** - Max per player, carrier HP, research/construction/upgrade costs, laser and slow tower base stats and per-level scaling (including HP per level)
- **Spatial Hash** - Cell size for collision optimization
- **UI** - Font sizes, bar/button dimensions, gap spacing (all resolution-scaled)
- **Visual** - Player colors (hex and string forms)

### Key Formulas and Relationships
- Upgrade cost scales exponentially: `baseCost * UPGRADE_COST_MULTIPLIER ^ level` (via `getUpgradeCost()`)
- Spawn interval decreases linearly with spawnRate upgrades, clamped to `MIN_SPAWN_INTERVAL`
- Defense bonus = `OWNERSHIP_DEFENSE_BASE + level * OWNERSHIP_DEFENSE_PER_LEVEL`, capped at `OWNERSHIP_DEFENSE_MAX`
- Interest rate = `level * INTEREST_RATE_PER_LEVEL`, capped at `MAX_INTEREST_RATE`, applied every `INTEREST_INTERVAL_MS`
- Tower stats scale with level: `getLaserStats(level)` and `getSlowStats(level)` in `towers.ts` compute damage, range, attack speed, and HP at each level

### Helper Functions
- `getUpgradeCost(type, level)` - Particle upgrade cost at given level
- `getTowerUpgradeCost(towerType, level)` - Tower upgrade cost at given level
- `getTowerResearchCost(towerType)` / `getTowerConstructionCost(towerType)` - One-time tower costs
- `UpgradeType` - Type union of all upgrade keys

## Game Mechanics

### Particle Movement
- Particles spawn from their base with random angle
- Navigate through maze using pathfinding (wall avoidance)
- Y-axis uses periodic boundary conditions (wraps top/bottom)
- X-axis clamped to game bounds
- Random drift prevents particles from getting stuck
- Particles prevented from returning to their own base
- Movement speed affected by cell slow effects (enemy slow cells reduce effective dt)
- Enemy temp walls act as impassable walls; particles bounce off them and damage HP walls

### Combat System
- Particles collide when within combined radius distance
- Collision damage delegated to `onCollide(other, context)` hook
- **Default damage formula**: `damage = attack × speedMultiplier × hpScaling`, passed to `takeDamage()` which applies defense: `effectiveAmount = damage × (1 - defenseFactor)`
- **Speed combat bonus**: Faster attackers deal bonus damage. `speedMultiplier = 1 + SPEED_COMBAT_BONUS × max(0, (attacker.speed - target.speed) / PARTICLE_SPEED)`. Rewards speed investment as a direct combat stat, counters slow tanky builds
- **HP scaling (anti-tank)**: Raw HP scaling = `PERCENT_HP_DAMAGE_SCALING × (target.maxHealth / PARTICLE_BASE_HEALTH)`. Defense reduces HP scaling: `hpScaling = 1 + rawHpScaling × (1 - min(1, defenseFactor × DEFENSE_HP_SCALING_REDUCTION))`. This means defense investment directly counters the anti-tank penalty. Only applied when attacker has attack > 0
- **Global defense**: Defense upgrade provides a small damage reduction even outside owned cells (`GLOBAL_DEFENSE_PER_LEVEL` per level, capped at `GLOBAL_DEFENSE_MAX`). Full cell-based defense applies in owned cells. This gives defense-heavy builds (Tank) survivability when pushing through enemy territory
- Tower particles (Laser, Slow) override `onCollide` with their own `TOWER_DAMAGE_REDUCTION` -- they do NOT use the speed/% HP formula
- Elastic collision physics with velocity bouncing
- `onDeath(context)` called when particle dies (override for AoE, etc.)
- Kills award gold and increment kill counter
- Dead particles are cleaned up and removed

### Upgrade System
- 8 upgrade types: health, attack, radius, spawnRate, speed, defense, maxParticles (increases particle cap per level), interestRate (gold interest)
- Costs increase exponentially: `baseCost * UPGRADE_COST_MULTIPLIER ^ level` (see `config.ts`)
- Upgrades affect all future spawned particles
- Upgrade levels tracked per player

### Gold Interest
- Gold earns periodic interest when the interest upgrade is purchased (starts at 0%)
- Rate increases per upgrade level, capped at `MAX_INTEREST_RATE` (see `config.ts`)
- Applied every `INTEREST_INTERVAL_MS`: `gold += floor(gold * rate)` per interval
- Rewards saving gold; interest is discrete (floor rounding)

### Nuclear Weapon
- Instantly kills all enemy particles
- Awards reduced gold (fraction of normal kill reward, see `NUCLEAR_KILL_REWARD_FRACTION`)
- Available after `NUCLEAR_FIRST_AVAILABLE_MS` game time, then subject to `NUCLEAR_COOLDOWN_MS` cooldown

### Cell Effects System
Grid cells can have composable effects layered on top of the base boolean grid. Each cell supports multiple effects from different players simultaneously. Effects are managed by `CellEffectMap` and accessible via `GameContext.cellEffects`.

**Effect Types** (discriminated union in `CellEffect.ts`):
- **`slow`** - Reduces enemy particle speed by `factor` (e.g. 0.4 = 40% speed). Own particles unaffected.
- **`damage`** - Deals `damagePerSecond` to enemy particles standing in the cell. Applied each tick in `GameEngine`.
- **`tempWallTime`** - Temporary wall that blocks enemy particles. Expires after `remainingMs` (countdown from `totalMs`). Rendered with fading opacity and time bar.
- **`tempWallHP`** - Temporary wall that blocks enemy particles. Destroyed when `hp` reaches 0 (attacked by enemy particles that bounce off it). Rendered with HP bar.

**Key architecture**: `owner` field indicates who placed the effect. Effects always target the **enemy** of the owner. Own particles pass through freely.

**Integration points**:
- `AbstractParticle.update()` checks `cellEffects.getSlowFactor()` and `cellEffects.isTempWall()` during movement
- `GameEngine.tick()` calls `cellEffects.update(delta)` to expire timed effects, and `applyCellDamage()` for damage cells
- `GameScene` renders effects overlay at depth 3 using `effectsGfx` graphics object

**Placement**: Use `cellEffects.addEffect(col, row, effect)` to place effects. The placement mechanism (upgrades, abilities, etc.) is not yet implemented — this is the infrastructure layer.

### Cell Ownership
Each grid cell can be "owned" by a player. Ownership is tracked per cell and affects defense.

**Ownership rules**:
- When a particle enters a cell, that player may capture it.
- If player A owns a cell and still has at least one particle in it, ownership is locked to A.
- If player A leaves the cell (no A particles in it) and player B enters, B captures the cell.
- If B enters while A still has particles in the cell, A keeps ownership.

**Defense bonus**: Particles of the owning player receive a damage reduction while standing in that owned cell. Base bonus is `OWNERSHIP_DEFENSE_BASE`. The defense upgrade increases this by `OWNERSHIP_DEFENSE_PER_LEVEL` per level, capped at `OWNERSHIP_DEFENSE_MAX`. Additionally, defense provides a smaller global bonus (`GLOBAL_DEFENSE_PER_LEVEL` per level, capped at `GLOBAL_DEFENSE_MAX`) that applies everywhere, including enemy territory.

**Ownership slow**: Particles moving through enemy-owned cells are slowed by `OWNERSHIP_SLOW_FACTOR`. This stacks multiplicatively with other slow effects. Own-owned and unowned cells do not slow movement.

**Visual feedback**: Owned cells show a subtle team-color tint (low alpha). A brief capture flash (slightly stronger tint) appears when a cell is captured.

**Integration**: `AbstractParticle.update()` calls `cellEffects.enterCell()` and `leaveCell()` on cell transitions. `GameEngine.updateParticleDefenseFactors()` sets each particle's `defenseFactor` based on ownership before collision and cell damage.

### Tower System
- **Research**: Players must first research a tower type (one-time gold cost, see `TOWER_RESEARCH_COSTS`) before they can build it
- **Construction**: Buying a tower (cost in `TOWER_CONSTRUCTION_COSTS`) spawns a `TowerCarrierParticle` from the player's base that moves through the maze
- **Carrier vulnerability**: Carriers have elevated HP (see `TOWER_CARRIER_HP`) and can be attacked and killed before placement (attack=0, doesn't fight back). The PLACE button shows a health bar so players can monitor carrier HP and decide when to deploy
- **Placement**: When the player presses PLACE, the carrier converts to a stationary tower at its current position
- **Tower types**: Laser (fires at nearest enemy in range) and Slow (reduces enemy speed in range)
- **Tower upgrades**: Each placed tower has its own level; upgrading costs gold (scaling with `TOWER_UPGRADE_COST_MULTIPLIER`) and improves damage, range, attack speed, and HP. Stats computed by `getLaserStats(level)` / `getSlowStats(level)` in `towers.ts`
- **HP scaling**: Tower HP increases with each upgrade level (`TOWER_LASER_HP_PER_LEVEL`, `TOWER_SLOW_HP_PER_LEVEL`), making upgraded towers significantly more durable
- **Destructibility**: Towers have HP and can be destroyed by enemy particles colliding with them
- **Nuke interaction**: Nukes kill enemy towers (they're still particles)
- **Max towers**: Configurable via `CONFIG.TOWER_MAX_PER_PLAYER`
- **Visual**: Tower body is a diamond-shaped glow; range shown as translucent circle; laser draws a beam to target; HP bar shown when damaged

### Win Condition
- Game ends when a player's base HP reaches 0
- Winner is the surviving player
- Game over overlay shows winner, then click navigates to PostGameStatsScene
- PostGameStatsScene displays 10 timeline graphs (including Tower Count), then click returns to MenuScene

### Game Modes
- **1 Player vs AI** - Human (P1) vs AI (P2). AI controls upgrades and nuke automatically. P2 UI shows "AI" label and stats.
- **2 Player** - Both players use keyboard controls via hierarchical menu. Each player navigates independently.

## Controls

The UI uses a **Warcraft-style hierarchical menu**. Each player sees top-level category buttons. Pressing a category key opens its submenu; keys are reused within each submenu (context-dependent). **Hover any button** to see a tooltip with description and current/next stats.

### Layout
- P1 buttons are left-anchored on the left half; P2 buttons are left-anchored on the right half.
- Top-level uses a 3+2 grid: P1 keys Q/W/E (top row) + A/S (bottom row). P2 keys I/O/P (top row) + K/L (bottom row).
- A **BACK** button appears in submenus; click it or use the back key to return to categories.

### Top-Level Categories (3+2 grid)

| Category      | P1 Key | P2 Key | Contents |
|---------------|--------|--------|----------|
| BUILD         | Q      | I      | Construct towers (laser, slow) + place carrier |
| RESEARCH      | W      | O      | Unlock tower types (one-time purchase) |
| UPGRADES      | E      | P      | All particle stat upgrades |
| ABILITIES     | A      | K      | Nuke |
| TOWERS        | S      | L      | Manage/upgrade placed towers |

### Back
- **P1**: Tab or click BACK button
- **P2**: Backspace or click BACK button

### Research Submenu (P1 keys / P2 keys)
- **Q/I** - Research Laser Tower (one-time cost, see `config.ts`)
- **W/O** - Research Slow Tower (one-time cost, see `config.ts`)

### Construction Submenu (P1 keys / P2 keys)
- **Q/I** - Build Laser Tower (spawns carrier) -- greyed if not researched
- **W/O** - Build Slow Tower (spawns carrier) -- greyed if not researched
- **E/P** - PLACE (converts active carrier to tower at its position; shows carrier HP bar)

### Upgrades Submenu (P1 keys / P2 keys)
- **Q/U** - Upgrade Health
- **W/I** - Upgrade Attack
- **E/O** - Upgrade Radius
- **R/P** - Upgrade Spawn Rate
- **A/H** - Upgrade Speed
- **S/J** - Upgrade Max Particles (increases population cap per level)
- **D/K** - Upgrade Defense (ownership defense bonus, capped at `OWNERSHIP_DEFENSE_MAX`)
- **F/L** - Upgrade Interest Rate (periodic gold interest, capped at `MAX_INTEREST_RATE`)

### Abilities Submenu (P1 keys / P2 keys)
- **Q/I** - Launch Nuke

### Towers Submenu (P1 keys / P2 keys)
- **Q/I** - Select previous tower
- **W/O** - Select next tower
- **E/P** - Upgrade selected tower (shows cost, stat delta)

*In 1 Player vs AI mode, P2 controls are hidden; the AI handles research, construction, placement, and upgrades automatically.*

## Technical Details

### Rendering
- Uses Phaser 3 WebGL renderer
- Particles rendered with glow textures (additive blending)
- Trail particles follow each unit
- Explosion effects on kills and base hits
- Camera shake on base hits and nukes

### Performance Optimizations
- Spatial hash for collision detection (O(n) instead of O(n²))
- Particle pooling/capping to limit total units
- Stuck particle detection and respawning
- Efficient collision pair tracking (Cantor pairing function)

### Grid Generation
- **Random** - Percolation algorithm with configurable threshold; retries until path exists
- **Maze** - Recursive backtracker creates corridors; extra paths carved (~15%) for multiple routes
- Both generators ensure path exists between bases via `grid.hasPath()`
- Base areas always walkable

## Development

### Build & Run
- `npm run dev` - Start development server (Vite)
- `npm run build` - Build for production
- `npm run preview` - Preview production build
- `npm run simulate` - Run headless AI-vs-AI simulation (see Headless Simulation below)
- `npm run balance` - Run mathematical balance analysis
- `npm run balance-test` - Run balance test CLI (ablation, tournament, full)

### Before Committing and Pushing
**ALWAYS run tests and CI steps before committing and pushing:**
- `npm run test:run` - Run all tests to ensure nothing is broken
- `npm run build` - Verify the project builds successfully
- Ensure all tests pass and the build completes without errors before committing

### Dependencies
- **phaser**: ^3.90.0 - Game framework
- **typescript**: ~5.9.3 - TypeScript compiler
- **vite**: ^7.3.1 - Build tool and dev server
- **vitest**: ^4.0.18 - Testing framework

### TypeScript Config
- Uses ES modules (`"type": "module"`)
- TypeScript config in `tsconfig.json`

## Testing

**IMPORTANT: Tests must be added for most new features and changes. Always follow the testing patterns defined in `.cursor/rules/testing-patterns.mdc`.**

### Test Framework
- **Vitest** - Unit testing framework
- Test files must be named `<something>.spec.ts(x)`
- Run tests: `npm run test` (watch mode) or `npm run test:run` (single run)
- Always run tests after making changes

### Testing Requirements
- **Add tests for most new code** - New features, utilities, services, and business logic should have tests
- **Test file naming**: `<module>.spec.ts` (e.g., `player.spec.ts`, `collision.spec.ts`)
- **Test structure**: Use Arrange-Act-Assert pattern for clarity
- **Type safety**: All mocks must be type-safe; never use `any`
- **Mocking strategy**: Prefer dependency injection over `vi.mock`; use context providers for React hooks
- **Helper functions**: Extract reusable test utilities to bottom of test files or `src/__mocks__/`

### Key Testing Patterns

#### Mocking
- Prefer `vi.fn(() => ...)` for consistent mock behavior
- Use `vi.mocked()` when reconfiguring mocks per test
- Prefer context injection over `vi.mock` for better test isolation
- Use `Partial<T>` for type-safe partial mocks

#### Test Structure
- Use Arrange-Act-Assert comments **only for tests with more than ~10-15 statements** (optional for shorter tests)

```typescript
describe(MyService.name, () => {
  let service: MyService;
  let mockDep: MockDependency;

  beforeEach(() => {
    mockDep = {
      fetch: vi.fn(() => Promise.resolve(mockData)),
    };
    service = new MyService(mockDep);
  });

  it('should handle specific behavior', () => {
    const input = createTestInput();
    const result = service.process(input);
    expect(result).toEqual(expectedOutput);
  });
});
```

#### Helper Functions
- Place helper functions at bottom of test files
- Use `src/__mocks__/` for shared mock data factories
- Use `.test` TLD for fake URLs (RFC 2606)

### Existing Test Coverage
Tests exist for:
- Game engine (interest application, compound steps, rounding, tower lifecycle)
- Grid generation (random, maze, hourglass, lanes, islands, rooms, fortress, pathfinding)
- Cell effect map (add/remove, queries, timer expiry, HP damage, pixel conversion, ownership)
- Collision detection
- Spatial hash
- Player logic
- AI controller (opponent index, nuke decisions, upgrade scoring, tower actions)
- Particle behavior (including cell effect integration: slow, temp wall bounce, wall damage)
- Tower particles (laser, slow, carrier)
- Configuration helpers
- Match stats recorder (sampling, deltas, frontline, rolling KPM, events, finalize)
- Headless simulation (HeadlessRunner end-to-end, BatchRunner aggregation)

**See `.cursor/rules/testing-patterns.mdc` for complete testing standards and examples.**

## Headless Simulation

Runs the exact same `GameEngine.tick()` loop as the browser game, but without Phaser rendering. Two AI controllers play each other. Useful for balance testing and AI training.

### Running Simulations
```bash
# Quick: 10 games on random grid
npm run simulate

# Custom: 50 games on maze grid
npm run simulate -- --games 50 --grid maze

# All options
npm run simulate -- --games 100 --grid random --tick-ms 1000 --max-time 1800 --json
```

### CLI Options
- `--games N` - Number of games to simulate (default: 10)
- `--grid TYPE` - Grid type: random, maze, hourglass, lanes, islands, rooms, fortress (default: random)
- `--tick-ms N` - Simulation tick size in ms; larger = faster but less precise (default: 1000)
- `--max-time N` - Max game duration in seconds before declaring a draw (default: 1800)
- `--json` - Output raw JSON results for programmatic analysis

### Architecture
- `GameEngine` supports `AIMode: 'none' | 'single' | 'both'` via `init()`. The `'both'` mode creates two AI controllers (one per player)
- `GameEngineDependencies.createAIController` is a factory `(playerId: 0 | 1) => AIController` that creates an AI for a specific player
- `HeadlessRunner.runHeadlessGame()` orchestrates a single game: creates grid, engine with stats-recording callbacks, runs tick loop, returns `GameResult`
- `BatchRunner.runBatch()` runs N games and aggregates statistics into a `BatchReport`

### Output
The CLI prints: win rates, game duration stats, average final upgrade levels per player, and tower counts. With `--json`, full `BatchReport` (including per-game `MatchStats` with 1Hz samples) is printed for offline analysis.

### Performance
A 30-minute simulated game takes ~2-3 seconds wall time at 1000ms ticks (default). Use smaller ticks (e.g., `--tick-ms 100` or `--tick-ms 16`) only if you need higher precision for specific balance testing.

## Balance Testing

Two-phase balance analysis framework: mathematical analysis (instant) and simulation-based testing (uses headless mode).

### Running Balance Tests
```bash
# Mathematical analysis (instant, no simulation)
npm run balance

# Unified CLI
npm run balance-test -- math              # Same as above
npm run balance-test -- ablation --games 50   # Feature ablation (disable one feature at a time)
npm run balance-test -- tournament --games 30 # Round-robin tournament across AI profiles
npm run balance-test -- full --games 30       # Run all analyses

# Options: --games N, --grid TYPE (random/maze), --json
```

### Mathematical Analysis (`BalanceCalculator`)
Pure calculations from `config.ts` values -- no simulation needed:
- **Gold efficiency curves** - stat/gold ratio at each upgrade level, showing diminishing returns
- **Duel matrix** - hits-to-kill at every attack×health level combination
- **Lanchester ROI** - combat power gain per gold using Lanchester's Square Law (army_power = N² × attack × effectiveHP). Allows direct cross-upgrade comparison
- **Tower ROI** - break-even time, DPS, comparison to equivalent gold spent on upgrades
- **Interest break-even** - time to recoup interest investment at various gold banks
- **Red flag detection** - automatically identifies spawn rate caps, one-shot thresholds, cost imbalances, tower ROI issues

### AI Profiles
`AIProfile` configures AI behavior for balance testing:
- `upgradeWeights: Partial<Record<UpgradeType, number>>` -- multiplier per upgrade type's score (0 = never buy, 2.0 = twice as likely)
- `disabledUpgrades: ReadonlySet<UpgradeType>` -- hard-blocks (for ablation testing)
- `towersEnabled: boolean` -- toggle tower research/construction (default true)
- `nukeEnabled: boolean` -- toggle nuke usage (default true)

Predefined profiles in `AIProfiles.ts`: Balanced (generalist), Rush (fast spawn + speed aggression, no towers), Economy (interest + combat scaling), TowerFortress (tower-augmented army, high priority), GlassCannon (max attack + speed, fragile, no towers), Tank (health + defense + army size). Profiles are tuned so that 5 of 6 strategies achieve 43-68% tournament win rates, with natural counter-play dynamics (e.g., GlassCannon counters Tank via HP scaling, Economy outscales Rush).

### Ablation Testing
Disables one feature for P0 (while P1 is unrestricted), runs N games, measures win rate delta vs symmetric baseline. Tests all 8 upgrades + towers + nuke. Negative delta = feature is important to the player using it.

### Tournament
Round-robin of all AI profiles. Produces a win-rate matrix and overall rankings. A balanced game has no single dominant strategy (all win rates below ~65%).

## Particle Type Hierarchy

Particles use an inheritance-based hierarchy. New types extend `AbstractParticle` and override hooks:

- **`typeName`** (abstract) - Identity string for the particle type
- **`canMove`** - Return false for stationary units (e.g. turrets)
- **`onUpdate(dt, context)`** - Called every tick after movement; use for passive abilities (healing, scanning)
- **`onCollide(other, context)`** - Called when colliding with enemy; default applies speed combat bonus + HP scaling (reduced by defense): `takeDamage(other.attack × speedMultiplier × hpScaling)`
- **`onDeath(context)`** - Called when particle dies; override for death effects (AoE explosion)
- **`getBaseDamage()`** - Damage dealt to enemy base on reach; default: `CONFIG.BASE_DAMAGE_ON_REACH`

`GameContext` provides: `grid`, `cellEffects`, `spatialHash`, `particles`, `players`, `gameTimeMs`, `spawnExplosion()`.

## Key Design Patterns

1. **Configuration Centralization** - All game parameters in `config.ts`
2. **Scene Separation** - Game logic (GameScene) vs UI (UIScene)
3. **Spatial Partitioning** - Efficient collision detection
4. **Particle Inheritance** - AbstractParticle base with overridable hooks for new types
5. **Component-based Entities** - Particles have visual components (sprite, trail) managed by scene
6. **State Management** - Player state tracks upgrades, gold, HP, etc.

## Notes for AI Agents

- **Always check `src/config.ts` first** when looking for game parameters or balance values
- Configuration uses `RESOLUTION_SCALE` multiplier - most values scale with this
- Particles are the main game entities - see `src/particles/` for the type hierarchy and hooks
- Grid is procedurally generated each game - see `src/grid/` for generators (Random, Maze)
- Collision system uses spatial hash for performance
- UI is separate scene that overlays on top of game scene
- Keyboard controls are handled in UIScene
- Game state (players, particles, grid) is managed in GameScene
- **Flow**: MenuScene → MapSelectScene → GameScene → UIScene (launched). Game over → PostGameStatsScene → MenuScene. Also: MenuScene → HowToPlayScene → MenuScene (press [H] or click "How to Play")
- **AI mode**: AIController runs in GameEngine.tick() when AI mode is enabled, makes decisions every ~200ms. Engine supports `'none'` (no AI), `'single'` (P2 only), or `'both'` (AI-vs-AI for headless simulation)
- **Stats awareness**: When adding new gameplay features (new particle types, abilities, economy mechanics, combat changes, etc.), consider whether they should be reflected in the post-game stats. If a new feature introduces a meaningful metric players would want to see after the match, add sampling to `MatchStatsRecorder`, a new field to `PerSecondSample` or `MatchEvent`, and a corresponding graph in `PostGameStatsScene`. Keep the stats telling a compelling story about the match
- **How to Play awareness**: When adding or changing gameplay features, upgrades, towers, combat mechanics, or strategies, update the in-game How to Play screen. The content is generated from CONFIG values in `src/scenes/howToPlayData.ts` -- so numeric changes auto-propagate, but new features, upgrades, mechanics, or strategy changes require updating the relevant tab content (Overview, Tech Tree, Combat, or Strategies). Also update `STRATEGIES.md` if strategy advice changes
