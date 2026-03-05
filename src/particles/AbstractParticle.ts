import { CONFIG } from '../config';
import { isWall } from '../maze';
import type { GameContext } from './GameContext';

let nextId = 0;

export abstract class AbstractParticle {
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

  // Visual references (managed by GameScene)
  sprite: Phaser.GameObjects.Image | null = null;
  trail: Phaser.GameObjects.Particles.ParticleEmitter | null = null;

  abstract readonly typeName: string;

  constructor(x: number, y: number, owner: 0 | 1, health: number, attack: number, radius: number, speed: number) {
    this.id = nextId++;
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

  /** Whether this particle moves through the maze (false for turrets). */
  get canMove(): boolean {
    return true;
  }

  update(dt: number, context: GameContext): void {
    if (!this.alive) return;

    this.age += dt;

    if (this.canMove) {
      this.applyRandomDrift(dt);

      const nx = this.x + this.vx * dt;
      const ny = this.y + this.vy * dt;

      const clampedX = Math.max(this.radius, Math.min(CONFIG.GAME_WIDTH - this.radius, nx));

      const minY = this.radius;
      const maxY = CONFIG.GAME_HEIGHT - this.radius;
      const rangeY = maxY - minY;
      let newY = ny;
      if (ny < minY || ny > maxY) {
        const offset = ((ny - minY) % rangeY + rangeY) % rangeY;
        newY = minY + offset;
      }

      const wallX = isWall(context.maze, clampedX, this.y);
      const wallY = isWall(context.maze, this.x, newY);

      if (!wallX) {
        this.x = clampedX;
      } else {
        this.vx = -this.vx;
        this.addRandomDeviation();
      }

      if (!wallY) {
        this.y = newY;
      } else {
        this.vy = -this.vy;
        this.addRandomDeviation();
      }

      this.preventBaseReturn();
    }

    if (this.sprite) {
      this.sprite.setPosition(this.x, this.y);
    }

    this.onUpdate(dt, context);
  }

  /** Called every tick after movement. Override for passive abilities. */
  onUpdate(_dt: number, _context: GameContext): void {}

  /** Called when this particle collides with an enemy. Default: take damage equal to other's attack. */
  onCollide(other: AbstractParticle, _context: GameContext): void {
    this.takeDamage(other.attack);
  }

  /** Called when this particle dies. Override for death effects (AoE, etc.). */
  onDeath(_context: GameContext): void {}

  /** Damage dealt to enemy base when reaching it. */
  getBaseDamage(): number {
    return CONFIG.BASE_DAMAGE_ON_REACH;
  }

  private preventBaseReturn(): void {
    const baseX = this.owner === 0 ? 0 : CONFIG.GAME_WIDTH;
    const distToBase = Math.abs(this.x - baseX);
    const minDist = CONFIG.BASE_WIDTH_CELLS * (CONFIG.GAME_WIDTH / CONFIG.MAZE_COLS) + 10;

    if (distToBase < minDist) {
      const pushDir = this.owner === 0 ? 1 : -1;
      this.vx = Math.abs(this.vx) * pushDir;
    }
  }

  private applyRandomDrift(dt: number): void {
    const magnitude = CONFIG.PARTICLE_DRIFT_STRENGTH * this.speed * dt;
    let driftX = (Math.random() - 0.5) * 2 * magnitude;
    let driftY = (Math.random() - 0.5) * 2 * magnitude;

    const towardsEnemyX = this.owner === 0 ? 1 : -1;
    if (driftX * towardsEnemyX < 0 && Math.random() < CONFIG.PARTICLE_ENEMY_BIAS) {
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
    if (driftX * towardsEnemyX < 0 && Math.random() < CONFIG.PARTICLE_ENEMY_BIAS) {
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
    if (this.age < CONFIG.STUCK_THRESHOLD_SECONDS) return false;
    const blockSize = CONFIG.GAME_WIDTH / CONFIG.MAZE_COLS;
    const maxDist = CONFIG.STUCK_THRESHOLD_BLOCKS * blockSize;
    const dx = this.x - this.spawnX;
    const dy = this.y - this.spawnY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    return dist < maxDist;
  }

  takeDamage(amount: number): void {
    this.health -= amount;
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
