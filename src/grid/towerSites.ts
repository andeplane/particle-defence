import type { TowerSite } from './Grid';

const TOWER_SITE_X_FRACTIONS = [1 / 4, 2 / 4, 3 / 4] as const;
const TOWER_SITE_Y_FRACTIONS = [1 / 3, 2 / 3] as const;

export function applyTowerSites(
  cells: boolean[][],
  cols: number,
  rows: number,
  baseWidth: number,
): TowerSite[] {
  const sites = createTowerSites(cols, rows, baseWidth);
  for (const site of sites) {
    cells[site.row][site.col] = false;
  }
  return sites;
}

export function createTowerSites(cols: number, rows: number, baseWidth: number): TowerSite[] {
  const minCol = Math.min(cols - 1, Math.max(0, baseWidth));
  const maxCol = Math.max(minCol, cols - baseWidth - 1);
  const sites: TowerSite[] = [];

  for (const yFraction of TOWER_SITE_Y_FRACTIONS) {
    const row = clamp(Math.round(rows * yFraction), 0, rows - 1);
    for (const xFraction of TOWER_SITE_X_FRACTIONS) {
      const col = clamp(Math.round(cols * xFraction), minCol, maxCol);
      sites.push({ id: sites.length, col, row });
    }
  }

  return sites;
}

function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}
