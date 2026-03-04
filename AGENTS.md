# Tower Defence Game - Agent Documentation

## Overview
A 2-player tower defence game built with Phaser 3, TypeScript, and Vite. Players spawn particles from their bases that navigate through procedurally generated mazes to attack the enemy base. The game features an upgrade system, nuclear weapons, and real-time particle combat. Supports **1 Player vs AI** and **2 Player** modes selected from the main menu.

## Project Structure

### Core Files
- **`src/main.ts`** - Entry point, initializes Phaser game with MenuScene, GameScene, and UIScene
- **`src/config.ts`** - **ALL GAME CONFIGURATION** - Contains all game constants, parameters, and configuration values
- **`index.html`** - HTML entry point with game container

### Scenes
- **`src/scenes/MenuScene.ts`** - Main menu with mode selection (1 Player vs AI / 2 Player), starts GameScene with `{ mode: 'ai' | 'pvp' }`
- **`src/scenes/GameScene.ts`** - Main game logic, particle spawning, collision detection, base damage, win conditions. Accepts mode from init, runs AIController when mode is 'ai'
- **`src/scenes/UIScene.ts`** - UI overlay with HP bars, gold display, upgrade buttons, nuke buttons, keyboard controls. Hides P2 controls and labels as "AI" when mode is 'ai'

### Game Entities
- **`src/player.ts`** - Player class with base HP, gold, kills, upgrade levels, and nuke cooldown management
- **`src/particle.ts`** - GameParticle class representing units that navigate the maze and fight
- **`src/maze.ts`** - Maze generation using percolation algorithm, pathfinding validation, collision detection helpers

### Systems
- **`src/ai.ts`** - AIController for single-player mode. Automatically upgrades (prioritizes spawn rate, attack, health) and uses nuke when behind or when enemy has many particles
- **`src/collision.ts`** - Collision resolution between particles (damage, bouncing, kill tracking)
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
- `MAX_PARTICLES_PER_PLAYER: 1000` - Max units per player
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
- `UPGRADE_COST_MULTIPLIER: 1.3` - Cost multiplier per level (cost = baseCost * multiplier^level)

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
- `UpgradeType` - Type union: `'health' | 'attack' | 'radius' | 'spawnRate' | 'speed'`

## Game Mechanics

### Particle Movement
- Particles spawn from their base with random angle
- Navigate through maze using pathfinding (wall avoidance)
- Y-axis uses periodic boundary conditions (wraps top/bottom)
- X-axis clamped to game bounds
- Random drift prevents particles from getting stuck
- Particles prevented from returning to their own base

### Combat System
- Particles collide when within combined radius distance
- Both particles deal damage to each other simultaneously
- Elastic collision physics with velocity bouncing
- Kills award gold and increment kill counter
- Dead particles are cleaned up and removed

### Upgrade System
- 5 upgrade types: health, attack, radius, spawnRate, speed
- Costs increase exponentially: `baseCost * 1.3^level`
- Upgrades affect all future spawned particles
- Upgrade levels tracked per player

### Nuclear Weapon
- Instantly kills all enemy particles
- Awards reduced gold (25% of normal kill reward)
- Has cooldown period (10 minutes)
- Available immediately (can be changed via config)

### Win Condition
- Game ends when a player's base HP reaches 0
- Winner is the surviving player
- Game over screen with "Click to return to menu" (returns to MenuScene)

### Game Modes
- **1 Player vs AI** - Human (P1) vs AI (P2). AI controls upgrades and nuke automatically. P2 UI shows "AI" label and stats.
- **2 Player** - Both players use keyboard controls. P1: Q/W/E/R/T/F, P2: U/I/O/P/Y/J

## Controls

### Player 1 (Left/Cyan)
- **Q** - Upgrade Health
- **W** - Upgrade Attack
- **E** - Upgrade Radius
- **R** - Upgrade Spawn Rate
- **T** - Upgrade Speed
- **F** - Launch Nuke

### Player 2 (Right/Red) - 2 Player mode only
- **U** - Upgrade Health
- **I** - Upgrade Attack
- **O** - Upgrade Radius
- **P** - Upgrade Spawn Rate
- **Y** - Upgrade Speed
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

### Maze Generation
- Percolation algorithm with configurable threshold
- Ensures path exists between bases (validates connectivity)
- Base areas always walkable
- Fallback to lower threshold if no valid path found after 100 attempts

## Development

### Build & Run
- `npm run dev` - Start development server (Vite)
- `npm run build` - Build for production
- `npm run preview` - Preview production build

### Dependencies
- **phaser**: ^3.90.0 - Game framework
- **typescript**: ~5.9.3 - TypeScript compiler
- **vite**: ^7.3.1 - Build tool and dev server

### TypeScript Config
- Uses ES modules (`"type": "module"`)
- TypeScript config in `tsconfig.json`

## Key Design Patterns

1. **Configuration Centralization** - All game parameters in `config.ts`
2. **Scene Separation** - Game logic (GameScene) vs UI (UIScene)
3. **Spatial Partitioning** - Efficient collision detection
4. **Component-based Entities** - Particles have visual components (sprite, trail) managed by scene
5. **State Management** - Player state tracks upgrades, gold, HP, etc.

## Notes for AI Agents

- **Always check `src/config.ts` first** when looking for game parameters or balance values
- Configuration uses `RESOLUTION_SCALE` multiplier - most values scale with this
- Particles are the main game entities - they navigate, fight, and attack bases
- Maze is procedurally generated each game - uses percolation algorithm
- Collision system uses spatial hash for performance
- UI is separate scene that overlays on top of game scene
- Keyboard controls are handled in UIScene
- Game state (players, particles, maze) is managed in GameScene
- **Flow**: MenuScene (first) → GameScene → UIScene (launched). Game over returns to MenuScene
- **AI mode**: AIController runs in GameScene.update() when mode is 'ai', makes decisions every ~200ms
