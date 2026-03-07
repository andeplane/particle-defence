import { CONFIG, getTowerUpgradeCost, type TowerType } from './config';
import { AIController, type AIGameState } from './ai';
import { BasicParticle, type IParticle, type GameContext, TowerCarrierParticle } from './particles';
import { LaserTowerParticle } from './particles/LaserTowerParticle';
import { SlowTowerParticle } from './particles/SlowTowerParticle';
import { createPlayer, type IPlayer } from './player';
import { SpatialHash, type ISpatialHash } from './spatial-hash';
import { resolveCollisions, type CollisionResult } from './collision';
import type { IGrid } from './grid';
import type { ICellEffectMap } from './grid/CellEffect';
import { CellEffectMap } from './grid/CellEffectMap';

export interface GameEngineCallbacks {
  onKill(killer: IParticle, victim: IParticle): void;
  onBaseDamage(playerId: 0 | 1, damage: number, px: number, py: number): void;
  onParticleSpawned(particle: IParticle): void;
  onNuke(playerId: 0 | 1, killCount: number): void;
  onGameOver(winner: number): void;
  onStuckRespawn(owner: 0 | 1): void;
  onInterest(playerId: 0 | 1, amount: number): void;
  onTowerPlaced(tower: IParticle, playerId: 0 | 1): void;
  onTowerDeath(tower: IParticle): void;
  spawnExplosion(x: number, y: number, color: number): void;
}

export type AIMode = 'none' | 'single' | 'both';

export type GameEngineDependencies = {
  createPlayer: (id: 0 | 1) => IPlayer;
  createParticle: (x: number, y: number, owner: 0 | 1, h: number, a: number, r: number, s: number) => IParticle;
  createSpatialHash: () => ISpatialHash;
  createCellEffectMap: (grid: IGrid) => ICellEffectMap;
  createAIController: ((playerId: 0 | 1) => AIController) | null;
  resolveCollisions: (context: GameContext) => CollisionResult;
  killReward: number;
  nuclearKillRewardFraction: number;
  maxParticlesTotal: number;
};

const defaultDependencies: GameEngineDependencies = {
  createPlayer: (id) => createPlayer(id),
  createParticle: (x, y, owner, h, a, r, s) => new BasicParticle(x, y, owner, h, a, r, s),
  createSpatialHash: () => new SpatialHash(),
  createCellEffectMap: (grid) => new CellEffectMap({ cols: grid.cols, rows: grid.rows, cellW: grid.cellW, cellH: grid.cellH }),
  createAIController: null,
  resolveCollisions,
  killReward: CONFIG.KILL_REWARD,
  nuclearKillRewardFraction: CONFIG.NUCLEAR_KILL_REWARD_FRACTION,
  maxParticlesTotal: CONFIG.MAX_PARTICLES_TOTAL,
};

export class GameEngine implements AIGameState {
  players!: [IPlayer, IPlayer];
  particles: IParticle[] = [];
  spatialHash!: ISpatialHash;
  cellEffects!: ICellEffectMap;
  readonly grid: IGrid;
  spawnTimers: number[] = [0, 0];
  /** Per-player interest payout accumulators (ms) */
  interestTimers: number[] = [0, 0];
  gameOver: boolean = false;
  winner: number = -1;
  gameTimeMs: number = 0;

  /** Active carrier per player (null if none). */
  carriers: [TowerCarrierParticle | null, TowerCarrierParticle | null] = [null, null];
  /** Placed towers per player. */
  towers: [Array<LaserTowerParticle | SlowTowerParticle>, Array<LaserTowerParticle | SlowTowerParticle>] = [[], []];

  private readonly deps: GameEngineDependencies;
  private readonly callbacks: GameEngineCallbacks;
  private aiControllers: AIController[] = [];

  constructor(
    grid: IGrid,
    callbacks: GameEngineCallbacks,
    depOverrides?: Partial<GameEngineDependencies>,
  ) {
    this.grid = grid;
    this.callbacks = callbacks;
    this.deps = depOverrides ? { ...defaultDependencies, ...depOverrides } : defaultDependencies;
  }

  init(mode: AIMode | boolean): void {
    const aiMode: AIMode = typeof mode === 'boolean' ? (mode ? 'single' : 'none') : mode;

    this.players = [this.deps.createPlayer(0), this.deps.createPlayer(1)];
    this.spatialHash = this.deps.createSpatialHash();
    this.cellEffects = this.deps.createCellEffectMap(this.grid);
    this.particles = [];
    this.gameOver = false;
    this.winner = -1;
    this.spawnTimers = [0, 0];
    this.interestTimers = [0, 0];
    this.gameTimeMs = 0;
    this.carriers = [null, null];
    this.towers = [[], []];

    this.aiControllers = [];
    if (aiMode === 'none') return;

    const factory = this.deps.createAIController;
    if (aiMode === 'single') {
      this.aiControllers.push(factory ? factory(1) : new AIController(1));
    } else {
      this.aiControllers.push(factory ? factory(0) : new AIController(0));
      this.aiControllers.push(factory ? factory(1) : new AIController(1));
    }
  }

  tick(delta: number): void {
    if (this.gameOver) return;

    this.gameTimeMs += delta;

    for (const ai of this.aiControllers) {
      ai.update(delta, this);
    }

    const dt = delta / 1000;

    this.cellEffects.update(delta);

    for (let i = 0; i < 2; i++) {
      this.spawnTimers[i] += delta;
      if (this.spawnTimers[i] >= this.players[i].spawnInterval) {
        this.spawnTimers[i] = 0;
        this.spawnParticle(i as 0 | 1);
      }
    }

    this.applyInterest(delta);

    this.resetTowerSlowFactors();

    const context = this.createContext();

    for (const p of this.particles) {
      if (p.alive) p.update(dt, context);
    }

    this.updateParticleDefenseFactors(context);

    this.applyCellDamage(dt);

    this.spatialHash.clear();
    for (const p of this.particles) {
      if (p.alive) this.spatialHash.insert(p);
    }

    const collisionResult = this.deps.resolveCollisions(context);

    for (const kill of collisionResult.kills) {
      this.callbacks.onKill(kill.killer, kill.victim);
    }

    this.checkBaseDamage();
    this.respawnStuckParticles();
    this.cleanupDeadParticles();
    this.cleanupDeadTowers();
    this.checkWinCondition();
  }

  spawnParticle(owner: 0 | 1): void {
    const player = this.players[owner];
    const count = this.particles.filter(p => p.alive && p.owner === owner).length;
    const totalAlive = this.particles.filter(p => p.alive).length;
    if (count >= player.maxParticles || totalAlive >= this.deps.maxParticlesTotal) return;

    const baseW = this.grid.baseWidthCells * this.grid.cellW;
    let x = owner === 0 ? baseW / 2 : CONFIG.GAME_WIDTH - baseW / 2;
    let y = CONFIG.GAME_HEIGHT / 2;
    const maxAttempts = 50;
    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      if (owner === 0) {
        x = baseW * 0.2 + Math.random() * baseW * 0.6;
      } else {
        x = CONFIG.GAME_WIDTH - baseW + baseW * 0.2 + Math.random() * baseW * 0.6;
      }
      y = CONFIG.GAME_HEIGHT * 0.2 + Math.random() * CONFIG.GAME_HEIGHT * 0.6;
      if (!this.grid.isWall(x, y)) break;
    }
    if (this.grid.isWall(x, y)) {
      x = owner === 0 ? baseW / 2 : CONFIG.GAME_WIDTH - baseW / 2;
      y = CONFIG.GAME_HEIGHT / 2;
    }

    const p = this.deps.createParticle(
      x, y, owner,
      player.particleHealth,
      player.particleAttack,
      player.particleRadius,
      player.particleSpeed
    );

    this.particles.push(p);
    this.callbacks.onParticleSpawned(p);
  }

  launchNuke(playerId: 0 | 1): boolean {
    if (this.gameOver) return false;
    const player = this.players[playerId];
    if (!player.canUseNuke(this.gameTimeMs)) return false;

    const enemyId = playerId === 0 ? 1 : 0;

    const context = this.createContext();
    let killCount = 0;
    for (const p of this.particles) {
      if (!p.alive) continue;
      if (p.owner === enemyId) {
        p.leaveCurrentCell(context);
        p.destroy();
        killCount++;
      }
    }

    const reward = Math.floor(killCount * this.deps.killReward * this.deps.nuclearKillRewardFraction);
    player.gold += reward;

    player.useNuke(this.gameTimeMs);
    this.callbacks.onNuke(playerId, killCount);
    return true;
  }

  constructTower(playerId: 0 | 1, towerType: TowerType): boolean {
    if (this.gameOver) return false;
    const player = this.players[playerId];
    if (this.carriers[playerId] !== null) return false;
    if (this.towers[playerId].length >= CONFIG.TOWER_MAX_PER_PLAYER) return false;
    if (!player.payForConstruction(towerType)) return false;

    const baseW = this.grid.baseWidthCells * this.grid.cellW;
    const x = playerId === 0 ? baseW / 2 : CONFIG.GAME_WIDTH - baseW / 2;
    const y = CONFIG.GAME_HEIGHT / 2;

    const carrier = new TowerCarrierParticle(
      x, y, playerId,
      CONFIG.TOWER_CARRIER_HP, player.particleSpeed / 2, towerType,
    );

    this.carriers[playerId] = carrier;
    this.particles.push(carrier);
    this.callbacks.onParticleSpawned(carrier);
    return true;
  }

  placeTower(playerId: 0 | 1): boolean {
    if (this.gameOver) return false;
    const carrier = this.carriers[playerId];
    if (!carrier || !carrier.alive) {
      this.carriers[playerId] = null;
      return false;
    }

    const context = this.createContext();
    carrier.leaveCurrentCell(context);
    carrier.destroy();

    let tower: LaserTowerParticle | SlowTowerParticle;
    if (carrier.towerType === 'laser') {
      tower = new LaserTowerParticle(carrier.x, carrier.y, playerId);
    } else {
      tower = new SlowTowerParticle(carrier.x, carrier.y, playerId);
    }

    this.towers[playerId].push(tower);
    this.particles.push(tower);
    this.carriers[playerId] = null;
    this.callbacks.onParticleSpawned(tower);
    this.callbacks.onTowerPlaced(tower, playerId);
    return true;
  }

  upgradeTower(playerId: 0 | 1, towerIndex: number): boolean {
    if (this.gameOver) return false;
    const playerTowers = this.towers[playerId];
    if (towerIndex < 0 || towerIndex >= playerTowers.length) return false;
    const tower = playerTowers[towerIndex];
    if (!tower.alive) return false;

    const cost = getTowerUpgradeCost(tower.towerType, tower.level);
    const player = this.players[playerId];
    if (player.gold < cost) return false;

    player.gold -= cost;
    tower.upgrade();
    return true;
  }

  buyResearch(playerId: 0 | 1, towerType: TowerType): boolean {
    if (this.gameOver) return false;
    return this.players[playerId].researchTower(towerType);
  }

  private resetTowerSlowFactors(): void {
    for (const p of this.particles) {
      if (p.alive) p.towerSlowFactor = 1;
    }
  }

  private cleanupDeadTowers(): void {
    for (let i = 0; i < 2; i++) {
      this.towers[i] = this.towers[i].filter(t => {
        if (!t.alive) {
          this.callbacks.onTowerDeath(t);
          return false;
        }
        return true;
      });
    }
    for (let i = 0; i < 2; i++) {
      const carrier = this.carriers[i];
      if (carrier && !carrier.alive) {
        this.carriers[i] = null;
      }
    }
  }

  private applyInterest(delta: number): void {
    const intervalMs = CONFIG.INTEREST_INTERVAL_MS;
    for (let i = 0; i < 2; i++) {
      const player = this.players[i];
      const rate = player.goldInterestRate;
      if (rate <= 0 || player.gold <= 0) continue;

      this.interestTimers[i] += delta;
      while (this.interestTimers[i] >= intervalMs) {
        this.interestTimers[i] -= intervalMs;
        const increment = Math.floor(player.gold * rate);
        if (increment > 0) {
          player.gold += increment;
          this.callbacks.onInterest(i as 0 | 1, increment);
        }
      }
    }
  }

  private createContext(): GameContext {
    return {
      grid: this.grid,
      cellEffects: this.cellEffects,
      spatialHash: this.spatialHash,
      particles: this.particles,
      players: this.players,
      gameTimeMs: this.gameTimeMs,
      killReward: this.deps.killReward,
      spawnExplosion: (x, y, color) => this.callbacks.spawnExplosion(x, y, color),
    };
  }

  private updateParticleDefenseFactors(context: GameContext): void {
    for (const p of this.particles) {
      if (!p.alive) continue;
      const owner = p.owner;
      const cellOwner = context.cellEffects.getOwnerAt(p.x, p.y);
      const inOwnedCell = cellOwner === owner;
      const player = this.players[owner];
      p.defenseFactor = inOwnedCell ? player.particleDefense : 0;
    }
  }

  private applyCellDamage(dt: number): void {
    for (const p of this.particles) {
      if (!p.alive) continue;
      const dps = this.cellEffects.getDamagePerSecond(p.x, p.y, p.owner);
      if (dps > 0) {
        p.takeDamage(dps * dt);
      }
    }
  }

  private checkBaseDamage(): void {
    for (const p of this.particles) {
      if (!p.alive) continue;

      const enemyId = p.owner === 0 ? 1 : 0;
      if (this.grid.isInBase(p.x, enemyId as 0 | 1)) {
        const damage = p.getBaseDamage();
        this.players[enemyId].takeDamage(damage);
        this.callbacks.onBaseDamage(enemyId as 0 | 1, damage, p.x, p.y);
        p.alive = false;
        p.leaveCurrentCell(this.createContext());
        p.destroy();
      }
    }
  }

  private respawnStuckParticles(): void {
    const context = this.createContext();
    for (const p of this.particles) {
      if (!p.alive) continue;
      if (p.isStuck()) {
        const owner = p.owner;
        p.leaveCurrentCell(context);
        p.destroy();
        this.callbacks.onStuckRespawn(owner);
        this.spawnParticle(owner);
      }
    }
  }

  private cleanupDeadParticles(): void {
    const context = this.createContext();
    this.particles = this.particles.filter(p => {
      if (!p.alive) {
        p.leaveCurrentCell(context);
        p.destroy();
        return false;
      }
      return true;
    });
  }

  private checkWinCondition(): void {
    for (let i = 0; i < 2; i++) {
      if (!this.players[i].isAlive) {
        this.gameOver = true;
        this.winner = i === 0 ? 1 : 0;
        this.callbacks.onGameOver(this.winner);
        break;
      }
    }
  }
}
