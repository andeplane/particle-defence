import { CONFIG } from '../../config';
import { Grid } from '../Grid';
import { ensurePathExists } from './ensurePath';

export type RoomsGridParams = {
  cols: number;
  rows: number;
  baseWidth: number;
  gameWidth: number;
  gameHeight: number;
};

const defaultParams: RoomsGridParams = {
  cols: CONFIG.MAZE_COLS,
  rows: CONFIG.MAZE_ROWS,
  baseWidth: CONFIG.BASE_WIDTH_CELLS,
  gameWidth: CONFIG.GAME_WIDTH,
  gameHeight: CONFIG.GAME_HEIGHT,
};

/** Room grid: 4 columns of rooms, 2 rows */
const ROOM_COLS = 4;
const ROOM_ROWS = 2;
/** Doorway width in cells */
const DOORWAY_WIDTH = 2;

export function generateRoomsGrid(overrides?: Partial<RoomsGridParams>): Grid {
  const p = overrides ? { ...defaultParams, ...overrides } : defaultParams;

  const cells = createRoomsCells(p.cols, p.rows, p.baseWidth);
  ensurePathExists(cells, p.cols, p.rows, p.baseWidth);
  return new Grid(p.cols, p.rows, p.baseWidth, cells, p.gameWidth, p.gameHeight);
}

function createRoomsCells(cols: number, rows: number, baseWidth: number): boolean[][] {
  const cells: boolean[][] = [];
  for (let y = 0; y < rows; y++) {
    cells[y] = [];
    for (let x = 0; x < cols; x++) {
      const isBase = x < baseWidth || x >= cols - baseWidth;
      cells[y][x] = isBase;
    }
  }

  const playLeft = baseWidth;
  const playRight = cols - baseWidth;
  const playWidth = playRight - playLeft;
  const playHeight = rows;

  const roomW = Math.floor((playWidth - (ROOM_COLS - 1)) / ROOM_COLS);
  const roomH = Math.floor((playHeight - (ROOM_ROWS - 1)) / ROOM_ROWS);

  for (let ry = 0; ry < ROOM_ROWS; ry++) {
    for (let rx = 0; rx < ROOM_COLS; rx++) {
      const roomX = playLeft + rx * (roomW + 1);
      const roomY = ry * (roomH + 1);
      for (let dy = 0; dy < roomH; dy++) {
        for (let dx = 0; dx < roomW; dx++) {
          const cx = roomX + dx;
          const cy = roomY + dy;
          if (cx < playRight && cy < rows) {
            cells[cy][cx] = true;
          }
        }
      }
    }
  }

  for (let ry = 0; ry < ROOM_ROWS; ry++) {
    for (let rx = 0; rx < ROOM_COLS - 1; rx++) {
      const wallX = playLeft + (rx + 1) * (roomW + 1) - 1;
      const doorY = ry * (roomH + 1) + Math.floor(roomH / 2) - Math.floor(DOORWAY_WIDTH / 2);
      for (let d = 0; d < DOORWAY_WIDTH; d++) {
        const cy = Math.max(0, Math.min(rows - 1, doorY + d));
        cells[cy][wallX] = true;
        cells[cy][wallX + 1] = true;
      }
    }
  }

  for (let rx = 0; rx < ROOM_COLS; rx++) {
    for (let ry = 0; ry < ROOM_ROWS - 1; ry++) {
      const wallY = (ry + 1) * (roomH + 1) - 1;
      const doorX = playLeft + rx * (roomW + 1) + Math.floor(roomW / 2) - Math.floor(DOORWAY_WIDTH / 2);
      for (let d = 0; d < DOORWAY_WIDTH; d++) {
        const cx = Math.max(playLeft, Math.min(playRight - 1, doorX + d));
        cells[wallY][cx] = true;
        cells[wallY + 1][cx] = true;
      }
    }
  }

  return cells;
}
