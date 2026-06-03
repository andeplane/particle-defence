import { CONFIG, type TowerType } from './config';
import { AIController, type AIGameState } from './ai';
import { BasicParticle, type IParticle, type GameContext, TowerCarrierParticle } from './particles';
import { LaserTowerParticle } from './particles/LaserTowerParticle';
import { SlowTowerParticle } from './particles/SlowTowerParticle';
import { ParticleSpawnerTower } from './particles/ParticleSpawnerTower';
import { createPlayer, type IPlayer } from './player';
import { SpatialHash, type ISpatialHash } from './spatial-hash';
import { resolveCollisions, type CollisionResult } from './collision';
import type { IGrid, TowerSite } from './grid';
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

type PendingConstruction = {
  playerId: 0 | 1;
  towerType: TowerType;
  siteId: number;
  x: number;
  y: number;
  startedAtMs: number;
  durationMs: number;
};

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
  private tickCount: number = 0;

  /** Active carrier per player (null if none). */
  carriers: [TowerCarrierParticle | null, TowerCarrierParticle | null] = [null, null];
  /** Placed towers per player. */
  towers: [Array<LaserTowerParticle | SlowTowerParticle>, Array<LaserTowerParticle | SlowTowerParticle>] = [[], []];
  /** Indestructible spawner towers per player. */
  spawnerTowers: [ParticleSpawnerTower[], ParticleSpawnerTower[]] = [[], []];
  /** Construction timers: gold already paid, tower will be placed when timer elapses. */
  pendingConstructions: PendingConstruction[] = [];

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
    this.spawnerTowers = [[], []];
    this.pendingConstructions = [];

    for (const slot of this.grid.spawnerSlots) {
      const x = (slot.col + 0.5) * this.grid.cellW;
      const y = (slot.row + 0.5) * this.grid.cellH;
      const spawner = new ParticleSpawnerTower(x, y, slot.playerId);
      this.spawnerTowers[slot.playerId].push(spawner);
      this.particles.push(spawner);
      this.callbacks.onParticleSpawned(spawner);
    }

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
    this.tickCount++;

    const first = (this.tickCount % 2) as 0 | 1;
    const second = (1 - first) as 0 | 1;

    if (this.aiControllers.length === 2) {
      this.aiControllers[first].update(delta, this);
      this.aiControllers[second].update(delta, this);
    } else {
      for (const ai of this.aiControllers) {
        ai.update(delta, this);
      }
    }

    const dt = delta / 1000;

    this.cellEffects.update(delta);

    const spawnOrder: (0 | 1)[] = [first, second];
    for (const i of spawnOrder) {
      this.spawnTimers[i] += delta;
      const interval = this.players[i].spawnInterval;
      while (this.spawnTimers[i] >= interval) {
        this.spawnTimers[i] -= interval;
        this.spawnParticle(i);
      }
    }

    this.applyInterest(delta);
    this.tickResearchTimers();
    this.tickPendingConstructions();
    this.tickParticleUpgrades();
    this.tickTowerUpgrades();

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

    const spawners = this.spawnerTowers[owner];
    let x: number;
    let y: number;

    if (spawners.length > 0) {
      const spawner = spawners[Math.floor(Math.random() * spawners.length)];
      x = spawner.x;
      y = spawner.y;
    } else {
      const baseW = this.grid.baseWidthCells * this.grid.cellW;
      x = owner === 0 ? baseW / 2 : CONFIG.GAME_WIDTH - baseW / 2;
      y = CONFIG.GAME_HEIGHT / 2;
      for (let attempt = 0; attempt < 50; attempt++) {
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
      if (p.owner === enemyId && p.typeName !== 'spawnerTower') {
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

  constructTower(playerId: 0 | 1, towerType: TowerType, siteId: number): boolean {
    if (this.gameOver) return false;
    const player = this.players[playerId];
    const pendingCount = this.pendingConstructions.filter(pc => pc.playerId === playerId).length;
    if (this.towers[playerId].length + pendingCount >= CONFIG.TOWER_MAX_PER_PLAYER) return false;
    const site = this.grid.towerSites.find((candidate) => candidate.id === siteId);
    if (!site) return false;
    if (this.isTowerSiteOccupied(site.id)) return false;
    if (!this.canBuildTowerAt(playerId, site.id)) return false;
    if (!player.hasResearched(towerType)) return false;
    if (!player.canAffordConstruction(towerType)) return false;

    if (!player.payForConstruction(towerType)) return false;

    const x = (site.col + 0.5) * this.grid.cellW;
    const y = (site.row + 0.5) * this.grid.cellH;
    const durationMs = CONFIG.TOWER_CONSTRUCTION_DURATION_MS[towerType] ?? 0;
    this.pendingConstructions.push({ playerId, towerType, siteId, x, y, startedAtMs: this.gameTimeMs, durationMs });
    return true;
  }

  placeTower(playerId: 0 | 1): boolean {
    this.carriers[playerId] = null;
    return false;
  }

  getEligibleTowerSites(playerId: 0 | 1): readonly TowerSite[] {
    return this.grid.towerSites.filter((site) => this.canBuildTowerAt(playerId, site.id));
  }

  canBuildTowerAt(playerId: 0 | 1, siteId: number): boolean {
    const site = this.grid.towerSites.find((candidate) => candidate.id === siteId);
    if (!site) return false;
    if (this.isTowerSiteOccupied(site.id)) return false;
    const adjacentOpenCells = this.getAdjacentOpenCells(site);
    if (adjacentOpenCells.length === 0) return false;

    for (const cell of adjacentOpenCells) {
      const px = (cell.col + 0.5) * this.grid.cellW;
      const py = (cell.row + 0.5) * this.grid.cellH;
      if (this.cellEffects.getOwnerAt(px, py) !== playerId) return false;
    }

    return true;
  }

  isTowerSiteOccupied(siteId: number): boolean {
    const site = this.grid.towerSites.find((candidate) => candidate.id === siteId);
    if (!site) return false;
    const placed = this.towers.some((playerTowers) => playerTowers.some((tower) => (
      tower.alive
      && Math.floor(tower.x / this.grid.cellW) === site.col
      && Math.floor(tower.y / this.grid.cellH) === site.row
    )));
    const pending = this.pendingConstructions.some(pc => pc.siteId === siteId);
    return placed || pending;
  }

  upgradeTower(playerId: 0 | 1, towerIndex: number): boolean {
    if (this.gameOver) return false;
    const playerTowers = this.towers[playerId];
    if (towerIndex < 0 || towerIndex >= playerTowers.length) return false;
    const tower = playerTowers[towerIndex];
    if (!tower.alive) return false;
    if (tower.pendingUpgrade) return false;

    const cost = tower.getUpgradeCost();
    const player = this.players[playerId];
    if (player.gold < cost) return false;

    player.gold -= cost;
    tower.pendingUpgrade = { startedAtMs: this.gameTimeMs, durationMs: CONFIG.TOWER_UPGRADE_DURATION_MS };
    return true;
  }

  getPendingTowerUpgrade(playerId: 0 | 1, towerIndex: number): { progress: number; remainingMs: number } | null {
    const tower = this.towers[playerId][towerIndex];
    if (!tower?.pendingUpgrade) return null;
    const elapsed = this.gameTimeMs - tower.pendingUpgrade.startedAtMs;
    const progress = Math.min(1, elapsed / tower.pendingUpgrade.durationMs);
    const remainingMs = Math.max(0, tower.pendingUpgrade.startedAtMs + tower.pendingUpgrade.durationMs - this.gameTimeMs);
    return { progress, remainingMs };
  }

  buyResearch(playerId: 0 | 1, towerType: TowerType): boolean {
    if (this.gameOver) return false;
    const durationMs = CONFIG.TOWER_RESEARCH_DURATION_MS[towerType] ?? 0;
    return this.players[playerId].startTowerResearch(towerType, this.gameTimeMs, durationMs);
  }

  getPendingConstruction(playerId: 0 | 1): { towerType: TowerType; progress: number; remainingMs: number } | null {
    // Return the most recently started construction so the clock reflects the latest action
    const pc = this.pendingConstructions
      .filter(p => p.playerId === playerId)
      .sort((a, b) => b.startedAtMs - a.startedAtMs)[0];
    if (!pc) return null;
    const elapsed = this.gameTimeMs - pc.startedAtMs;
    const progress = pc.durationMs > 0 ? Math.min(1, elapsed / pc.durationMs) : 1;
    const remainingMs = Math.max(0, pc.startedAtMs + pc.durationMs - this.gameTimeMs);
    return { towerType: pc.towerType, progress, remainingMs };
  }

  buyNukeResearch(playerId: 0 | 1): boolean {
    if (this.gameOver) return false;
    return this.players[playerId].startNukeResearch(this.gameTimeMs, CONFIG.NUKE_RESEARCH_DURATION_MS);
  }

  private createTower(towerType: TowerType, x: number, y: number, playerId: 0 | 1): LaserTowerParticle | SlowTowerParticle {
    return towerType === 'laser'
      ? new LaserTowerParticle(x, y, playerId)
      : new SlowTowerParticle(x, y, playerId);
  }

  private getAdjacentOpenCells(site: TowerSite): Array<{ col: number; row: number }> {
    const candidates = [
      { col: site.col - 1, row: site.row },
      { col: site.col + 1, row: site.row },
      { col: site.col, row: site.row - 1 },
      { col: site.col, row: site.row + 1 },
    ];

    return candidates.filter(({ col, row }) => (
      col >= 0
      && col < this.grid.cols
      && row >= 0
      && row < this.grid.rows
      && this.grid.cells[row][col]
    ));
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
      p.defenseFactor = inOwnedCell ? player.particleDefense : player.globalDefense;
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

  private tickResearchTimers(): void {
    for (let i = 0; i < 2; i++) {
      this.players[i].tickResearch(this.gameTimeMs);
    }
  }

  private tickParticleUpgrades(): void {
    for (let i = 0; i < 2; i++) {
      this.players[i].tickUpgrades(this.gameTimeMs);
    }
  }

  private tickTowerUpgrades(): void {
    for (const playerTowers of this.towers) {
      for (const tower of playerTowers) {
        if (tower.pendingUpgrade &&
            this.gameTimeMs - tower.pendingUpgrade.startedAtMs >= tower.pendingUpgrade.durationMs) {
          tower.upgrade();
          tower.pendingUpgrade = null;
        }
      }
    }
  }

  private tickPendingConstructions(): void {
    this.pendingConstructions = this.pendingConstructions.filter((pc) => {
      if (this.gameTimeMs - pc.startedAtMs < pc.durationMs) return true;
      const tower = this.createTower(pc.towerType, pc.x, pc.y, pc.playerId);
      this.towers[pc.playerId].push(tower);
      this.particles.push(tower);
      this.callbacks.onParticleSpawned(tower);
      this.callbacks.onTowerPlaced(tower, pc.playerId);
      return false;
    });
  }
}
