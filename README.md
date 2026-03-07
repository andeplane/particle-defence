# Particle Defence

[**Play it now**](https://andeplane.github.io/particle-defence/)

## What it is

Particle Defence is a 2-player tower defence game where you spawn particles from your base, upgrade them with gold from kills, and fight through a procedurally generated maze to destroy the enemy base. Particles navigate the maze, collide with enemy particles in real-time combat, and deal damage when they reach the enemy base. Win by reducing the enemy base HP to zero.

**Features:**
- **1 Player vs AI** – Battle an AI that upgrades automatically and uses nukes tactically
- **2 Player** – Local multiplayer, both players use keyboard
- **8 upgrade types** – Health, Attack, Radius, Spawn Rate, Speed, Defense, Max Particles, Interest Rate (costs scale with level)
- **Nuclear weapon** – Instantly wipe all enemy particles (cooldown, reduced gold reward)
- **Gold interest** – Save gold to earn periodic interest (+0.25% per upgrade level, max 5%, every 30 seconds)
- Procedurally generated mazes, spatial-hash collision detection, explosion effects

## Game modes

| Mode | Description |
|------|-------------|
| **1 Player vs AI** | You (left, cyan) vs AI (right, red). AI controls its own upgrades and nuke. |
| **2 Player** | Both players control upgrades and nuke via keyboard. |

## Controls

### Player 1 (Left / Cyan)
| Key | Action |
|-----|--------|
| Q | Upgrade Health |
| W | Upgrade Attack |
| E | Upgrade Radius |
| R | Upgrade Spawn Rate |
| T | Upgrade Speed |
| G | Upgrade Defense |
| A | Upgrade Max Particles |
| B | Upgrade Interest Rate |
| F | Launch Nuke |

### Player 2 (Right / Red) – 2 Player only
| Key | Action |
|-----|--------|
| U | Upgrade Health |
| I | Upgrade Attack |
| O | Upgrade Radius |
| P | Upgrade Spawn Rate |
| Y | Upgrade Speed |
| K | Upgrade Defense |
| L | Upgrade Max Particles |
| N | Upgrade Interest Rate |
| J | Launch Nuke |

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

## Headless Simulation

Run AI-vs-AI games without rendering for balance testing and analysis:

```bash
# Run 10 games (default)
npm run simulate

# Custom: 50 games on maze grid
npm run simulate -- --games 50 --grid maze

# All options (default is already blazing fast at 1000ms ticks)
npm run simulate -- --games 100 --grid random --tick-ms 1000 --max-time 1800 --json
```

**Options:**
- `--games N` - Number of games to simulate (default: 10)
- `--grid TYPE` - Grid type: random, maze, hourglass, lanes, islands, rooms, fortress (default: random)
- `--tick-ms N` - Simulation tick size in ms; larger = faster but less precise (default: 1000)
- `--max-time N` - Max game duration in seconds before declaring a draw (default: 1800)
- `--json` - Output raw JSON results for programmatic analysis

The simulation runs the exact same `GameEngine.tick()` loop as the browser game, just without Phaser rendering. Outputs win rates, game duration stats, average upgrade levels, and tower counts. See `AGENTS.md` for architecture details.

## Tech stack

- **Phaser 3** – Game framework
- **TypeScript** – Language
- **Vite** – Build tool and dev server
