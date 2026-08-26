import { describe, it, expect, vi } from 'vitest';
import { computeTextScale, fitTextToWidth, formatTerritoryPercent } from './uiText';

describe(computeTextScale.name, () => {
  it('never scales text up when it already fits', () => {
    expect(computeTextScale(50, 100)).toBe(1);
  });

  it('shrinks text that is wider than the box', () => {
    expect(computeTextScale(200, 100)).toBe(0.5);
  });

  it('returns 1 for degenerate widths', () => {
    expect(computeTextScale(0, 100)).toBe(1);
    expect(computeTextScale(100, 0)).toBe(1);
    expect(computeTextScale(Number.NaN, 100)).toBe(1);
  });
});

describe(fitTextToWidth.name, () => {
  it('applies the fitted scale', () => {
    const setScale = vi.fn();
    fitTextToWidth({ width: 120, setScale }, 60);
    expect(setScale).toHaveBeenCalledWith(0.5);
  });

  it('resets to scale 1 when the text fits again', () => {
    const setScale = vi.fn();
    fitTextToWidth({ width: 40, setScale }, 60);
    expect(setScale).toHaveBeenCalledWith(1);
  });
});

describe(formatTerritoryPercent.name, () => {
  it.each([
    [0, 100, '0%'],
    [12, 100, '12%'],
    [1, 3, '33%'],
    [100, 100, '100%'],
  ])('%d of %d open cells -> %s', (owned, total, expected) => {
    expect(formatTerritoryPercent(owned, total)).toBe(expected);
  });

  it('returns 0% when the map has no open cells', () => {
    expect(formatTerritoryPercent(5, 0)).toBe('0%');
  });
});
