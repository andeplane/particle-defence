import Phaser from 'phaser';
import { AIController } from '../ai';
import { CONFIG, type UpgradeType } from '../config';
import { generateGrid, type GridType } from '../grid';
import type { IParticle } from '../particles';
import { GameEngine, type GameEngineCallbacks } from '../GameEngine';
import type { GameMode } from './MenuScene';
import type { IGameViewModel } from './UIScene';

export class GameScene extends Phaser.Scene implements IGameViewModel {
  engine!: GameEngine;
  mode: GameMode = 'pvp';

  private glowTextureP1Created = false;
  private glowTextureP2Created = false;

  get players() { return this.engine.players; }
  get particles() { return this.engine.particles; }
  get gameOver() { return this.engine.gameOver; }
  get gameTimeMs() { return this.engine.gameTimeMs; }

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { mode?: GameMode; gridType?: GridType }): void {
    this.mode = data.mode ?? 'pvp';
    const gridType = data.gridType ?? 'random';
    const grid = generateGrid(gridType);

    const callbacks: GameEngineCallbacks = {
      onKill: (_killer, victim) => {
        const victimColor = victim.owner === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
        this.spawnExplosion(victim.x, victim.y, victimColor);
      },
      onBaseDamage: (playerId, _damage, px, py) => {
        const baseColor = playerId === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
        this.spawnExplosion(px, py, baseColor);
        this.cameras.main.shake(100, 0.003);
      },
      onParticleSpawned: (p) => this.attachVisuals(p),
      onNuke: () => this.cameras.main.shake(300, 0.008),
      onGameOver: (winner) => this.showGameOver(winner),
      onStuckRespawn: () => {},
      spawnExplosion: (x, y, color) => this.spawnExplosion(x, y, color),
    };

    this.engine = new GameEngine(grid, callbacks, {
      createAIController: this.mode === 'ai' ? () => new AIController() : null,
    });
  }

  create(): void {
    this.engine.init(this.mode === 'ai');

    this.renderMaze();
    this.renderBases();
    this.createParticleTextures();

    this.scene.launch('UIScene', { viewModel: this as IGameViewModel, mode: this.mode });
  }

  getParticleCount(owner: 0 | 1): number {
    return this.engine.particles.filter(p => p.alive && p.owner === owner).length;
  }

  purchaseUpgrade(playerId: 0 | 1, type: UpgradeType): boolean {
    if (this.engine.gameOver) return false;
    return this.engine.players[playerId].buyUpgrade(type);
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

  update(_time: number, delta: number): void {
    this.engine.tick(delta);
  }

  private attachVisuals(p: IParticle): void {
    const textureKey = p.owner === 0 ? 'particle_p1' : 'particle_p2';
    const sprite = this.add.image(p.x, p.y, textureKey);
    const scale = (p.radius * 2) / 64;
    sprite.setScale(scale);
    sprite.setDepth(5);
    sprite.setBlendMode(Phaser.BlendModes.ADD);
    p.sprite = sprite;

    const color = p.owner === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
    const trailEmitter = this.add.particles(0, 0, 'trail_dot', {
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

  private spawnExplosion(x: number, y: number, color: number): void {
    const emitter = this.add.particles(x, y, 'explosion_dot', {
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

    this.add.text(baseW / 2, CONFIG.GAME_HEIGHT / 2, 'P1\nBASE', {
      fontSize: '28px',
      color: CONFIG.PLAYER1_COLOR_STR,
      align: 'center',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(2);

    const p2Label = this.mode === 'ai' ? 'AI\nBASE' : 'P2\nBASE';
    this.add.text(CONFIG.GAME_WIDTH - baseW / 2, CONFIG.GAME_HEIGHT / 2, p2Label, {
      fontSize: '28px',
      color: CONFIG.PLAYER2_COLOR_STR,
      align: 'center',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setAlpha(0.5).setDepth(2);
  }

  private createParticleTextures(): void {
    if (!this.glowTextureP1Created) {
      this.createGlowTexture('particle_p1', CONFIG.PLAYER1_COLOR);
      this.glowTextureP1Created = true;
    }
    if (!this.glowTextureP2Created) {
      this.createGlowTexture('particle_p2', CONFIG.PLAYER2_COLOR);
      this.glowTextureP2Created = true;
    }
    if (!this.textures.exists('trail_dot')) {
      const gfx = this.make.graphics({ x: 0, y: 0 });
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(8, 8, 8);
      gfx.generateTexture('trail_dot', 16, 16);
      gfx.destroy();
    }
    if (!this.textures.exists('explosion_dot')) {
      const gfx = this.make.graphics({ x: 0, y: 0 });
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(6, 6, 6);
      gfx.generateTexture('explosion_dot', 12, 12);
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

  private showGameOver(winner: number): void {
    const winnerColor = winner === 0 ? CONFIG.PLAYER1_COLOR_STR : CONFIG.PLAYER2_COLOR_STR;
    const winnerLabel = winner === 1 && this.mode === 'ai' ? 'AI WINS!' : `PLAYER ${winner + 1} WINS!`;
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
      'Click to return to menu',
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
        this.scene.stop('UIScene');
        this.scene.start('MenuScene');
      });
    });
  }
}
