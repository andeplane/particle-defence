import Phaser from 'phaser';
import { AIController } from '../ai';
import { CONFIG, TOWER_TYPE, setDebugEverythingCheap, type UpgradeType, type TowerType } from '../config';
import { generateGrid, type GridType } from '../grid';
import type { CellEffect } from '../grid/CellEffect';
import type { TowerSite } from '../grid';
import type { IParticle } from '../particles';
import { LaserTowerParticle } from '../particles/LaserTowerParticle';
import { WeaknessTowerParticle } from '../particles/WeaknessTowerParticle';
import { TowerCarrierParticle } from '../particles/TowerCarrierParticle';
import { ParticleSpawnerTower } from '../particles/ParticleSpawnerTower';
import { GameEngine, type GameEngineCallbacks } from '../GameEngine';
import { MatchStatsRecorder } from '../stats';
import { GAME_MODE, type GameMode } from './MenuScene';
import type { IGameViewModel, TowerSelectionForRender } from './UIScene';
import { SCENE_KEYS } from './SceneKeys';
import { getLaserStatsAtLevel } from '../particles/LaserTowerParticle';
import { getWeaknessStatsAtLevel } from '../particles/WeaknessTowerParticle';
import { getTowerUpgradeCost } from '../config';

export class GameScene extends Phaser.Scene implements IGameViewModel {
  static readonly TEXTURES = {
    LASER_TOWER: 'laser-tower',
    WEAKNESS_TOWER: 'weakness-tower',
    SPAWNER_P1: 'spawner_p1',
    SPAWNER_P2: 'spawner_p2',
    PARTICLE_P1: 'particle_p1',
    PARTICLE_P2: 'particle_p2',
    TRAIL_DOT: 'trail_dot',
    EXPLOSION_DOT: 'explosion_dot',
  } as const;

  engine!: GameEngine;
  mode: GameMode = GAME_MODE.PVP;
  debugSpeedMultiplier: number = 1;
  debugEverythingCheap: boolean = false;
  private statsRecorder!: MatchStatsRecorder;

  setDebugSpeedMultiplier(speed: number): void {
    this.debugSpeedMultiplier = speed;
  }

  setDebugEverythingCheap(enabled: boolean): void {
    this.debugEverythingCheap = enabled;
    setDebugEverythingCheap(enabled);
  }

  private glowTextureP1Created = false;
  private glowTextureP2Created = false;
  private effectsGfx!: Phaser.GameObjects.Graphics;
  private towerSiteGfx!: Phaser.GameObjects.Graphics;
  private towerSiteZones: Phaser.GameObjects.Zone[] = [];
  private towerSiteTooltip: Phaser.GameObjects.Text | null = null;

  private kbTowerTooltips: [Phaser.GameObjects.Text | null, Phaser.GameObjects.Text | null] = [null, null];
  private kbSelectedTower: [IParticle | null, IParticle | null] = [null, null];
  private kbSelectedKills: [number, number] = [0, 0];

  get players() { return this.engine.players; }
  get particles() { return this.engine.particles; }
  get gameOver() { return this.engine.gameOver; }
  get gameTimeMs() { return this.engine.gameTimeMs; }

  towerSelectionForRender: [TowerSelectionForRender, TowerSelectionForRender] = [
    { active: false, selectedIndex: -1 },
    { active: false, selectedIndex: -1 },
  ];

  constructor() {
    super({ key: SCENE_KEYS.GAME });
  }

  init(data: { mode?: GameMode; gridType?: GridType }): void {
    this.mode = data.mode ?? GAME_MODE.PVP;
    const gridType = data.gridType ?? 'random';
    const grid = generateGrid(gridType);

    this.statsRecorder = new MatchStatsRecorder({ cellW: grid.cellW });

    const callbacks: GameEngineCallbacks = {
      onKill: (killer, victim) => {
        killer.kills++;
        const victimColor = victim.owner === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
        this.spawnExplosion(victim.x, victim.y, victimColor);
        this.statsRecorder.recordKill(killer.owner);
        this.statsRecorder.recordUnitDamage(killer.owner, victim.maxHealth);
        this.statsRecorder.recordGoldIncome(killer.owner, CONFIG.KILL_REWARD);
        if (killer.typeName === LaserTowerParticle.TYPE_NAME ||
            killer.typeName === WeaknessTowerParticle.TYPE_NAME) {
          this.statsRecorder.recordTowerKill(killer.owner);
        }
      },
      onBaseDamage: (_playerId, damage, px, py) => {
        const baseColor = _playerId === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
        this.spawnExplosion(px, py, baseColor);
        this.cameras.main.shake(100, 0.003);
        const attacker = _playerId === 0 ? 1 : 0;
        this.statsRecorder.recordBaseDamage(attacker as 0 | 1, damage);
      },
      onParticleSpawned: (p) => this.attachVisuals(p),
      onNuke: (playerId, killCount) => {
        this.cameras.main.shake(300, 0.008);
        this.statsRecorder.recordNuke(playerId, killCount);
        const reward = Math.floor(killCount * CONFIG.KILL_REWARD * CONFIG.NUCLEAR_KILL_REWARD_FRACTION);
        this.statsRecorder.recordGoldIncome(playerId, reward);
      },
      onGameOver: (winner) => this.showGameOver(winner),
      onTowerPlaced: (tower, _playerId) => {
        this.attachTowerVisuals(tower);
        this.statsRecorder.recordTowerPlaced(_playerId, (tower as { towerType?: string }).towerType ?? 'unknown');
      },
      onTowerDeath: (tower) => {
        const towerAny = tower as unknown as { _rangeGfx?: Phaser.GameObjects.Graphics };
        if (towerAny._rangeGfx) {
          const gfx = towerAny._rangeGfx;
          towerAny._rangeGfx = undefined;
          gfx.destroy();
          this.towerRangeGfx = this.towerRangeGfx.filter((g) => g !== gfx);
        }
        for (const pid of [0, 1] as const) {
          if (this.kbSelectedTower[pid] === tower) {
            this.hideKbTowerTooltip(pid);
            this.kbSelectedTower[pid] = null;
            this.kbSelectedKills[pid] = 0;
          }
        }
      },
      onStuckRespawn: () => {},
      onInterest: (playerId, amount) => {
        const uiScene = this.scene.get(SCENE_KEYS.UI) as { showInterestPopup?: (id: 0 | 1, amt: number) => void };
        uiScene?.showInterestPopup?.(playerId, amount);
        this.statsRecorder.recordGoldIncome(playerId, amount);
      },
      onTerritoryIncome: (playerId, amount) => {
        const uiScene = this.scene.get(SCENE_KEYS.UI) as { showTerritoryIncomePopup?: (id: 0 | 1, amt: number) => void };
        uiScene?.showTerritoryIncomePopup?.(playerId, amount);
        this.statsRecorder.recordGoldIncome(playerId, amount);
      },
      spawnExplosion: (x, y, color) => this.spawnExplosion(x, y, color),
    };

    this.engine = new GameEngine(grid, callbacks, {
      createAIController: this.mode === GAME_MODE.AI ? (playerId: 0 | 1) => new AIController(playerId) : null,
    });
  }

  preload(): void {
    const base = import.meta.env.BASE_URL;
    this.load.image(GameScene.TEXTURES.LASER_TOWER, `${base}laser-tower.png`);
    this.load.image(GameScene.TEXTURES.WEAKNESS_TOWER, `${base}weakness-tower.png`);
  }

  create(): void {
    this.engine.init(this.mode === GAME_MODE.AI);

    this.renderMaze();
    this.renderBases();
    this.createParticleTextures();
    this.createTowerTextures();

    this.effectsGfx = this.add.graphics();
    this.effectsGfx.setDepth(3);
    this.towerSiteGfx = this.add.graphics();
    this.towerSiteGfx.setDepth(4);

    this.createTowerSiteZones();

    this.scene.launch(SCENE_KEYS.UI, { viewModel: this as IGameViewModel, mode: this.mode });
  }

  getParticleCount(owner: 0 | 1): number {
    return this.engine.particles.filter(p => p.alive && p.owner === owner).length;
  }

  purchaseUpgrade(playerId: 0 | 1, type: UpgradeType): boolean {
    if (this.engine.gameOver) return false;
    const cost = this.engine.players[playerId].getUpgradeCost(type);
    const success = this.engine.players[playerId].startUpgrade(type, this.engine.gameTimeMs, CONFIG.PARTICLE_UPGRADE_DURATION_MS);
    if (success) {
      this.statsRecorder.recordGoldSpent(playerId, cost);
      this.statsRecorder.recordUpgrade(playerId, type);
    }
    return success;
  }

  getPendingTowerUpgrade(playerId: 0 | 1, towerIndex: number): { progress: number; remainingMs: number } | null {
    return this.engine.getPendingTowerUpgrade(playerId, towerIndex);
  }

  launchNuke(playerId: 0 | 1): boolean {
    const enemyId = playerId === 0 ? 1 : 0;
    const enemyColor = enemyId === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
    for (const p of this.engine.particles) {
      if (p.alive && p.owner === enemyId) {
        this.spawnExplosion(p.x, p.y, enemyColor);
      }
    }
    return this.engine.launchNuke(playerId);
  }

  researchTower(playerId: 0 | 1, towerType: TowerType): boolean {
    return this.engine.buyResearch(playerId, towerType);
  }

  researchNuke(playerId: 0 | 1): boolean {
    return this.engine.buyNukeResearch(playerId);
  }

  purchaseResearchNode(playerId: 0 | 1, nodeId: string, isPath: boolean, durationMs: number): boolean {
    return this.engine.purchaseResearchNode(playerId, nodeId, isPath, durationMs);
  }

  constructTower(playerId: 0 | 1, towerType: TowerType, siteId: number): boolean {
    return this.engine.constructTower(playerId, towerType, siteId);
  }

  placeTower(playerId: 0 | 1): boolean {
    return this.engine.placeTower(playerId);
  }

  upgradeTower(playerId: 0 | 1, towerIndex: number): boolean {
    return this.engine.upgradeTower(playerId, towerIndex);
  }

  getEligibleTowerSites(playerId: 0 | 1): readonly TowerSite[] {
    return this.engine.getEligibleTowerSites(playerId);
  }

  getTowerSites(): readonly TowerSite[] {
    return this.engine.grid.towerSites;
  }

  isTowerSiteOccupied(siteId: number): boolean {
    return this.engine.isTowerSiteOccupied(siteId);
  }

  getPendingConstruction(playerId: 0 | 1): { towerType: TowerType; progress: number; remainingMs: number } | null {
    return this.engine.getPendingConstruction(playerId);
  }

  getTowers(playerId: 0 | 1): ReadonlyArray<LaserTowerParticle | WeaknessTowerParticle> {
    return this.engine.towers[playerId];
  }

  update(_time: number, delta: number): void {
    const spedDelta = delta * this.debugSpeedMultiplier;
    this.engine.tick(spedDelta);
    const territoryCellCounts: [number, number] = [
      this.engine.cellEffects.getOwnedCellCount(0),
      this.engine.cellEffects.getOwnedCellCount(1),
    ];
    this.statsRecorder.tick(spedDelta, this.engine.particles, this.engine.players, territoryCellCounts);
    this.renderCellEffects();
    this.renderTowerSites();
    this.renderTowerEffects();
    this.updateKbTowerTooltips();
  }

  private attachVisuals(p: IParticle): void {
    const isLaserTower = p.typeName === LaserTowerParticle.TYPE_NAME;
    const isWeaknessTower = p.typeName === WeaknessTowerParticle.TYPE_NAME;
    const isTower = isLaserTower || isWeaknessTower;
    const isCarrier = p.typeName === TowerCarrierParticle.TYPE_NAME;
    const isSpawner = p.typeName === ParticleSpawnerTower.TYPE_NAME;

    let textureKey: string;
    const T = GameScene.TEXTURES;
    if (isSpawner) {
      textureKey = p.owner === 0 ? T.SPAWNER_P1 : T.SPAWNER_P2;
    } else if (isTower || isCarrier) {
      const towerType = isTower
        ? (isLaserTower ? TOWER_TYPE.LASER : TOWER_TYPE.WEAKNESS)
        : (p as unknown as { towerType: TowerType }).towerType;
      textureKey = towerType === TOWER_TYPE.LASER ? T.LASER_TOWER : T.WEAKNESS_TOWER;
    } else {
      textureKey = p.owner === 0 ? T.PARTICLE_P1 : T.PARTICLE_P2;
    }

    const sprite = this.add.image(p.x, p.y, textureKey);
    const TOWER_IMG_SIZE = 1024;
    const scale = (isTower || isCarrier) ? (p.radius * 5) / TOWER_IMG_SIZE
                : isSpawner             ? (p.radius * 2.5) / 64
                : (p.radius * 2) / 64;
    sprite.setScale(scale);
    sprite.setDepth(isTower || isSpawner ? 6 : 5);
    sprite.setBlendMode(Phaser.BlendModes.ADD);
    p.sprite = sprite;

    if (isSpawner) {
      this.tweens.add({
        targets: sprite, alpha: { from: 0.5, to: 1 },
        duration: 800, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
    }

    if (isCarrier) {
      this.tweens.add({
        targets: sprite, alpha: { from: 0.3, to: 1 },
        duration: 400, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      });
    }

    if (!isTower) {
      const color = p.owner === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
      const trailEmitter = this.add.particles(0, 0, GameScene.TEXTURES.TRAIL_DOT, {
        follow: sprite,
        scale: { start: scale * 0.5, end: 0 },
        alpha: { start: 0.4, end: 0 },
        tint: color,
        blendMode: Phaser.BlendModes.ADD,
        lifespan: 300,
        frequency: 30,
        quantity: 1,
      });
      trailEmitter.setDepth(4);
      p.trail = trailEmitter;
    }
  }

  private createTowerTextures(): void {
    const T = GameScene.TEXTURES;
    if (!this.textures.exists(T.SPAWNER_P1)) this.createSpawnerTexture(T.SPAWNER_P1, CONFIG.PLAYER1_COLOR);
    if (!this.textures.exists(T.SPAWNER_P2)) this.createSpawnerTexture(T.SPAWNER_P2, CONFIG.PLAYER2_COLOR);
  }

  private createSpawnerTexture(key: string, color: number): void {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const cx = size / 2;
    const cy = size / 2;

    // Outer glow
    const gradient = ctx.createRadialGradient(cx, cy, 0, cx, cy, size / 2);
    gradient.addColorStop(0, `rgba(255, 255, 255, 1)`);
    gradient.addColorStop(0.18, `rgba(${r}, ${g}, ${b}, 1)`);
    gradient.addColorStop(0.45, `rgba(${r}, ${g}, ${b}, 0.45)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.arc(cx, cy, size / 2, 0, Math.PI * 2);
    ctx.fill();

    // Star rays
    ctx.save();
    ctx.translate(cx, cy);
    ctx.globalAlpha = 0.6;
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, 1)`;
    for (let i = 0; i < 6; i++) {
      ctx.save();
      ctx.rotate((i * Math.PI) / 3);
      ctx.fillRect(-1.5, -size * 0.42, 3, size * 0.22);
      ctx.restore();
    }
    ctx.restore();

    if (this.textures.exists(key)) this.textures.remove(key);
    this.textures.addCanvas(key, canvas);
  }

  private towerRangeGfx: Phaser.GameObjects.Graphics[] = [];
  private laserGfx!: Phaser.GameObjects.Graphics;

  private attachTowerVisuals(tower: IParticle): void {
    const color = tower.owner === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;

    const rangeGfx = this.add.graphics();
    rangeGfx.setDepth(3);
    this.towerRangeGfx.push(rangeGfx);

    const towerObj = tower as LaserTowerParticle | WeaknessTowerParticle;
    const range = towerObj.range;
    rangeGfx.fillStyle(color, 0.06);
    rangeGfx.fillCircle(tower.x, tower.y, range);
    rangeGfx.lineStyle(1, color, 0.25);
    rangeGfx.strokeCircle(tower.x, tower.y, range);

    (tower as { _rangeGfx?: Phaser.GameObjects.Graphics })._rangeGfx = rangeGfx;
  }

  private renderTowerEffects(): void {
    if (!this.laserGfx) {
      this.laserGfx = this.add.graphics();
      this.laserGfx.setDepth(7);
    }
    this.laserGfx.clear();

    const sel = this.towerSelectionForRender;
    const pulse = 0.6 + 0.4 * Math.sin(this.engine.gameTimeMs * 0.005);

    for (let pid = 0; pid < 2; pid++) {
      const towers = this.engine.towers[pid as 0 | 1];
      const color = pid === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
      const isSelected = sel[pid].active && sel[pid].selectedIndex >= 0 && sel[pid].selectedIndex < towers.length;

      for (let ti = 0; ti < towers.length; ti++) {
        const tower = towers[ti];
        if (!tower.alive) continue;

        const towerAny = tower as unknown as { _rangeGfx?: Phaser.GameObjects.Graphics };
        if (towerAny._rangeGfx) {
          towerAny._rangeGfx.clear();
          const rangeBonus = this.engine.players[tower.owner].getPathLevel('tower_range') * CONFIG.TOWER_RANGE_BONUS_PER_LEVEL;
          const effectiveRange = tower.range + rangeBonus;
          if (tower.towerType === TOWER_TYPE.LASER) {
            towerAny._rangeGfx.fillStyle(color, 0.04);
            towerAny._rangeGfx.fillCircle(tower.x, tower.y, effectiveRange);
            towerAny._rangeGfx.lineStyle(1, color, 0.2);
            towerAny._rangeGfx.strokeCircle(tower.x, tower.y, effectiveRange);
          } else {
            towerAny._rangeGfx.fillStyle(color, 0.1);
            towerAny._rangeGfx.fillCircle(tower.x, tower.y, effectiveRange);
            towerAny._rangeGfx.lineStyle(2, color, 0.35);
            towerAny._rangeGfx.strokeCircle(tower.x, tower.y, effectiveRange);
          }
        }

        if (tower.towerType === TOWER_TYPE.LASER) {
          const laser = tower as LaserTowerParticle;
          if (laser.currentTargetId >= 0) {
            const target = this.engine.particles.find(p => p.alive && p.id === laser.currentTargetId);
            if (target) {
              this.laserGfx.lineStyle(2, color, 0.8);
              this.laserGfx.lineBetween(tower.x, tower.y, target.x, target.y);
              this.laserGfx.fillStyle(0xffffff, 0.9);
              this.laserGfx.fillCircle(target.x, target.y, 3);
            }
          }
        }

        if (tower.health < tower.maxHealth) {
          const barW = 20;
          const barH = 3;
          const bx = tower.x - barW / 2;
          const by = tower.y - tower.radius - 6;
          const hpFrac = Math.max(0, tower.health / tower.maxHealth);
          this.laserGfx.fillStyle(0x333333, 0.7);
          this.laserGfx.fillRect(bx, by, barW, barH);
          this.laserGfx.fillStyle(color, 0.9);
          this.laserGfx.fillRect(bx, by, barW * hpFrac, barH);
        }

        if (isSelected && ti === sel[pid].selectedIndex) {
          this.laserGfx.lineStyle(4, color, pulse);
          this.laserGfx.strokeCircle(tower.x, tower.y, tower.radius + 8);
        }
      }
    }
  }

  private spawnExplosion(x: number, y: number, color: number): void {
    const emitter = this.add.particles(x, y, GameScene.TEXTURES.EXPLOSION_DOT, {
      speed: { min: 30, max: 80 },
      scale: { start: 0.8, end: 0 },
      alpha: { start: 1, end: 0 },
      tint: color,
      blendMode: Phaser.BlendModes.ADD,
      lifespan: 400,
      quantity: 8,
      emitting: false,
    });
    emitter.setDepth(6);
    emitter.explode(8);
    this.time.delayedCall(500, () => emitter.destroy());
  }

  private renderMaze(): void {
    const grid = this.engine.grid;
    const cellW = grid.cellW;
    const cellH = grid.cellH;
    const gfx = this.add.graphics();

    gfx.fillStyle(CONFIG.FLOOR_COLOR, 1);
    gfx.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);

    const wallColor = CONFIG.WALL_COLOR;
    const wallR = (wallColor >> 16) & 0xff;
    const wallG = (wallColor >> 8) & 0xff;
    const wallB = wallColor & 0xff;

    for (let y = 0; y < grid.rows; y++) {
      for (let x = 0; x < grid.cols; x++) {
        if (!grid.cells[y][x]) {
          const brightness = 0.5 + Math.random() * 0.2;
          const r = Math.floor(wallR * brightness);
          const g = Math.floor(wallG * brightness);
          const b = Math.floor(wallB * brightness);
          const color = (r << 16) | (g << 8) | b;
          gfx.fillStyle(color, 1);
          gfx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
        }
      }
    }

    gfx.setDepth(0);
  }

  private renderBases(): void {
    const grid = this.engine.grid;
    const baseW = grid.baseWidthCells * grid.cellW;

    const base1 = this.add.graphics();
    base1.fillStyle(CONFIG.PLAYER1_COLOR, 0.08);
    base1.fillRect(0, 0, baseW, CONFIG.GAME_HEIGHT);
    base1.lineStyle(4, CONFIG.PLAYER1_COLOR, 0.6);
    base1.strokeRect(0, 0, baseW, CONFIG.GAME_HEIGHT);
    base1.setDepth(1);

    const base2 = this.add.graphics();
    base2.fillStyle(CONFIG.PLAYER2_COLOR, 0.08);
    base2.fillRect(CONFIG.GAME_WIDTH - baseW, 0, baseW, CONFIG.GAME_HEIGHT);
    base2.lineStyle(4, CONFIG.PLAYER2_COLOR, 0.6);
    base2.strokeRect(CONFIG.GAME_WIDTH - baseW, 0, baseW, CONFIG.GAME_HEIGHT);
    base2.setDepth(1);

    this.add.text(baseW / 2, CONFIG.GAME_HEIGHT / 2 - 96, 'P1\nBASE', {
      fontSize: '28px',
      color: CONFIG.PLAYER1_COLOR_STR,
      align: 'center',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(2);

    const p2Label = this.mode === GAME_MODE.AI ? 'AI\nBASE' : 'P2\nBASE';
    this.add.text(CONFIG.GAME_WIDTH - baseW / 2, CONFIG.GAME_HEIGHT / 2 - 96, p2Label, {
      fontSize: '28px',
      color: CONFIG.PLAYER2_COLOR_STR,
      align: 'center',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(2);
  }

  private createParticleTextures(): void {
    if (!this.glowTextureP1Created) {
      this.createGlowTexture(GameScene.TEXTURES.PARTICLE_P1, CONFIG.PLAYER1_COLOR);
      this.glowTextureP1Created = true;
    }
    if (!this.glowTextureP2Created) {
      this.createGlowTexture(GameScene.TEXTURES.PARTICLE_P2, CONFIG.PLAYER2_COLOR);
      this.glowTextureP2Created = true;
    }
    if (!this.textures.exists(GameScene.TEXTURES.TRAIL_DOT)) {
      const gfx = this.make.graphics({ x: 0, y: 0 });
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(8, 8, 8);
      gfx.generateTexture(GameScene.TEXTURES.TRAIL_DOT, 16, 16);
      gfx.destroy();
    }
    if (!this.textures.exists(GameScene.TEXTURES.EXPLOSION_DOT)) {
      const gfx = this.make.graphics({ x: 0, y: 0 });
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(6, 6, 6);
      gfx.generateTexture(GameScene.TEXTURES.EXPLOSION_DOT, 12, 12);
      gfx.destroy();
    }
  }

  private createGlowTexture(key: string, color: number): void {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d')!;

    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;

    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, `rgba(255, 255, 255, 1)`);
    gradient.addColorStop(0.2, `rgba(${r}, ${g}, ${b}, 0.9)`);
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 0.4)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);

    if (this.textures.exists(key)) {
      this.textures.remove(key);
    }
    this.textures.addCanvas(key, canvas);
  }

  private renderCellEffects(): void {
    this.effectsGfx.clear();
    const grid = this.engine.grid;
    const cellW = grid.cellW;
    const cellH = grid.cellH;
    const gameTimeMs = this.engine.gameTimeMs;

    if (this.engine.cellEffects.hasAnyEffects) {
      this.engine.cellEffects.forEach((col, row, effects) => {
        const x = col * cellW;
        const y = row * cellH;
        for (const effect of effects) {
          this.renderSingleEffect(effect, x, y, cellW, cellH, gameTimeMs);
        }
      });
    }

    if (this.engine.cellEffects.hasAnyOwnedCells) {
      this.engine.cellEffects.forEachOwnedCell((col, row, owner, hasCaptureFlash) => {
        const x = col * cellW;
        const y = row * cellH;
        const color = owner === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
        const alpha = hasCaptureFlash ? CONFIG.OWNERSHIP_CAPTURE_FLASH_ALPHA : CONFIG.OWNERSHIP_EFFECT_ALPHA;
        this.effectsGfx.fillStyle(color, alpha);
        this.effectsGfx.fillRect(x, y, cellW, cellH);
      });
    }
  }

  private renderTowerSites(): void {
    this.towerSiteGfx.clear();
    const grid = this.engine.grid;
    const selectedSiteIds = new Set<number>();
    for (const selection of this.towerSelectionForRender) {
      if (selection.selectedBuildSiteId !== undefined) selectedSiteIds.add(selection.selectedBuildSiteId);
    }

    for (const site of grid.towerSites) {
      const occupied = this.engine.isTowerSiteOccupied(site.id);
      if (occupied) continue;

      const centerX = (site.col + 0.5) * grid.cellW;
      const centerY = (site.row + 0.5) * grid.cellH;
      const size = Math.min(grid.cellW, grid.cellH) * 0.72;
      const half = size / 2;
      const selected = selectedSiteIds.has(site.id);

      this.towerSiteGfx.lineStyle(selected ? 4 : 2, selected ? 0xffffff : 0xffdd66, selected ? 0.95 : 0.65);
      this.towerSiteGfx.strokeRect(centerX - half, centerY - half, size, size);
      this.towerSiteGfx.lineStyle(2, 0xffdd66, 0.5);
      this.towerSiteGfx.lineBetween(centerX - half * 0.6, centerY, centerX + half * 0.6, centerY);
      this.towerSiteGfx.lineBetween(centerX, centerY - half * 0.6, centerX, centerY + half * 0.6);

      this.towerSiteGfx.fillStyle(selected ? 0xffffff : 0xffdd66, selected ? 0.14 : 0.08);
      this.towerSiteGfx.fillRect(centerX - half, centerY - half, size, size);
    }
  }

  private createTowerSiteZones(): void {
    const grid = this.engine.grid;
    for (const site of grid.towerSites) {
      const centerX = (site.col + 0.5) * grid.cellW;
      const centerY = (site.row + 0.5) * grid.cellH;
      const size = Math.min(grid.cellW, grid.cellH) * 0.72;
      const zone = this.add.zone(centerX, centerY, size, size).setInteractive();
      zone.on('pointerover', () => this.showTowerSiteTooltip(centerX, centerY, site.id));
      zone.on('pointerout', () => this.hideTowerSiteTooltip());
      this.towerSiteZones.push(zone);
    }
  }

  private showTowerSiteTooltip(x: number, y: number, siteId: number): void {
    this.hideTowerSiteTooltip();
    const text = this.buildTowerSiteTooltipText(siteId);
    const pad = CONFIG.UI_GAP * 2;
    this.towerSiteTooltip = this.add.text(x, y - CONFIG.UI_GAP, text, {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`,
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#000000',
      padding: { x: 6, y: 4 },
    }).setOrigin(0.5, 1).setDepth(200);
    const bounds = this.towerSiteTooltip.getBounds();
    if (bounds.left < pad) {
      this.towerSiteTooltip.setX(pad + bounds.width / 2);
    } else if (bounds.right > CONFIG.GAME_WIDTH - pad) {
      this.towerSiteTooltip.setX(CONFIG.GAME_WIDTH - pad - bounds.width / 2);
    }
  }

  private buildTowerTooltipText(
    tower: LaserTowerParticle | WeaknessTowerParticle,
    playerId: 0 | 1,
  ): string {
    const label = playerId === 0 ? '[P1]' : '[P2]';
    const hp = `HP: ${Math.ceil(tower.health)}/${tower.maxHealth}`;
    const cost = getTowerUpgradeCost(tower.towerType, tower.level);
    const canAfford = this.engine.players[playerId].gold >= cost;
    const costStr = `Upgrade: $${cost}${canAfford ? '' : ' (need gold)'}`;
    let statsLine: string;
    if (tower.towerType === TOWER_TYPE.LASER) {
      const t = tower as LaserTowerParticle;
      const nxt = getLaserStatsAtLevel(t.level + 1);
      statsLine = `DMG:${t.damage}->${nxt.damage}  SPD:${t.attackSpeed.toFixed(1)}->${nxt.attackSpeed.toFixed(1)}`;
    } else {
      const t = tower as WeaknessTowerParticle;
      const nxt = getWeaknessStatsAtLevel(t.level + 1);
      statsLine = `DRN:${t.drainDps.toFixed(1)}->${nxt.drainDps.toFixed(1)}  ATK-:${Math.round(t.attackReduction * 100)}%->${Math.round(nxt.attackReduction * 100)}%`;
    }
    return `${tower.towerType.toUpperCase()} Lv${tower.level} ${label}\nKills: ${tower.kills}\n${hp}\n${statsLine}\n${costStr}`;
  }

  private buildTowerSiteTooltipText(siteId: number): string {
    const site = this.engine.grid.towerSites.find(s => s.id === siteId);
    if (site) {
      for (const playerId of [0, 1] as const) {
        const tower = this.engine.towers[playerId].find(t =>
          t.alive &&
          Math.floor(t.x / this.engine.grid.cellW) === site.col &&
          Math.floor(t.y / this.engine.grid.cellH) === site.row,
        );
        if (tower) {
          return this.buildTowerTooltipText(tower as LaserTowerParticle | WeaknessTowerParticle, playerId);
        }
      }
    }
    if (this.engine.isTowerSiteOccupied(siteId)) {
      return 'Tower Slot\nUnder construction…';
    }
    return 'Tower Slot\nResearch, then BUILD > TOWERS\nOwn adjacent cells to unlock';
  }

  private updateKbTowerTooltips(): void {
    for (const pid of [0, 1] as const) {
      const sel = this.towerSelectionForRender[pid];
      const towers = this.engine.towers[pid];
      const tower = (sel.active && sel.selectedIndex >= 0 && sel.selectedIndex < towers.length && towers[sel.selectedIndex].alive)
        ? towers[sel.selectedIndex] as LaserTowerParticle | WeaknessTowerParticle
        : null;

      const changed = tower !== this.kbSelectedTower[pid] ||
        (tower !== null && tower.kills !== this.kbSelectedKills[pid]);
      if (changed) {
        if (tower) {
          this.showKbTowerTooltip(tower, pid);
        } else {
          this.hideKbTowerTooltip(pid);
        }
        this.kbSelectedTower[pid] = tower;
        this.kbSelectedKills[pid] = tower?.kills ?? 0;
      }
    }
  }

  private showKbTowerTooltip(tower: LaserTowerParticle | WeaknessTowerParticle, pid: 0 | 1): void {
    this.hideKbTowerTooltip(pid);
    const text = this.buildTowerTooltipText(tower, pid);
    const pad = CONFIG.UI_GAP * 2;
    const tooltip = this.add.text(tower.x, tower.y - tower.radius - CONFIG.UI_GAP * 2, text, {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`,
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#000000',
      padding: { x: 6, y: 4 },
    }).setOrigin(0.5, 1).setDepth(200);
    const bounds = tooltip.getBounds();
    if (bounds.left < pad) tooltip.setX(pad + bounds.width / 2);
    else if (bounds.right > CONFIG.GAME_WIDTH - pad) tooltip.setX(CONFIG.GAME_WIDTH - pad - bounds.width / 2);
    this.kbTowerTooltips[pid] = tooltip;
  }

  private hideKbTowerTooltip(pid: 0 | 1): void {
    this.kbTowerTooltips[pid]?.destroy();
    this.kbTowerTooltips[pid] = null;
  }

  private hideTowerSiteTooltip(): void {
    if (this.towerSiteTooltip) {
      this.towerSiteTooltip.destroy();
      this.towerSiteTooltip = null;
    }
  }

  private renderSingleEffect(
    effect: CellEffect, x: number, y: number,
    cellW: number, cellH: number, gameTimeMs: number,
  ): void {
    const color = this.ownerColor(effect.owner);

    switch (effect.type) {
      case 'slow': {
        this.effectsGfx.fillStyle(color, CONFIG.SLOW_EFFECT_ALPHA);
        this.effectsGfx.fillRect(x, y, cellW, cellH);
        const lineAlpha = CONFIG.SLOW_EFFECT_ALPHA * 1.5;
        this.effectsGfx.lineStyle(1, color, lineAlpha);
        for (let i = 0; i < cellW + cellH; i += 6) {
          const x1 = x + Math.min(i, cellW);
          const y1 = y + Math.max(0, i - cellW);
          const x2 = x + Math.max(0, i - cellH);
          const y2 = y + Math.min(i, cellH);
          this.effectsGfx.lineBetween(x1, y2, x2, y1);
        }
        break;
      }
      case 'damage': {
        const pulse = 0.5 + 0.5 * Math.sin(gameTimeMs * 0.006);
        const alpha = CONFIG.DAMAGE_EFFECT_ALPHA * (0.6 + 0.4 * pulse);
        this.effectsGfx.fillStyle(color, alpha);
        this.effectsGfx.fillRect(x, y, cellW, cellH);
        break;
      }
      case 'tempWallTime': {
        const timeFrac = Math.max(0, effect.remainingMs / effect.totalMs);
        const alpha = CONFIG.TEMP_WALL_ALPHA * timeFrac;
        this.effectsGfx.fillStyle(color, alpha);
        this.effectsGfx.fillRect(x, y, cellW, cellH);
        this.effectsGfx.lineStyle(1, color, Math.min(alpha + 0.2, 1));
        this.effectsGfx.strokeRect(x, y, cellW, cellH);
        const barWidth = cellW * timeFrac;
        this.effectsGfx.fillStyle(0xffffff, 0.5);
        this.effectsGfx.fillRect(x, y + cellH - CONFIG.TEMP_WALL_HP_BAR_HEIGHT, barWidth, CONFIG.TEMP_WALL_HP_BAR_HEIGHT);
        break;
      }
      case 'tempWallHP': {
        this.effectsGfx.fillStyle(color, CONFIG.TEMP_WALL_ALPHA);
        this.effectsGfx.fillRect(x, y, cellW, cellH);
        this.effectsGfx.lineStyle(1, color, CONFIG.TEMP_WALL_ALPHA + 0.2);
        this.effectsGfx.strokeRect(x, y, cellW, cellH);
        const hpFrac = Math.max(0, effect.hp / effect.maxHp);
        this.effectsGfx.fillStyle(0x333333, 0.7);
        this.effectsGfx.fillRect(x, y + cellH - CONFIG.TEMP_WALL_HP_BAR_HEIGHT, cellW, CONFIG.TEMP_WALL_HP_BAR_HEIGHT);
        this.effectsGfx.fillStyle(color, 0.9);
        this.effectsGfx.fillRect(x, y + cellH - CONFIG.TEMP_WALL_HP_BAR_HEIGHT, cellW * hpFrac, CONFIG.TEMP_WALL_HP_BAR_HEIGHT);
        break;
      }
    }
  }

  private ownerColor(owner: 0 | 1): number {
    return owner === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
  }

  private showGameOver(winner: number): void {
    const matchStats = this.statsRecorder.finalize(winner as 0 | 1);
    const winnerColor = winner === 0 ? CONFIG.PLAYER1_COLOR_STR : CONFIG.PLAYER2_COLOR_STR;
    const winnerLabel = winner === 1 && this.mode === GAME_MODE.AI ? 'AI WINS!' : `PLAYER ${winner + 1} WINS!`;
    const overlay = this.add.rectangle(
      CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2,
      CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT,
      0x000000, 0.7
    );
    overlay.setDepth(100);

    const text = this.add.text(
      CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 - 60,
      winnerLabel,
      {
        fontSize: '96px',
        color: winnerColor,
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }
    ).setOrigin(0.5).setDepth(101);

    const restart = this.add.text(
      CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2 + 60,
      'Click to view match stats',
      {
        fontSize: '40px',
        color: '#ffffff',
        fontFamily: 'monospace',
      }
    ).setOrigin(0.5).setDepth(101).setAlpha(0);

    this.tweens.add({
      targets: text,
      scale: { from: 0.5, to: 1 },
      alpha: { from: 0, to: 1 },
      duration: 500,
      ease: 'Back.easeOut',
    });

    this.tweens.add({
      targets: restart,
      alpha: { from: 0, to: 1 },
      duration: 500,
      delay: 800,
    });

    this.cameras.main.shake(500, 0.01);

    this.time.delayedCall(1000, () => {
      this.input.once('pointerdown', () => {
        this.scene.stop(SCENE_KEYS.UI);
        this.scene.start(SCENE_KEYS.POST_GAME_STATS, { stats: matchStats, mode: this.mode });
      });
    });
  }
}
