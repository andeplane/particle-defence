/** Text sizing/formatting helpers shared by the UI scenes. */

export interface ScalableText {
  readonly width: number;
  setScale(x: number, y?: number): unknown;
}

/**
 * Uniform scale that makes `textWidth` fit inside `maxWidth`.
 * Never scales text up, and never returns 0 for degenerate inputs.
 */
export function computeTextScale(textWidth: number, maxWidth: number): number {
  if (!(textWidth > 0) || !(maxWidth > 0)) return 1;
  return Math.min(1, maxWidth / textWidth);
}

/**
 * Shrinks a text object in place so it fits within `maxWidth` pixels.
 * Idempotent: `text.width` is the unscaled width, so re-fitting after a
 * `setText()` always yields the correct absolute scale.
 */
export function fitTextToWidth(text: ScalableText, maxWidth: number): void {
  text.setScale(computeTextScale(text.width, maxWidth));
}

/** Percentage of the map a player owns, e.g. `12%`. */
export function formatTerritoryPercent(ownedCells: number, totalOpenCells: number): string {
  if (totalOpenCells <= 0) return '0%';
  const pct = Math.round((ownedCells / totalOpenCells) * 100);
  return `${Math.max(0, Math.min(100, pct))}%`;
}
