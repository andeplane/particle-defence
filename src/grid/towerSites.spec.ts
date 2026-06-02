import { describe, expect, it } from 'vitest';
import { applyTowerSites, createTowerSites } from './towerSites';

describe(createTowerSites.name, () => {
  it('creates six sites at the requested 3x2 map fractions', () => {
    const sites = createTowerSites(64, 32, 4);

    expect(sites).toEqual([
      { id: 0, col: 16, row: 11 },
      { id: 1, col: 32, row: 11 },
      { id: 2, col: 48, row: 11 },
      { id: 3, col: 16, row: 21 },
      { id: 4, col: 32, row: 21 },
      { id: 5, col: 48, row: 21 },
    ]);
  });

  it('keeps sites outside base columns on small grids', () => {
    const sites = createTowerSites(8, 6, 2);

    expect(sites.map((site) => site.col).every((col) => col >= 2 && col <= 5)).toBe(true);
  });
});

describe(applyTowerSites.name, () => {
  it('marks every tower site as a wall', () => {
    const cells = Array.from({ length: 6 }, () => Array(8).fill(true));
    const sites = applyTowerSites(cells, 8, 6, 2);

    expect(sites).toHaveLength(6);
    for (const site of sites) {
      expect(cells[site.row][site.col]).toBe(false);
    }
  });
});
