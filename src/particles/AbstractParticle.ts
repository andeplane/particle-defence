import { CONFIG } from '../config';
import type { GameContext } from './GameContext';

export interface IParticle {
  readonly id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  readonly maxHealth: number;
  readonly attack: number;
  readonly radius: number;
  readonly speed: number;
  readonly owner: 0 | 1;
  alive: boolean;
  readonly spawnX: number;
  readonly spawnY: number;
  age: number;
  readonly typeName: string;
  readonly canMove: boolean;
  sprite: Phaser.GameObjects.Image | null;
  trail: Phaser.GameObjects.Particles.ParticleEmitter | null;
  update(dt: number, context: GameContext): void;
  onCollide(other: IParticle, context: GameContext): void;
  onDeath(context: GameContext): void;
  getBaseDamage(): number;
  isStuck(): boolean;
  takeDamage(amount: number): void;
  /** Call before destroy to leave current cell for ownership tracking. */
  leaveCurrentCell(context: GameContext): void;
  /** Defense reduction (0-0.25) applied in takeDamage. Set by engine each tick. */
  defenseFactor: number;
  /** Tower-based slow multiplier (0-1). Set by engine each tick. 1.0 = no slow. */
  towerSlowFactor: number;
  destroy(): void;
}

export type ParticleConfig = {
  gameWidth: number;
  gameHeight: number;
  baseWidthCells: number;
  mazeCols: number;
  driftStrength: number;
  enemyBias: number;
  stuckThresholdBlocks: number;
  stuckThresholdSeconds: number;
  baseDamageOnReach: number;
};

const defaultParticleConfig: ParticleConfig = {
  gameWidth: CONFIG.GAME_WIDTH,
  gameHeight: CONFIG.GAME_HEIGHT,
  baseWidthCells: CONFIG.BASE_WIDTH_CELLS,
  mazeCols: CONFIG.MAZE_COLS,
  driftStrength: CONFIG.PARTICLE_DRIFT_STRENGTH,
  enemyBias: CONFIG.PARTICLE_ENEMY_BIAS,
  stuckThresholdBlocks: CONFIG.STUCK_THRESHOLD_BLOCKS,
  stuckThresholdSeconds: CONFIG.STUCK_THRESHOLD_SECONDS,
  baseDamageOnReach: CONFIG.BASE_DAMAGE_ON_REACH,
};

export type ParticleDependencies = {
  nextId: () => number;
  config: ParticleConfig;
};

let _nextId = 0;

const defaultDependencies: ParticleDependencies = {
  nextId: () => _nextId++,
  config: defaultParticleConfig,
};

export function resetParticleIds(): void {
  _nextId = 0;
}

export abstract class AbstractParticle implements IParticle {
  readonly id: number;
  x: number;
  y: number;
  vx: number;
  vy: number;
  health: number;
  maxHealth: number;
  attack: number;
  radius: number;
  speed: number;
  owner: 0 | 1;
  alive: boolean = true;

  readonly spawnX: number;
  readonly spawnY: number;
  age: number = 0;

  sprite: Phaser.GameObjects.Image | null = null;
  trail: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  /** Last cell the particle occupied (for ownership enter/leave). -1 = not yet set. */
  private _lastCellCol: number = -1;
  private _lastCellRow: number = -1;

  /** Defense reduction (0-0.25) applied in takeDamage. Set by engine each tick based on owned cell. */
  defenseFactor: number = 0;

  /** Tower-based slow multiplier (0-1). Set by engine each tick. 1.0 = no slow. */
  towerSlowFactor: number = 1;

  protected readonly config: ParticleConfig;

  abstract readonly typeName: string;

  constructor(
    x: number, y: number, owner: 0 | 1,
    health: number, attack: number, radius: number, speed: number,
    deps: ParticleDependencies = defaultDependencies,
  ) {
    this.id = deps.nextId();
    this.config = deps.config;
    this.x = x;
    this.y = y;
    this.owner = owner;
    this.health = health;
    this.maxHealth = health;
    this.attack = attack;
    this.radius = radius;
    this.speed = speed;
    this.spawnX = x;
    this.spawnY = y;

    const angle = (Math.random() - 0.5) * Math.PI * 0.8;
    const dir = owner === 0 ? 1 : -1;
    this.vx = Math.cos(angle) * speed * dir;
    this.vy = Math.sin(angle) * speed;
  }

  get canMove(): boolean {
    return true;
  }

  update(dt: number, context: GameContext): void {
    if (!this.alive) return;

    this.age += dt;

    if (this.canMove) {
      const cellSlow = context.cellEffects.getSlowFactor(this.x, this.y, this.owner);
      const effectiveDt = dt * cellSlow * this.towerSlowFactor;

      this.applyRandomDrift(effectiveDt);

      const nx = this.x + this.vx * effectiveDt;
      const ny = this.y + this.vy * effectiveDt;

      const clampedX = Math.max(this.radius, Math.min(this.config.gameWidth - this.radius, nx));

      const minY = this.radius;
      const maxY = this.config.gameHeight - this.radius;
      const rangeY = maxY - minY;
      let newY = ny;
      if (ny < minY || ny > maxY) {
        const offset = ((ny - minY) % rangeY + rangeY) % rangeY;
        newY = minY + offset;
      }

      const gridWallX = context.grid.isWall(clampedX, this.y);
      const tempWallX = context.cellEffects.isTempWall(clampedX, this.y, this.owner);
      const blockedX = gridWallX || tempWallX;

      const gridWallY = context.grid.isWall(this.x, newY);
      const tempWallY = context.cellEffects.isTempWall(this.x, newY, this.owner);
      const blockedY = gridWallY || tempWallY;

      if (!blockedX) {
        this.x = clampedX;
      } else {
        if (tempWallX) {
          this.damageWallAtPixel(clampedX, this.y, context);
        }
        this.vx = -this.vx;
        this.addRandomDeviation();
      }

      if (!blockedY) {
        this.y = newY;
      } else {
        if (tempWallY) {
          this.damageWallAtPixel(this.x, newY, context);
        }
        this.vy = -this.vy;
        this.addRandomDeviation();
      }

      this.preventBaseReturn();
    }

    this.updateCellOwnership(context);

    if (this.sprite) {
      this.sprite.setPosition(this.x, this.y);
    }

    this.onUpdate(dt, context);
  }

  onUpdate(_dt: number, _context: GameContext): void {}

  onCollide(other: IParticle, _context: GameContext): void {
    const speedDiff = other.speed - this.speed;
    const speedMultiplier = speedDiff > 0
      ? 1 + CONFIG.SPEED_COMBAT_BONUS * (speedDiff / CONFIG.PARTICLE_SPEED)
      : 1;
    const rawHpScaling = CONFIG.PERCENT_HP_DAMAGE_SCALING * (this.maxHealth / CONFIG.PARTICLE_BASE_HEALTH);
    const defenseReduction = Math.min(1, this.defenseFactor * CONFIG.DEFENSE_HP_SCALING_REDUCTION);
    const hpScaling = other.attack > 0
      ? 1 + rawHpScaling * (1 - defenseReduction)
      : 1;
    this.takeDamage(other.attack * speedMultiplier * hpScaling);
  }

  onDeath(_context: GameContext): void {}

  getBaseDamage(): number {
    return this.config.baseDamageOnReach;
  }

  private updateCellOwnership(context: GameContext): void {
    const col = Math.floor(this.x / context.grid.cellW);
    const row = Math.floor(this.y / context.grid.cellH);
    if (this._lastCellCol !== col || this._lastCellRow !== row) {
      if (this._lastCellCol >= 0 && this._lastCellRow >= 0) {
        context.cellEffects.leaveCell(this._lastCellCol, this._lastCellRow, this.owner);
      }
      context.cellEffects.enterCell(col, row, this.owner);
      this._lastCellCol = col;
      this._lastCellRow = row;
    }
  }

  /** Called by engine before destroy to leave current cell. Exposed for cleanup. */
  leaveCurrentCell(context: GameContext): void {
    if (this._lastCellCol >= 0 && this._lastCellRow >= 0) {
      context.cellEffects.leaveCell(this._lastCellCol, this._lastCellRow, this.owner);
      this._lastCellCol = -1;
      this._lastCellRow = -1;
    }
  }

  private damageWallAtPixel(px: number, py: number, context: GameContext): void {
    const col = Math.floor(px / context.grid.cellW);
    const row = Math.floor(py / context.grid.cellH);
    context.cellEffects.damageWallAt(col, row, this.attack, this.owner);
  }

  private preventBaseReturn(): void {
    const baseX = this.owner === 0 ? 0 : this.config.gameWidth;
    const distToBase = Math.abs(this.x - baseX);
    const minDist = this.config.baseWidthCells * (this.config.gameWidth / this.config.mazeCols) + 10;

    if (distToBase < minDist) {
      const pushDir = this.owner === 0 ? 1 : -1;
      this.vx = Math.abs(this.vx) * pushDir;
    }
  }

  private applyRandomDrift(dt: number): void {
    const magnitude = this.config.driftStrength * this.speed * dt;
    let driftX = (Math.random() - 0.5) * 2 * magnitude;
    let driftY = (Math.random() - 0.5) * 2 * magnitude;

    const towardsEnemyX = this.owner === 0 ? 1 : -1;
    if (driftX * towardsEnemyX < 0 && Math.random() < this.config.enemyBias) {
      driftX = -driftX;
    }
    this.vx += driftX;
    this.vy += driftY;

    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > 0) {
      this.vx = (this.vx / currentSpeed) * this.speed;
      this.vy = (this.vy / currentSpeed) * this.speed;
    }
  }

  private addRandomDeviation(): void {
    let driftX = (Math.random() - 0.5) * 20;
    let driftY = (Math.random() - 0.5) * 20;

    const towardsEnemyX = this.owner === 0 ? 1 : -1;
    if (driftX * towardsEnemyX < 0 && Math.random() < this.config.enemyBias) {
      driftX = -driftX;
    }
    this.vx += driftX;
    this.vy += driftY;

    const currentSpeed = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (currentSpeed > 0) {
      this.vx = (this.vx / currentSpeed) * this.speed;
      this.vy = (this.vy / currentSpeed) * this.speed;
    }
  }

  isStuck(): boolean {
    if (this.age < this.config.stuckThresholdSeconds) return false;
    const blockSize = this.config.gameWidth / this.config.mazeCols;
    const maxDist = this.config.stuckThresholdBlocks * blockSize;
    const dx = this.x - this.spawnX;
    const dy = this.y - this.spawnY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < maxDist;
  }

  takeDamage(amount: number): void {
    const effectiveAmount = amount * (1 - this.defenseFactor);
    this.health -= effectiveAmount;
    if (this.health <= 0) {
      this.alive = false;
    }
  }

  destroy(): void {
    this.alive = false;
    if (this.trail) {
      this.trail.stop();
      this.trail.destroy();
      this.trail = null;
    }
    if (this.sprite) {
      this.sprite.destroy();
      this.sprite = null;
    }
  }
}
