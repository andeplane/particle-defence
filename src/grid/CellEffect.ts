export interface SlowEffect {
  type: 'slow';
  owner: 0 | 1;
  /** Speed multiplier for enemies, e.g. 0.5 = half speed */
  factor: number;
}

export interface DamageEffect {
  type: 'damage';
  owner: 0 | 1;
  damagePerSecond: number;
}

export interface TempWallTimeEffect {
  type: 'tempWallTime';
  owner: 0 | 1;
  remainingMs: number;
  totalMs: number;
}

export interface TempWallHPEffect {
  type: 'tempWallHP';
  owner: 0 | 1;
  hp: number;
  maxHp: number;
}

export type CellEffect = SlowEffect | DamageEffect | TempWallTimeEffect | TempWallHPEffect;

export type CellEffectType = CellEffect['type'];

export interface ICellEffectMap {
  addEffect(col: number, row: number, effect: CellEffect): void;
  removeEffect(col: number, row: number, effect: CellEffect): void;
  getEffectsAt(col: number, row: number): readonly CellEffect[];

  /** Returns combined slow multiplier for a player at pixel coords (1.0 = no slow) */
  getSlowFactor(px: number, py: number, forPlayer: 0 | 1): number;
  /** Returns true if an enemy temp wall blocks this pixel position for the given player */
  isTempWall(px: number, py: number, forPlayer: 0 | 1): boolean;
  /** Returns combined DPS from enemy effects at pixel coords */
  getDamagePerSecond(px: number, py: number, forPlayer: 0 | 1): number;

  /** Apply damage to an enemy TempWallHPEffect at the given cell. Returns true if a wall was damaged. */
  damageWallAt(col: number, row: number, damage: number, attackerOwner: 0 | 1): boolean;

  /** Tick timers, remove expired effects. deltaMs is in milliseconds. */
  update(deltaMs: number): void;

  /** True if any effects exist (useful for render skip optimization) */
  readonly hasAnyEffects: boolean;

  /** Iterate all cells that have effects. Callback receives (col, row, effects). */
  forEach(callback: (col: number, row: number, effects: readonly CellEffect[]) => void): void;

  /** Cell ownership: called when a particle enters a cell. Updates owner per capture rules. */
  enterCell(col: number, row: number, owner: 0 | 1): void;
  /** Cell ownership: called when a particle leaves a cell. */
  leaveCell(col: number, row: number, owner: 0 | 1): void;
  /** Returns current owner of cell at pixel coords, or null if unowned. */
  getOwnerAt(px: number, py: number): 0 | 1 | null;
  /** True if any cells are owned (for render skip). */
  readonly hasAnyOwnedCells: boolean;
  /** Iterate owned cells. Callback receives (col, row, owner, hasCaptureFlash). */
  forEachOwnedCell(callback: (col: number, row: number, owner: 0 | 1, hasCaptureFlash: boolean) => void): void;
}
