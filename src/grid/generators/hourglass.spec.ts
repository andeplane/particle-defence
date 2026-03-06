import { describe, it, expect } from 'vitest';
import { generateHourglassGrid } from './hourglass';

const smallParams = {
  cols: 16,
  rows: 8,
  baseWidth: 2,
  gameWidth: 512,
  gameHeight: 256,
};

describe(generateHourglassGrid.name, () => {
  it('returns a grid with a valid path', () => {
    const grid = generateHourglassGrid(smallParams);
    expect(grid.hasPath()).toBe(true);
  });

  it('uses custom params', () => {
    const grid = generateHourglassGrid(smallParams);
    expect(grid.cols).toBe(16);
    expect(grid.rows).toBe(8);
  });

  it('base areas are always open', () => {
    const grid = generateHourglassGrid(smallParams);
    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < smallParams.baseWidth; x++) {
        expect(grid.cells[y][x]).toBe(true);
      }
      for (let x = grid.cols - smallParams.baseWidth; x < grid.cols; x++) {
        expect(grid.cells[y][x]).toBe(true);
      }
    }
  });

  it('returns a grid with correct dimensions', () => {
    const grid = generateHourglassGrid(smallParams);
    expect(grid.cells.length).toBe(smallParams.rows);
    expect(grid.cells[0].length).toBe(smallParams.cols);
  });
});
