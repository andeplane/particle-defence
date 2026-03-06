# Tower Defence Game - Agent Documentation

## Overview
A 2-player tower defence game built with Phaser 3, TypeScript, and Vite. Players spawn particles from their bases that navigate through procedurally generated mazes to attack the enemy base. The game features an upgrade system, nuclear weapons, and real-time particle combat. Supports **1 Player vs AI** and **2 Player** modes selected from the main menu.

## Project Structure

### Core Files
- **`src/main.ts`** - Entry point, initializes Phaser game with MenuScene, MapSelectScene, GameScene, and UIScene
- **`src/config.ts`** - **ALL GAME CONFIGURATION** - Contains all game constants, parameters, and configuration values
- **`index.html`** - HTML entry point with game container

### Scenes
- **`src/scenes/MenuScene.ts`** - Main menu with mode selection (1 Player vs AI / 2 Player), navigates to MapSelectScene
- **`src/scenes/MapSelectScene.ts`** - Map type selection (Random, Maze), starts GameScene with `{ mode, gridType }`
- **`src/scenes/GameScene.ts`** - Main game logic, particle spawning, collision detection, base damage, win conditions. Accepts mode and gridType from init, runs AIController when mode is 'ai'
- **`src/scenes/UIScene.ts`** - UI overlay with HP bars, gold display, upgrade buttons, nuke buttons, keyboard controls. Hides P2 controls and labels as "AI" when mode is 'ai'

### Game Entities
- **`src/player.ts`** - Player class with base HP, gold, kills, upgrade levels, and nuke cooldown management
- **`src/particles/`** - Particle type hierarchy:
  - **`AbstractParticle.ts`** - Abstract base class with shared state, movement logic, and lifecycle hooks
  - **`BasicParticle.ts`** - Default particle type (current behavior)
  - **`GameContext.ts`** - Context interface passed to particle hooks (grid, spatial hash, players, spawnExplosion)
  - **`index.ts`** - Re-exports
- **`src/grid/`** - Grid, cell effects, and map generators:
  - **`Grid.ts`** - Grid class with cells, isWall, isInBase, cellW/cellH, hasPath
  - **`CellEffect.ts`** - Cell effect type definitions (discriminated union) and `ICellEffectMap` interface
  - **`CellEffectMap.ts`** - Cell effect map implementation: manages per-cell effects, queries, timer/HP updates
  - **`generators/random.ts`** - Percolation-based random grid
  - **`generators/maze.ts`** - Recursive backtracker maze with extra carved paths
  - **`generators/index.ts`** - GridType union, generateGrid, re-exports

### Systems
- **`src/ai.ts`** - AIController for single-player mode. Automatically upgrades (prioritizes spawn rate, attack, health) and uses nuke when behind or when enemy has many particles
- **`src/collision.ts`** - Collision resolution; calls `onCollide`/`onDeath` hooks, handles bouncing and kill tracking
- **`src/spatial-hash.ts`** - Spatial partitioning for efficient collision detection

## Configuration (`src/config.ts`)

**ALL GAME PARAMETERS ARE DEFINED HERE** - This is the single source of truth for game balance and settings.

### Resolution & Display
- `RESOLUTION_SCALE: 2` - Scales all game dimensions
- `GAME_WIDTH: 2048` (1024 * scale)
- `GAME_HEIGHT: 1024` (512 * scale)
- `BG_COLOR: 0x0a0a0f` - Background color
- `FLOOR_COLOR: 0x0d0d1a` - Floor/walkable area color
- `WALL_COLOR: 0x1a1a2e` - Wall color

### Maze Configuration
- `MAZE_COLS: 64` (32 * scale)
- `MAZE_ROWS: 32` (16 * scale)
- `PERCOLATION_THRESHOLD: 0.8` - Probability threshold for open cells (higher = more open)
- `BASE_WIDTH_CELLS: 4` - Width of each player's base in cells

### Particle (Unit) Configuration
- `PARTICLE_BASE_HEALTH: 3` - Starting health
- `PARTICLE_BASE_ATTACK: 1` - Starting attack damage
- `PARTICLE_BASE_RADIUS: 3` - Starting collision radius
- `PARTICLE_SPEED: 180` - Base movement speed (pixels/second)
- `SPAWN_INTERVAL_MS: 60` - Base spawn interval (reduced by spawnRate upgrades)
- `MAX_PARTICLES_PER_PLAYER: 1000` - Base max units per player (increased by maxParticles upgrade)
- `MAX_PARTICLES_PER_LEVEL: 50` - Per-level increase for maxParticles upgrade
- `MAX_PARTICLES_TOTAL: 2000` - Global unit cap
- `PARTICLE_DRIFT_STRENGTH: 0.15` - Random drift per second (fraction of speed) to prevent stuck particles
- `PARTICLE_ENEMY_BIAS: 0.65` - Chance that random drift pushes towards enemy base
- `STUCK_THRESHOLD_BLOCKS: 10` - Respawn if particle moves less than this many blocks
- `STUCK_THRESHOLD_SECONDS: 10` - ...in this many seconds

### Base Configuration
- `BASE_HP: 1000` - Starting base health
- `BASE_DAMAGE_ON_REACH: 1` - Damage dealt when particle reaches enemy base

### Economy & Upgrades
- `KILL_REWARD: 1` - Gold awarded per kill
- `NUCLEAR_KILL_REWARD_FRACTION: 0.25` - Fraction of kill reward for nuke kills (1/4)
- `NUCLEAR_FIRST_AVAILABLE_MS: 0` - When nukes become available (currently immediately)
- `NUCLEAR_COOLDOWN_MS: 600_000` - Nuke cooldown (10 minutes)
- `UPGRADE_COSTS` - Base costs for each upgrade type:
  - `health: 5`
  - `attack: 5`
  - `radius: 3`
  - `spawnRate: 10`
  - `speed: 7`
  - `maxParticles: 10`
- `UPGRADE_COST_MULTIPLIER: 1.3` - Cost multiplier per level (cost = baseCost * multiplier^level)

### Cell Effect Defaults
- `SLOW_EFFECT_FACTOR: 0.4` - Default slow multiplier for enemies in slow cells
- `DAMAGE_CELL_DPS: 2` - Default damage per second for damage cells
- `TEMP_WALL_DEFAULT_TIME_MS: 10_000` - Default temp wall duration (10 seconds)
- `TEMP_WALL_DEFAULT_HP: 20` - Default temp wall hit points
- `SLOW_EFFECT_ALPHA: 0.18` - Rendering alpha for slow cell overlay
- `DAMAGE_EFFECT_ALPHA: 0.22` - Rendering alpha for damage cell overlay
- `TEMP_WALL_ALPHA: 0.55` - Rendering alpha for temp wall overlay
- `TEMP_WALL_HP_BAR_HEIGHT: 4` - Height of the HP bar rendered on temp walls

### Spatial Hash
- `SPATIAL_CELL_SIZE: 32` (16 * scale) - Grid cell size for collision optimization

### UI Configuration (scaled with resolution)
- `UI_FONT_SMALL: 20` (10 * scale)
- `UI_FONT_MED: 26` (13 * scale)
- `UI_FONT_LARGE: 28` (14 * scale)
- `UI_BAR_WIDTH: 400` (200 * scale)
- `UI_BAR_HEIGHT: 28` (14 * scale)
- `UI_BTN_WIDTH: 104` (52 * scale)
- `UI_BTN_HEIGHT: 80` (40 * scale)
- `UI_GAP: 8` (4 * scale)

### Visual Colors
- `PLAYER1_COLOR: 0x00ddff` (cyan)
- `PLAYER2_COLOR: 0xff4444` (red)
- `PLAYER1_COLOR_STR: '#00ddff'`
- `PLAYER2_COLOR_STR: '#ff4444'`

### Helper Functions
- `getUpgradeCost(type: UpgradeType, level: number): number` - Calculates upgrade cost based on level
- `UpgradeType` - Type union: `'health' | 'attack' | 'radius' | 'spawnRate' | 'speed' | 'maxParticles'`

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
- Collision damage delegated to `onCollide(other, context)` hook (default: take damage equal to other's attack)
- Elastic collision physics with velocity bouncing
- `onDeath(context)` called when particle dies (override for AoE, etc.)
- Kills award gold and increment kill counter
- Dead particles are cleaned up and removed

### Upgrade System
- 6 upgrade types: health, attack, radius, spawnRate, speed, maxParticles (increases particle cap by 50 per level)
- Costs increase exponentially: `baseCost * 1.3^level`
- Upgrades affect all future spawned particles
- Upgrade levels tracked per player

### Nuclear Weapon
- Instantly kills all enemy particles
- Awards reduced gold (25% of normal kill reward)
- Has cooldown period (10 minutes)
- Available immediately (can be changed via config)

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

### Win Condition
- Game ends when a player's base HP reaches 0
- Winner is the surviving player
- Game over screen with "Click to return to menu" (returns to MenuScene)

### Game Modes
- **1 Player vs AI** - Human (P1) vs AI (P2). AI controls upgrades and nuke automatically. P2 UI shows "AI" label and stats.
- **2 Player** - Both players use keyboard controls. P1: Q/W/E/R/T/A/F, P2: U/I/O/P/Y/L/J. Button layout mirrors QWERTY keyboard.

## Controls

### Player 1 (Left/Cyan)
- **Q** - Upgrade Health
- **W** - Upgrade Attack
- **E** - Upgrade Radius
- **R** - Upgrade Spawn Rate
- **T** - Upgrade Speed
- **A** - Upgrade Max Particles (+50 cap per level)
- **F** - Launch Nuke

### Player 2 (Right/Red) - 2 Player mode only
- **U** - Upgrade Health
- **I** - Upgrade Attack
- **O** - Upgrade Radius
- **P** - Upgrade Spawn Rate
- **Y** - Upgrade Speed
- **L** - Upgrade Max Particles (+50 cap per level)
- **J** - Launch Nuke

*In 1 Player vs AI mode, P2 controls are hidden; the AI controls upgrades and nuke automatically.*

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
- Grid generation (random, maze, pathfinding)
- Cell effect map (add/remove, queries, timer expiry, HP damage, pixel conversion)
- Collision detection
- Spatial hash
- Player logic
- AI controller
- Particle behavior (including cell effect integration: slow, temp wall bounce, wall damage)
- Configuration helpers

**See `.cursor/rules/testing-patterns.mdc` for complete testing standards and examples.**

## Particle Type Hierarchy

Particles use an inheritance-based hierarchy. New types extend `AbstractParticle` and override hooks:

- **`typeName`** (abstract) - Identity string for the particle type
- **`canMove`** - Return false for stationary units (e.g. turrets)
- **`onUpdate(dt, context)`** - Called every tick after movement; use for passive abilities (healing, scanning)
- **`onCollide(other, context)`** - Called when colliding with enemy; default: `takeDamage(other.attack)`
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
- **Flow**: MenuScene → MapSelectScene → GameScene → UIScene (launched). Game over returns to MenuScene
- **AI mode**: AIController runs in GameScene.update() when mode is 'ai', makes decisions every ~200ms
