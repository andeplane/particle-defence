# Particle Defence

[**Play it now**](https://andeplane.github.io/particle-defence/)

## What it is

Particle Defence is a 2-player tower defence game where you spawn particles from your base, upgrade them with gold from kills, and fight through a procedurally generated maze to destroy the enemy base. Particles navigate the maze, collide with enemy particles in real-time combat, and deal damage when they reach the enemy base. Win by reducing the enemy base HP to zero.

**Features:**
- **1 Player vs AI** -- Battle an AI that upgrades, builds towers, and uses nukes tactically
- **2 Player** -- Local multiplayer with hierarchical keyboard menus
- **8 upgrade types** -- Health, Attack, Radius, Spawn Rate, Speed, Defense, Max Particles, Interest Rate
- **Tower system** -- Research and build Laser Towers (DPS) and Slow Towers (area slow). Up to 5 per player, each individually upgradeable
- **Combat mechanics** -- Speed bonus damage, anti-tank HP scaling, defense reduction, cell ownership bonuses
- **Nuclear weapon** -- Instantly wipe all enemy particles and towers (5-minute cooldown)
- **Territory control** -- Captured cells slow enemies and give your particles a defense bonus
- **7 map types** -- Random, Maze, Hourglass, Lanes, Islands, Rooms, Fortress
- **Post-game stats** -- 10 timeline graphs showing army size, power curves, kills/min, gold, and more
- **In-game How to Play** -- Built-in guide with tech tree, combat formulas, and strategy tips

## Game modes

| Mode | Description |
|------|-------------|
| **1 Player vs AI** | You (left, cyan) vs AI (right, red). AI controls its own upgrades, towers, and nuke. |
| **2 Player** | Both players control upgrades, towers, and nuke via keyboard. |

## Maps

| Map | Description |
|-----|-------------|
| **Random** | Percolation-based open terrain with scattered walls |
| **Maze** | Recursive backtracker corridors with extra carved paths |
| **Hourglass** | Narrow chokepoint in the center |
| **Lanes** | Parallel horizontal corridors |
| **Islands** | Open areas separated by wall clusters |
| **Rooms** | Connected rooms with doorways |
| **Fortress** | Defensive structures near each base |

## Controls

The UI uses a **hierarchical menu** system. Press a category key to open its submenu, then press a key within that submenu to act. Press **Tab** (P1) or **Backspace** (P2) to go back. Hover any button for a tooltip with stats.

### Top-level categories

| Category | P1 | P2 | Description |
|----------|----|----|-------------|
| BUILD | Q | I | Construct towers (laser, slow) and place carriers |
| RESEARCH | W | O | Unlock tower types (one-time purchase) |
| UPGRADES | E | P | All 8 particle stat upgrades |
| ABILITIES | A | K | Nuclear weapon |
| TOWERS | S | L | Select and upgrade placed towers |

### Upgrades submenu

| P1 | P2 | Upgrade |
|----|----|---------|
| Q | I | Health |
| W | O | Attack |
| E | P | Radius |
| R | U | Spawn Rate |
| A | K | Speed |
| S | L | Max Particles |
| D | J | Defense |
| F | H | Interest Rate |

See the in-game **How to Play** screen (press H from the main menu) for full details on all upgrades, tower stats, combat formulas, and strategy guides.

## Build & run

**Requirements:** Node.js 18+

```bash
# Install dependencies
npm install

# Development (hot reload)
npm run dev

# Production build
npm run build

# Preview production build locally
npm run preview
```

Build output goes to `dist/`.

## Testing

```bash
# Run tests once
npm run test:run

# Watch mode
npm run test
```

## Headless simulation

Run AI-vs-AI games without rendering for balance testing and analysis:

```bash
# Run 10 games (default)
npm run simulate

# Custom: 50 games on maze grid
npm run simulate -- --games 50 --grid maze

# All options
npm run simulate -- --games 100 --grid random --tick-ms 1000 --max-time 1800 --json
```

**Options:**
- `--games N` -- Number of games to simulate (default: 10)
- `--grid TYPE` -- Grid type: random, maze, hourglass, lanes, islands, rooms, fortress (default: random)
- `--tick-ms N` -- Simulation tick size in ms; larger = faster but less precise (default: 1000)
- `--max-time N` -- Max game duration in seconds before declaring a draw (default: 1800)
- `--json` -- Output raw JSON results for programmatic analysis

The simulation runs the exact same `GameEngine.tick()` loop as the browser game, just without Phaser rendering.

## Balance testing

```bash
# Mathematical analysis (instant, no simulation)
npm run balance

# Unified CLI
npm run balance-test -- math                    # Pure math analysis
npm run balance-test -- ablation --games 50     # Feature ablation testing
npm run balance-test -- tournament --games 30   # Round-robin AI tournament
npm run balance-test -- full --games 30         # All analyses
```

Six AI strategy profiles (Balanced, Rush, Economy, TowerFortress, GlassCannon, Tank) compete in round-robin tournaments. See `STRATEGIES.md` for detailed strategy descriptions.

## Tech stack

- **Phaser 3** -- Game framework
- **TypeScript** -- Language
- **Vite** -- Build tool and dev server
- **Vitest** -- Testing framework
