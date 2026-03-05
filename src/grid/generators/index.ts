import type { Grid } from '../Grid';
import { generateRandomGrid } from './random';
import { generateMazeGrid } from './maze';

export type GridType = 'random' | 'maze';

export { generateRandomGrid, generateMazeGrid };

export function generateGrid(type: GridType): Grid {
  switch (type) {
    case 'random':
      return generateRandomGrid();
    case 'maze':
      return generateMazeGrid();
  }
}
