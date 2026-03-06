import { describe, it, expect } from 'vitest';
import { generateMazeGrid } from './maze';

const smallParams = {
  cols: 16,
  rows: 8,
  baseWidth: 2,
  gameWidth: 512,
  gameHeight: 256,
};

describe(generateMazeGrid.name, () => {
  it('returns a grid with a valid path', () => {
    const grid = generateMazeGrid(smallParams);
    expect(grid.hasPath()).toBe(true);
  });

  it('uses custom params', () => {
    const grid = generateMazeGrid(smallParams);
    expect(grid.cols).toBe(16);
    expect(grid.rows).toBe(8);
  });

  it('base areas are always open', () => {
    const grid = generateMazeGrid(smallParams);
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < smallParams.baseWidth; x++) {
        expect(grid.cells[y][x]).toBe(true);
      }
      for (let x = grid.cols - smallParams.baseWidth; x < grid.cols; x++) {
        expect(grid.cells[y][x]).toBe(true);
      }
    }
  });

  it('returns correct number of rows and columns', () => {
    const grid = generateMazeGrid(smallParams);
    expect(grid.cells.length).toBe(smallParams.rows);
    expect(grid.cells[0].length).toBe(smallParams.cols);
  });

  it('has some walls in the maze area', () => {
    const grid = generateMazeGrid(smallParams);
    let wallCount = 0;
    for (let y = 0; y < grid.rows; y++) {
      for (let x = smallParams.baseWidth; x < grid.cols - smallParams.baseWidth; x++) {
        if (!grid.cells[y][x]) wallCount++;
      }
    }
    expect(wallCount).toBeGreaterThan(0);
  });
});
