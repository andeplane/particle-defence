import type { Grid } from '../Grid';
import { generateRandomGrid } from './random';
import { generateMazeGrid } from './maze';
import { generateHourglassGrid } from './hourglass';
import { generateLanesGrid } from './lanes';
import { generateIslandsGrid } from './islands';
import { generateRoomsGrid } from './rooms';
import { generateFortressGrid } from './fortress';

export type GridType =
  | 'random'
  | 'maze'
  | 'hourglass'
  | 'lanes'
  | 'islands'
  | 'rooms'
  | 'fortress';

export {
  generateRandomGrid,
  generateMazeGrid,
  generateHourglassGrid,
  generateLanesGrid,
  generateIslandsGrid,
  generateRoomsGrid,
  generateFortressGrid,
};

export function generateGrid(type: GridType): Grid {
  switch (type) {
    case 'random':
      return generateRandomGrid();
    case 'maze':
      return generateMazeGrid();
    case 'hourglass':
      return generateHourglassGrid();
    case 'lanes':
      return generateLanesGrid();
    case 'islands':
      return generateIslandsGrid();
    case 'rooms':
      return generateRoomsGrid();
    case 'fortress':
      return generateFortressGrid();
  }
}
