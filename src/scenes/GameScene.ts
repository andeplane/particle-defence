import Phaser from 'phaser';
import { AIController } from '../ai';
import { CONFIG } from '../config';
import { generateGrid, type Grid, type GridType } from '../grid';
import { BasicParticle, type AbstractParticle, type GameContext } from '../particles';
import { Player } from '../player';
import { SpatialHash } from '../spatial-hash';
import { resolveCollisions } from '../collision';
import type { GameMode } from './MenuScene';

export class GameScene extends Phaser.Scene {
  players!: [Player, Player];
  particles: AbstractParticle[] = [];
  spatialHash!: SpatialHash;
  grid!: Grid;
  spawnTimers: number[] = [0, 0];
  gameOver: boolean = false;
  winner: number = -1;
  gameTimeMs: number = 0;
  mode: GameMode = 'pvp';
  private aiController: AIController | null = null;

  // Glow textures
  private glowTextureP1Created = false;
  private glowTextureP2Created = false;

  constructor() {
    super({ key: 'GameScene' });
  }

  init(data: { mode?: GameMode; gridType?: GridType }): void {
    this.mode = data.mode ?? 'pvp';
    const gridType = data.gridType ?? 'random';
    this.grid = generateGrid(gridType);
  }

  create(): void {
    this.players = [new Player(0), new Player(1)];
    this.spatialHash = new SpatialHash();
    this.particles = [];
    this.gameOver = false;
    this.winner = -1;
    this.spawnTimers = [0, 0];
    this.gameTimeMs = 0;

    this.renderMaze();
    this.renderBases();
    this.createParticleTextures();

    if (this.mode === 'ai') {
      this.aiController = new AIController();
    } else {
      this.aiController = null;
    }

    this.scene.launch('UIScene', { gameScene: this, mode: this.mode });
  }

  private renderMaze(): void {
    const { cellW, cellH } = { cellW: this.grid.cellW, cellH: this.grid.cellH };
    const gfx = this.add.graphics();

    // Floor
    gfx.fillStyle(CONFIG.FLOOR_COLOR, 1);
    gfx.fillRect(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);

    // Walls
    for (let y = 0; y < this.grid.rows; y++) {
      for (let x = 0; x < this.grid.cols; x++) {
        if (!this.grid.cells[y][x]) {
          const brightness = 0.3 + Math.random() * 0.15;
          const r = Math.floor(0x1a * brightness * 3);
          const g = Math.floor(0x1a * brightness * 3);
          const b = Math.floor(0x2e * brightness * 3);
          const color = (r << 16) | (g << 8) | b;
          gfx.fillStyle(color, 1);
          gfx.fillRect(x * cellW, y * cellH, cellW + 0.5, cellH + 0.5);
        }
      }
    }

    gfx.setDepth(0);
  }

  private renderBases(): void {
    const baseW = this.grid.baseWidthCells * this.grid.cellW;

    // Player 1 base (left) - cyan glow
    const base1 = this.add.graphics();
    base1.fillStyle(CONFIG.PLAYER1_COLOR, 0.08);
    base1.fillRect(0, 0, baseW, CONFIG.GAME_HEIGHT);
    base1.lineStyle(4, CONFIG.PLAYER1_COLOR, 0.6);
    base1.strokeRect(0, 0, baseW, CONFIG.GAME_HEIGHT);
    base1.setDepth(1);

    // Player 2 base (right) - red glow
    const base2 = this.add.graphics();
    base2.fillStyle(CONFIG.PLAYER2_COLOR, 0.08);
    base2.fillRect(CONFIG.GAME_WIDTH - baseW, 0, baseW, CONFIG.GAME_HEIGHT);
    base2.lineStyle(4, CONFIG.PLAYER2_COLOR, 0.6);
    base2.strokeRect(CONFIG.GAME_WIDTH - baseW, 0, baseW, CONFIG.GAME_HEIGHT);
    base2.setDepth(1);

    // Base labels
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
    // Small white dot for trail particles
    if (!this.textures.exists('trail_dot')) {
      const gfx = this.make.graphics({ x: 0, y: 0 });
      gfx.fillStyle(0xffffff, 1);
      gfx.fillCircle(8, 8, 8);
      gfx.generateTexture('trail_dot', 16, 16);
      gfx.destroy();
    }
    // Explosion texture
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

  spawnParticle(owner: 0 | 1): void {
    const player = this.players[owner];
    const count = this.particles.filter(p => p.alive && p.owner === owner).length;
    const totalAlive = this.particles.filter(p => p.alive).length;
    if (count >= CONFIG.MAX_PARTICLES_PER_PLAYER || totalAlive >= CONFIG.MAX_PARTICLES_TOTAL) return;

    const baseW = this.grid.baseWidthCells * this.grid.cellW;
    // Spawn inside base area (always walkable) or retry until we find a non-wall position
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
    // Fallback: center of base (always walkable)
    if (this.grid.isWall(x, y)) {
      x = owner === 0 ? baseW / 2 : CONFIG.GAME_WIDTH - baseW / 2;
      y = CONFIG.GAME_HEIGHT / 2;
    }

    const p = new BasicParticle(
      x, y, owner,
      player.particleHealth,
      player.particleAttack,
      player.particleRadius,
      player.particleSpeed
    );

    // Create visual sprite using glow texture
    const textureKey = owner === 0 ? 'particle_p1' : 'particle_p2';
    const sprite = this.add.image(p.x, p.y, textureKey);
    const scale = (p.radius * 2) / 64;
    sprite.setScale(scale);
    sprite.setDepth(5);
    sprite.setBlendMode(Phaser.BlendModes.ADD);

    p.sprite = sprite;

    // Trail emitter
    const color = owner === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
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

    this.particles.push(p);
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

  launchNuke(playerId: 0 | 1): boolean {
    if (this.gameOver) return false;
    const player = this.players[playerId];
    if (!player.canUseNuke(this.gameTimeMs)) return false;

    const enemyId = playerId === 0 ? 1 : 0;
    const enemyColor = enemyId === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;

    let killCount = 0;
    for (const p of this.particles) {
      if (!p.alive) continue;
      if (p.owner === enemyId) {
        this.spawnExplosion(p.x, p.y, enemyColor);
        p.destroy();
        killCount++;
      }
    }

    const reward = Math.floor(killCount * CONFIG.KILL_REWARD * CONFIG.NUCLEAR_KILL_REWARD_FRACTION);
    player.gold += reward;

    player.useNuke(this.gameTimeMs);
    this.cameras.main.shake(300, 0.008);
    return true;
  }

  update(_time: number, delta: number): void {
    if (this.gameOver) return;

    this.gameTimeMs += delta;

    if (this.aiController) {
      this.aiController.update(delta, this);
    }
    const dt = delta / 1000;

    // Spawn particles
    for (let i = 0; i < 2; i++) {
      this.spawnTimers[i] += delta;
      if (this.spawnTimers[i] >= this.players[i].spawnInterval) {
        this.spawnTimers[i] = 0;
        this.spawnParticle(i as 0 | 1);
      }
    }

    const context: GameContext = {
      grid: this.grid,
      spatialHash: this.spatialHash,
      particles: this.particles,
      players: this.players,
      gameTimeMs: this.gameTimeMs,
      spawnExplosion: (x, y, color) => this.spawnExplosion(x, y, color),
    };

    // Update particles
    for (const p of this.particles) {
      if (p.alive) p.update(dt, context);
    }

    // Spatial hash + collisions
    this.spatialHash.clear();
    for (const p of this.particles) {
      if (p.alive) this.spatialHash.insert(p);
    }

    const collisionResult = resolveCollisions(context);

    // Explosion effects for kills
    for (const kill of collisionResult.kills) {
      const victimColor = kill.victim.owner === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
      this.spawnExplosion(kill.victim.x, kill.victim.y, victimColor);
    }

    // Check base damage
    for (const p of this.particles) {
      if (!p.alive) continue;

      const enemyId = p.owner === 0 ? 1 : 0;
      if (this.grid.isInBase(p.x, enemyId as 0 | 1)) {
        this.players[enemyId].takeDamage(p.getBaseDamage());
        const baseColor = enemyId === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
        this.spawnExplosion(p.x, p.y, baseColor);
        p.alive = false;
        p.destroy();

        // Camera shake on base hit
        this.cameras.main.shake(100, 0.003);
      }
    }

    // Respawn stuck particles (moved less than 10 blocks in 10 seconds)
    for (const p of this.particles) {
      if (!p.alive) continue;
      if (p.isStuck()) {
        const owner = p.owner;
        p.destroy();
        this.spawnParticle(owner);
      }
    }

    // Clean up dead particles
    this.particles = this.particles.filter(p => {
      if (!p.alive) {
        p.destroy();
        return false;
      }
      return true;
    });

    // Win condition
    for (let i = 0; i < 2; i++) {
      if (!this.players[i].isAlive) {
        this.gameOver = true;
        this.winner = i === 0 ? 1 : 0;
        this.showGameOver();
        break;
      }
    }
  }

  private showGameOver(): void {
    const winnerColor = this.winner === 0 ? CONFIG.PLAYER1_COLOR_STR : CONFIG.PLAYER2_COLOR_STR;
    const winnerLabel = this.winner === 1 && this.mode === 'ai' ? 'AI WINS!' : `PLAYER ${this.winner + 1} WINS!`;
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
