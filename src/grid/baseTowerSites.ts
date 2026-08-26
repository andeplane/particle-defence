export interface BaseTowerSlot {
  readonly playerId: 0 | 1;
  readonly col: number;
  readonly row: number;
}

const Y_FRACTIONS = [1 / 4, 2 / 4, 3 / 4] as const;

export function createBaseTowerSlots(cols: number, rows: number, baseWidth: number): BaseTowerSlot[] {
  const p1Col = baseWidth - 2;
  const p2Col = cols - baseWidth + 1;
  const slots: BaseTowerSlot[] = [];

  for (const yFraction of Y_FRACTIONS) {
    const row = Math.round(rows * yFraction);
    slots.push({ playerId: 0, col: p1Col, row });
    slots.push({ playerId: 1, col: p2Col, row });
  }

  return slots;
}
