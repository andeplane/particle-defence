/** Carves a guaranteed path and symmetric boundary openings. Ensures at least one path exists and both bases have similar entrance counts. */
export function ensurePathExists(
  cells: boolean[][],
  cols: number,
  rows: number,
  baseWidth: number
): void {
  const leftCol = baseWidth;
  const rightCol = cols - baseWidth - 1;
  const midY = Math.floor(rows / 2);

  // 1. Guaranteed path: full horizontal corridor at midY
  for (let x = leftCol; x <= rightCol; x++) {
    cells[midY][x] = true;
  }

  // 2. Symmetric boundaries: ~50% of rows on both sides (same row set for symmetry)
  const rowsToOpen = new Set<number>([midY]);
  for (let y = 0; y < rows; y++) {
    if (Math.random() < 0.5) rowsToOpen.add(y);
  }
  for (const y of rowsToOpen) {
    cells[y][leftCol] = true;
    cells[y][rightCol] = true;
  }

  // 3. Periodic boundary: top and bottom rows must match for Y-axis wrap
  for (let x = 0; x < cols; x++) {
    const open = cells[0][x] || cells[rows - 1][x];
    cells[0][x] = open;
    cells[rows - 1][x] = open;
  }
}
