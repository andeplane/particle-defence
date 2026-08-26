import Phaser from 'phaser';
import { CONFIG } from '../config';
import { generateGrid } from '../grid';
import type { Grid } from '../grid';

interface Mote {
  x: number;
  y: number;
  vx: number;
  vy: number;
  color: number;
}

const MOTES_PER_SIDE = 90;
const WALL_ALPHA = 0.22;
const BASE_TINT_ALPHA = 0.04;
const MOTE_ALPHA = 0.45;
const MOTE_RADIUS = 3;
/** Motes drift slower than real particles so the menu feels calm. */
const SPEED_FRACTION = 0.6;
const SPEED = CONFIG.PARTICLE_SPEED * SPEED_FRACTION;
/** Random heading jitter per second, as a fraction of SPEED. */
const DRIFT = 0.6;
/** Frame-time clamp so a background tab doesn't teleport motes on resume. */
const MAX_FRAME_MS = 50;
const SPAWN_ATTEMPTS = 50;
/** Sub-pixel overlap between wall tiles to hide seams. */
const WALL_OVERLAP_PX = 0.5;
const MS_PER_SECOND = 1000;
/** Render below everything the menu scene adds afterwards. */
const DEPTH_MOTES = -1;
const DEPTH_WALLS = -2;

/**
 * Faint, decorative version of the game field: a random maze with drifting
 * team-coloured motes bouncing off walls. Purely visual; no game logic.
 */
export function createMenuBackground(scene: Phaser.Scene): void {
  const grid = generateGrid('random');
  drawWalls(scene, grid);

  const motes: Mote[] = [];
  for (let i = 0; i < MOTES_PER_SIDE * 2; i++) {
    motes.push(spawnMote(grid, i % 2 === 0 ? 0 : 1));
  }

  const gfx = scene.add.graphics().setDepth(DEPTH_MOTES);
  const update = (_time: number, deltaMs: number) => {
    const dt = Math.min(deltaMs, MAX_FRAME_MS) / MS_PER_SECOND;
    gfx.clear();
    for (const m of motes) {
      stepMote(m, grid, dt);
      gfx.fillStyle(m.color, MOTE_ALPHA);
      gfx.fillCircle(m.x, m.y, MOTE_RADIUS);
    }
  };
  scene.events.on(Phaser.Scenes.Events.UPDATE, update);
  scene.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
    scene.events.off(Phaser.Scenes.Events.UPDATE, update);
  });
}

function drawWalls(scene: Phaser.Scene, grid: Grid): void {
  const gfx = scene.add.graphics().setDepth(DEPTH_WALLS);
  gfx.fillStyle(CONFIG.WALL_COLOR, WALL_ALPHA);
  for (let y = 0; y < grid.rows; y++) {
    for (let x = 0; x < grid.cols; x++) {
      if (!grid.cells[y][x]) {
        gfx.fillRect(x * grid.cellW, y * grid.cellH, grid.cellW + WALL_OVERLAP_PX, grid.cellH + WALL_OVERLAP_PX);
      }
    }
  }
  const baseW = grid.baseWidthCells * grid.cellW;
  gfx.fillStyle(CONFIG.PLAYER1_COLOR, BASE_TINT_ALPHA);
  gfx.fillRect(0, 0, baseW, CONFIG.GAME_HEIGHT);
  gfx.fillStyle(CONFIG.PLAYER2_COLOR, BASE_TINT_ALPHA);
  gfx.fillRect(CONFIG.GAME_WIDTH - baseW, 0, baseW, CONFIG.GAME_HEIGHT);
}

function spawnMote(grid: Grid, side: 0 | 1): Mote {
  const color = side === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
  // Start anywhere open so the field looks populated immediately.
  for (let tries = 0; tries < SPAWN_ATTEMPTS; tries++) {
    const x = Math.random() * CONFIG.GAME_WIDTH;
    const y = Math.random() * CONFIG.GAME_HEIGHT;
    if (!grid.isWall(x, y)) {
      const angle = Math.random() * Math.PI * 2;
      return { x, y, vx: Math.cos(angle) * SPEED, vy: Math.sin(angle) * SPEED, color };
    }
  }
  return { x: CONFIG.GAME_WIDTH / 2, y: CONFIG.GAME_HEIGHT / 2, vx: SPEED, vy: 0, color };
}

function stepMote(m: Mote, grid: Grid, dt: number): void {
  // Slight random drift so motion never looks mechanical.
  m.vx += (Math.random() - 0.5) * SPEED * DRIFT * dt;
  m.vy += (Math.random() - 0.5) * SPEED * DRIFT * dt;
  const len = Math.hypot(m.vx, m.vy) || 1;
  m.vx = (m.vx / len) * SPEED;
  m.vy = (m.vy / len) * SPEED;

  const nx = m.x + m.vx * dt;
  // Periodic in y, like the real game: wrap before the wall test, because the
  // grid reports out-of-range rows as walls.
  let ny = m.y + m.vy * dt;
  if (ny < 0) ny += CONFIG.GAME_HEIGHT;
  if (ny >= CONFIG.GAME_HEIGHT) ny -= CONFIG.GAME_HEIGHT;
  if (nx < 0 || nx >= CONFIG.GAME_WIDTH || grid.isWall(nx, m.y)) m.vx = -m.vx; else m.x = nx;
  if (grid.isWall(m.x, ny)) m.vy = -m.vy; else m.y = ny;
}
