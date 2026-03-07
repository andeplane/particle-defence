import Phaser from 'phaser';
import { CONFIG, DEBUG_MODE, getTowerUpgradeCost, type UpgradeType, type TowerType } from '../config';
import type { IPlayer } from '../player';
import type { GameMode } from './MenuScene';
import { MENU_CATEGORIES, type MenuCategory, resolveKeyPress } from './menuConfig';
import { getLaserStats, getSlowStats } from '../particles/towers';
import type { LaserTowerParticle } from '../particles/LaserTowerParticle';
import type { SlowTowerParticle } from '../particles/SlowTowerParticle';

export interface IGameViewModel {
  readonly players: readonly [IPlayer, IPlayer];
  readonly mode: GameMode;
  readonly gameTimeMs: number;
  readonly gameOver: boolean;
  getParticleCount(owner: 0 | 1): number;
  purchaseUpgrade(playerId: 0 | 1, type: UpgradeType): boolean;
  launchNuke(playerId: 0 | 1): boolean;
  researchTower(playerId: 0 | 1, towerType: TowerType): boolean;
  constructTower(playerId: 0 | 1, towerType: TowerType): boolean;
  placeTower(playerId: 0 | 1): boolean;
  upgradeTower(playerId: 0 | 1, towerIndex: number): boolean;
  hasActiveCarrier(playerId: 0 | 1): boolean;
  getTowers(playerId: 0 | 1): ReadonlyArray<LaserTowerParticle | SlowTowerParticle>;
  debugSpeedMultiplier?: number;
  setDebugSpeedMultiplier?: (speed: number) => void;
}



interface UpgradeButton {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  keyText: Phaser.GameObjects.Text;
  type: UpgradeType;
  playerId: 0 | 1;
}

interface NukeButton {
  bg: Phaser.GameObjects.Rectangle;
  labelText: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
  keyText: Phaser.GameObjects.Text;
  playerId: 0 | 1;
}

interface CategoryButton {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  keyText: Phaser.GameObjects.Text;
  categoryId: MenuCategory;
  playerId: 0 | 1;
}

interface BackButton {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  keyText: Phaser.GameObjects.Text;
  playerId: 0 | 1;
}

export class UIScene extends Phaser.Scene {
  private viewModel!: IGameViewModel;

  private p1HPBar!: Phaser.GameObjects.Graphics;
  private p2HPBar!: Phaser.GameObjects.Graphics;
  private p1GoldText!: Phaser.GameObjects.Text;
  private p2GoldText!: Phaser.GameObjects.Text;
  private p1StatsText!: Phaser.GameObjects.Text;
  private p2StatsText!: Phaser.GameObjects.Text;
  private p1HPText!: Phaser.GameObjects.Text;
  private p2HPText!: Phaser.GameObjects.Text;
  private buttons: UpgradeButton[] = [];
  private nukeButtons: NukeButton[] = [];
  private categoryButtons: CategoryButton[] = [];
  private activeCategory: [MenuCategory | null, MenuCategory | null] = [null, null];
  private categoryTitle: [Phaser.GameObjects.Text | null, Phaser.GameObjects.Text | null] = [null, null];
  private backButtons: BackButton[] = [];
  private placeholderText: [Phaser.GameObjects.Text | null, Phaser.GameObjects.Text | null] = [null, null];
  private tooltipText: [Phaser.GameObjects.Text | null, Phaser.GameObjects.Text | null] = [null, null];
  private selectedTowerIndex: [number, number] = [0, 0];
  private researchButtons: { bg: Phaser.GameObjects.Rectangle; labelText: Phaser.GameObjects.Text; costText: Phaser.GameObjects.Text; keyText: Phaser.GameObjects.Text; towerType: TowerType; playerId: 0 | 1 }[] = [];
  private constructButtons: { bg: Phaser.GameObjects.Rectangle; labelText: Phaser.GameObjects.Text; costText: Phaser.GameObjects.Text; keyText: Phaser.GameObjects.Text; towerType: TowerType; playerId: 0 | 1 }[] = [];
  private placeButtons: NukeButton[] = [];
  private towerInfoText: [Phaser.GameObjects.Text | null, Phaser.GameObjects.Text | null] = [null, null];
  private popups: Phaser.GameObjects.Text[] = [];
  private debugMenuCollapsed: boolean = true;
  private debugMenuBg?: Phaser.GameObjects.Rectangle;
  private debugMenuToggle?: Phaser.GameObjects.Text;
  private debugSpeedText?: Phaser.GameObjects.Text;
  private debugSpeedSlider?: Phaser.GameObjects.Rectangle;
  private debugSpeedSliderFill?: Phaser.GameObjects.Rectangle;
  private debugSpeedSliderHandle?: Phaser.GameObjects.Rectangle;
  private speedButtons: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; speed: number }[] = [];

  constructor() {
    super({ key: 'UIScene' });
  }

  init(data: { viewModel?: IGameViewModel; gameScene?: IGameViewModel; mode?: GameMode }): void {
    this.viewModel = data.viewModel ?? data.gameScene!;
  }

  create(): void {
    this.createSpeedButtons();
    this.createHPBars();
    this.createGoldDisplay();
    this.createStatsDisplay();
    this.renderMenuForPlayer(0);
    if (this.viewModel.mode === 'pvp') {
      this.renderMenuForPlayer(1);
    }
    this.setupKeyboard();
    if (DEBUG_MODE) {
      this.createDebugMenu();
    }
  }

  private createSpeedButtons(): void {
    if (!this.viewModel.setDebugSpeedMultiplier || this.viewModel.debugSpeedMultiplier === undefined) return;

    const centerX = CONFIG.GAME_WIDTH / 2;
    const barY = CONFIG.UI_GAP * 2;
    const barH = CONFIG.UI_BAR_HEIGHT;
    const btnW = 56;
    const btnH = 28;
    const gap = CONFIG.UI_GAP;
    const speeds = [1, 2, 3];
    const totalW = speeds.length * btnW + (speeds.length - 1) * gap;
    let x = centerX - totalW / 2 + btnW / 2;
    const btnCenterY = barY + barH / 2;

    for (const speed of speeds) {
      const bg = this.add.rectangle(x, btnCenterY, btnW, btnH, 0x111122, 0.85)
        .setStrokeStyle(2, 0x666666, 0.6)
        .setInteractive({ useHandCursor: true });
      const label = this.add.text(x, btnCenterY, `${speed}x`, {
        fontSize: `${CONFIG.UI_FONT_SMALL}px`, color: '#aaaaaa', fontFamily: 'monospace',
      }).setOrigin(0.5);

      const setSpeed = () => {
        this.viewModel.setDebugSpeedMultiplier!(speed);
      };
      bg.on('pointerdown', setSpeed);
      bg.on('pointerover', () => {
        bg.setFillStyle(0x222244, 0.9);
        bg.setStrokeStyle(2, 0x888888, 0.8);
      });
      bg.on('pointerout', () => {
        const current = this.viewModel.debugSpeedMultiplier ?? 1;
        bg.setFillStyle(current === speed ? 0x222244 : 0x111122, current === speed ? 0.95 : 0.85);
        bg.setStrokeStyle(2, current === speed ? 0x00ddff : 0x666666, current === speed ? 0.9 : 0.6);
        label.setColor(current === speed ? '#00ddff' : '#aaaaaa');
      });

      this.speedButtons.push({ bg, label, speed });
      x += btnW + gap;
    }
  }

  private createHPBars(): void {
    const barW = CONFIG.UI_BAR_WIDTH;
    const barH = CONFIG.UI_BAR_HEIGHT;
    const y = CONFIG.UI_GAP * 2;

    this.p1HPBar = this.add.graphics();
    this.p1HPText = this.add.text(barW / 2 + CONFIG.UI_GAP * 2.5, y + barH / 2, '', {
      fontSize: `${CONFIG.UI_FONT_SMALL}px`, color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    this.p2HPBar = this.add.graphics();
    this.p2HPText = this.add.text(CONFIG.GAME_WIDTH - barW / 2 - CONFIG.UI_GAP * 2.5, y + barH / 2, '', {
      fontSize: `${CONFIG.UI_FONT_SMALL}px`, color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  private createGoldDisplay(): void {
    const y = CONFIG.UI_GAP * 2 + CONFIG.UI_BAR_HEIGHT + CONFIG.UI_GAP * 2;
    this.p1GoldText = this.add.text(CONFIG.UI_GAP * 2.5, y, '', {
      fontSize: `${CONFIG.UI_FONT_MED}px`, color: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold',
    });
    this.p2GoldText = this.add.text(CONFIG.GAME_WIDTH - CONFIG.UI_GAP * 2.5, y, '', {
      fontSize: `${CONFIG.UI_FONT_MED}px`, color: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(1, 0);
  }

  private createStatsDisplay(): void {
    const y = CONFIG.UI_GAP * 2 + CONFIG.UI_BAR_HEIGHT + CONFIG.UI_GAP * 2 + CONFIG.UI_FONT_MED + CONFIG.UI_GAP * 2;
    this.p1StatsText = this.add.text(CONFIG.UI_GAP * 2.5, y, '', {
      fontSize: `${CONFIG.UI_FONT_SMALL}px`, color: '#aaaaaa', fontFamily: 'monospace',
    });
    this.p2StatsText = this.add.text(CONFIG.GAME_WIDTH - CONFIG.UI_GAP * 2.5, y, '', {
      fontSize: `${CONFIG.UI_FONT_SMALL}px`, color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(1, 0);
  }

  // ── Menu rendering ─────────────────────────────────────────────────

  private showTooltip(text: string, btnX: number, btnY: number, playerId: 0 | 1): void {
    this.hideTooltip(playerId);
    const gap = CONFIG.UI_GAP;
    const pad = CONFIG.UI_GAP * 2;
    const y = btnY - gap;
    const tooltip = this.add.text(btnX, y, text, {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`,
      color: '#ffffff',
      fontFamily: 'monospace',
      backgroundColor: '#000000',
      padding: { x: 6, y: 4 },
    }).setOrigin(0.5, 1).setDepth(200);
    const bounds = tooltip.getBounds();
    if (bounds.left < pad) {
      tooltip.setX(pad + bounds.width / 2);
    } else if (bounds.right > CONFIG.GAME_WIDTH - pad) {
      tooltip.setX(CONFIG.GAME_WIDTH - pad - bounds.width / 2);
    }
    this.tooltipText[playerId] = tooltip;
  }

  private hideTooltip(playerId: 0 | 1): void {
    const t = this.tooltipText[playerId];
    if (t) {
      t.destroy();
      this.tooltipText[playerId] = null;
    }
  }

  private buildUpgradeTooltip(type: UpgradeType, player: IPlayer): string {
    const level = player.getUpgradeLevel(type);
    let current = '';
    let next = '';
    switch (type) {
      case 'health':
        current = `${CONFIG.PARTICLE_BASE_HEALTH + level} HP`;
        next = `Next: ${CONFIG.PARTICLE_BASE_HEALTH + level + 1} HP`;
        break;
      case 'attack':
        current = `${CONFIG.PARTICLE_BASE_ATTACK + level} ATK`;
        next = `Next: ${CONFIG.PARTICLE_BASE_ATTACK + level + 1} ATK`;
        break;
      case 'radius':
        current = `${CONFIG.PARTICLE_BASE_RADIUS + level}`;
        next = `Next: ${CONFIG.PARTICLE_BASE_RADIUS + level + 1}`;
        break;
      case 'spawnRate':
        current = `${player.spawnInterval}ms`;
        next = `Next: ${Math.max(CONFIG.MIN_SPAWN_INTERVAL, player.spawnInterval - CONFIG.SPAWN_RATE_REDUCTION_PER_LEVEL)}ms`;
        break;
      case 'speed':
        current = `${player.particleSpeed}`;
        next = `Next: ${player.particleSpeed + CONFIG.SPEED_PER_LEVEL}`;
        break;
      case 'maxParticles':
        current = `${player.maxParticles}`;
        next = `Next: ${player.maxParticles + CONFIG.MAX_PARTICLES_PER_LEVEL}`;
        break;
      case 'defense':
        current = `${Math.round(player.particleDefense * 100)}%`;
        next = `Next: ${Math.round(Math.min(CONFIG.OWNERSHIP_DEFENSE_MAX, player.particleDefense + CONFIG.OWNERSHIP_DEFENSE_PER_LEVEL) * 100)}%`;
        break;
      case 'interestRate':
        current = `${(player.goldInterestRate * 100).toFixed(2)}%`;
        next = `Next: ${(Math.min(CONFIG.MAX_INTEREST_RATE, player.goldInterestRate + CONFIG.INTEREST_RATE_PER_LEVEL) * 100).toFixed(2)}%`;
        break;
    }
    if (player.isUpgradeAtMax(type)) {
      next = 'MAX';
    }
    const item = MENU_CATEGORIES.flatMap(c => c.items).find(i => i.kind === 'upgrade' && i.type === type);
    const desc = item && item.kind === 'upgrade' ? item.tooltip : type;
    return `${desc}\nCurrent: ${current}\n${next}`;
  }

  private destroyPlayerPanel(playerId: 0 | 1): void {
    this.buttons = this.buttons.filter(btn => {
      if (btn.playerId !== playerId) return true;
      btn.bg.destroy(); btn.label.destroy(); btn.costText.destroy(); btn.keyText.destroy();
      return false;
    });
    this.nukeButtons = this.nukeButtons.filter(btn => {
      if (btn.playerId !== playerId) return true;
      btn.bg.destroy(); btn.labelText.destroy(); btn.statusText.destroy(); btn.keyText.destroy();
      return false;
    });
    this.categoryButtons = this.categoryButtons.filter(btn => {
      if (btn.playerId !== playerId) return true;
      btn.bg.destroy(); btn.label.destroy(); btn.keyText.destroy();
      return false;
    });
    this.researchButtons = this.researchButtons.filter(btn => {
      if (btn.playerId !== playerId) return true;
      btn.bg.destroy(); btn.labelText.destroy(); btn.costText.destroy(); btn.keyText.destroy();
      return false;
    });
    this.constructButtons = this.constructButtons.filter(btn => {
      if (btn.playerId !== playerId) return true;
      btn.bg.destroy(); btn.labelText.destroy(); btn.costText.destroy(); btn.keyText.destroy();
      return false;
    });
    this.placeButtons = this.placeButtons.filter(btn => {
      if (btn.playerId !== playerId) return true;
      btn.bg.destroy(); btn.labelText.destroy(); btn.statusText.destroy(); btn.keyText.destroy();
      return false;
    });
    const title = this.categoryTitle[playerId];
    if (title) { title.destroy(); this.categoryTitle[playerId] = null; }
    this.backButtons = this.backButtons.filter(btn => {
      if (btn.playerId !== playerId) return true;
      btn.bg.destroy(); btn.label.destroy(); btn.keyText.destroy();
      return false;
    });
    const ph = this.placeholderText[playerId];
    if (ph) { ph.destroy(); this.placeholderText[playerId] = null; }
    const ti = this.towerInfoText[playerId];
    if (ti) { ti.destroy(); this.towerInfoText[playerId] = null; }
    this.hideTooltip(playerId);
  }

  private getPanelLayout(playerId: 0 | 1) {
    const btnW = CONFIG.UI_BTN_WIDTH;
    const btnH = CONFIG.UI_BTN_HEIGHT;
    const gap = CONFIG.UI_GAP;
    const bottomMargin = CONFIG.UI_GAP * 0.5;
    const topRowY = CONFIG.GAME_HEIGHT - (btnH + gap) * 2 - bottomMargin;
    const bottomRowY = CONFIG.GAME_HEIGHT - btnH - bottomMargin;
    const isRight = playerId === 1;
    const startX = CONFIG.UI_GAP * 2.5;
    const rightEdge = CONFIG.GAME_WIDTH - CONFIG.UI_GAP * 2.5 - btnW / 2;
    return { btnW, btnH, gap, startX, rightEdge, topRowY, bottomRowY, isRight };
  }

  private getButtonX(
    playerId: 0 | 1, index: number, totalInRow: number,
    rowOffset: number, isRight: boolean
  ): number {
    const { btnW, gap, startX, rightEdge } = this.getPanelLayout(playerId);
    if (isRight) {
      return (rightEdge - rowOffset) - (totalInRow - 1 - index) * (btnW + gap);
    }
    return startX + rowOffset + index * (btnW + gap) + btnW / 2;
  }

  private renderMenuForPlayer(playerId: 0 | 1): void {
    this.destroyPlayerPanel(playerId);
    const { btnW, btnH, gap, startX, rightEdge, topRowY, bottomRowY, isRight } = this.getPanelLayout(playerId);
    const key = (def: { p1Key: string; p2Key: string }) => (playerId === 0 ? def.p1Key : def.p2Key);
    const category = this.activeCategory[playerId];

    if (category === null) {
      const topCats = MENU_CATEGORIES.slice(0, 3);
      const botCats = MENU_CATEGORIES.slice(3);
      topCats.forEach((cat, i) => {
        const x = this.getButtonX(playerId, i, topCats.length, 0, isRight);
        this.createCategoryButton(x, topRowY, btnW, btnH, cat.id, cat.label, cat.tooltip, key(cat), playerId);
      });
      botCats.forEach((cat, i) => {
        const staggerOffset = (btnW + gap) * 0.4;
        const x = this.getButtonX(playerId, i, botCats.length, staggerOffset, isRight);
        this.createCategoryButton(x, bottomRowY, btnW, btnH, cat.id, cat.label, cat.tooltip, key(cat), playerId);
      });
      return;
    }

    const catDef = MENU_CATEGORIES.find(c => c.id === category)!;
    const titleY = topRowY - CONFIG.UI_FONT_SMALL - CONFIG.UI_GAP * 2;
    const titleX = isRight ? rightEdge - 2 * (btnW + gap) : startX + 2 * (btnW + gap);

    this.categoryTitle[playerId] = this.add.text(titleX, titleY, catDef.label, {
      fontSize: `${CONFIG.UI_FONT_SMALL}px`, color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(isRight ? 1 : 0, 0.5);

    if (catDef.items.length === 0) {
      this.placeholderText[playerId] = this.add.text(
        titleX,
        topRowY + btnH / 2,
        'Nothing available',
        { fontSize: `${CONFIG.UI_FONT_SMALL}px`, color: '#666666', fontFamily: 'monospace' },
      ).setOrigin(isRight ? 1 : 0, 0.5);
      const backKey = playerId === 0 ? 'Tab' : 'Bksp';
      const backX = this.getButtonX(playerId, 0, 1, 0, isRight);
      this.createBackButton(backX, bottomRowY, btnW, btnH, backKey, playerId);
      return;
    }

    const staggerOffset = (btnW + gap) * 0.4;
    const topRowCount = Math.min(6, catDef.items.length);
    const bottomRowCount = catDef.items.length - topRowCount;

    catDef.items.forEach((item, i) => {
      const isTopRow = i < topRowCount;
      const rowIndex = isTopRow ? i : i - topRowCount;
      const totalInRow = isTopRow ? topRowCount : bottomRowCount;
      const y = isTopRow ? topRowY : bottomRowY;
      const rowOffset = isTopRow ? 0 : staggerOffset;
      const x = this.getButtonX(playerId, rowIndex, totalInRow, rowOffset, isRight);

      if (item.kind === 'upgrade') {
        this.createUpgradeButton(x, y, btnW, btnH, item.type, item.label, key(item), playerId);
      } else if (item.kind === 'research') {
        this.createResearchButton(x, y, btnW, btnH, item.towerType, item.label, item.tooltip, key(item), playerId);
      } else if (item.kind === 'construct') {
        this.createConstructButton(x, y, btnW, btnH, item.towerType, item.label, item.tooltip, key(item), playerId);
      } else if (item.kind === 'action' && item.action === 'nuke') {
        this.createActionButton(x, y, btnW, btnH, item.label, item.tooltip, key(item), playerId);
      } else if (item.kind === 'action' && item.action === 'place') {
        this.createPlaceButton(x, y, btnW, btnH, key(item), playerId);
      } else if (item.kind === 'action' && (item.action === 'towerPrev' || item.action === 'towerNext' || item.action === 'towerUpgrade')) {
        this.createTowerMgmtButton(x, y, btnW, btnH, item.action, item.label, item.tooltip, key(item), playerId);
      }
    });

    const backKey = playerId === 0 ? 'Tab' : 'Bksp';
    const backX = this.getButtonX(playerId, bottomRowCount, bottomRowCount + 1, staggerOffset, isRight);
    this.createBackButton(backX, bottomRowY, btnW, btnH, backKey, playerId);

    if (category === 'towers') {
      const infoX = isRight ? rightEdge - 2 * (btnW + gap) : startX + 2 * (btnW + gap);
      const infoY = topRowY - CONFIG.UI_FONT_SMALL * 3 - CONFIG.UI_GAP * 4;
      this.towerInfoText[playerId] = this.add.text(infoX, infoY, '', {
        fontSize: `${CONFIG.UI_FONT_SMALL}px`, color: '#cccccc', fontFamily: 'monospace',
      }).setOrigin(isRight ? 1 : 0, 0);
    }
  }

  private createCategoryButton(
    x: number, y: number, w: number, h: number,
    categoryId: MenuCategory, label: string, tooltip: string, keyName: string, playerId: 0 | 1,
  ): void {
    const color = playerId === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
    const bg = this.add.rectangle(x, y + h / 2, w, h, 0x111122, 0.85)
      .setStrokeStyle(2, color, 0.5)
      .setInteractive({ useHandCursor: true });
    const labelText = this.add.text(x, y + h * 0.35, label, {
      fontSize: `${CONFIG.UI_FONT_SMALL}px`, color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    const keyText = this.add.text(x, y + h * 0.85, `[${keyName}]`, {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerdown', () => { this.activeCategory[playerId] = categoryId; this.renderMenuForPlayer(playerId); });
    bg.on('pointerover', () => {
      bg.setFillStyle(0x222244, 0.9);
      this.showTooltip(tooltip, x, y, playerId);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x111122, 0.85);
      this.hideTooltip(playerId);
    });
    this.categoryButtons.push({ bg, label: labelText, keyText, categoryId, playerId });
  }

  private createBackButton(
    x: number, y: number, w: number, h: number,
    keyName: string, playerId: 0 | 1,
  ): void {
    const color = playerId === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
    const bg = this.add.rectangle(x, y + h / 2, w, h, 0x111122, 0.85)
      .setStrokeStyle(2, color, 0.5)
      .setInteractive({ useHandCursor: true });
    const labelText = this.add.text(x, y + h * 0.35, 'BACK', {
      fontSize: `${CONFIG.UI_FONT_SMALL}px`, color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    const keyText = this.add.text(x, y + h * 0.85, `[${keyName}]`, {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerdown', () => {
      this.activeCategory[playerId] = null;
      this.renderMenuForPlayer(playerId);
    });
    bg.on('pointerover', () => {
      bg.setFillStyle(0x222244, 0.9);
      this.showTooltip('Return to menu', x, y, playerId);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x111122, 0.85);
      this.hideTooltip(playerId);
    });
    this.backButtons.push({ bg, label: labelText, keyText, playerId });
  }

  private createUpgradeButton(
    x: number, y: number, w: number, h: number,
    type: UpgradeType, label: string, keyName: string, playerId: 0 | 1,
  ): void {
    const color = playerId === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
    const bg = this.add.rectangle(x, y + h / 2, w, h, 0x111122, 0.85)
      .setStrokeStyle(2, color, 0.5)
      .setInteractive({ useHandCursor: true });
    const labelText = this.add.text(x, y + h * 0.22, label, {
      fontSize: `${CONFIG.UI_FONT_SMALL + 2}px`, color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    const costText = this.add.text(x, y + h * 0.52, '$?', {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#ffd700', fontFamily: 'monospace',
    }).setOrigin(0.5);
    const keyText = this.add.text(x, y + h * 0.85, `[${keyName}]`, {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerdown', () => this.handleUpgrade(playerId, type, bg));
    bg.on('pointerover', () => {
      bg.setFillStyle(0x222244, 0.9);
      const player = this.viewModel.players[playerId];
      this.showTooltip(this.buildUpgradeTooltip(type, player), x, y, playerId);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x111122, 0.85);
      this.hideTooltip(playerId);
    });
    this.buttons.push({ bg, label: labelText, costText, keyText, type, playerId });
  }

  private createActionButton(
    x: number, y: number, w: number, h: number,
    label: string, tooltip: string, keyName: string, playerId: 0 | 1,
  ): void {
    const color = playerId === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
    const bg = this.add.rectangle(x, y + h / 2, w, h, 0x221111, 0.85)
      .setStrokeStyle(2, color, 0.5)
      .setInteractive({ useHandCursor: true });
    const labelText = this.add.text(x, y + h * 0.22, label, {
      fontSize: `${CONFIG.UI_FONT_SMALL + 2}px`, color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    const statusText = this.add.text(x, y + h * 0.52, '--:--', {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#ff6666', fontFamily: 'monospace',
    }).setOrigin(0.5);
    const keyText = this.add.text(x, y + h * 0.85, `[${keyName}]`, {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerdown', () => this.handleNuke(playerId, bg));
    bg.on('pointerover', () => {
      bg.setFillStyle(0x332222, 0.9);
      this.showTooltip(tooltip, x, y, playerId);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x221111, 0.85);
      this.hideTooltip(playerId);
    });
    this.nukeButtons.push({ bg, labelText, statusText, keyText, playerId });
  }

  private createResearchButton(
    x: number, y: number, w: number, h: number,
    towerType: TowerType, label: string, tooltip: string, keyName: string, playerId: 0 | 1,
  ): void {
    const color = playerId === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
    const bg = this.add.rectangle(x, y + h / 2, w, h, 0x112211, 0.85)
      .setStrokeStyle(2, color, 0.5)
      .setInteractive({ useHandCursor: true });
    const labelText = this.add.text(x, y + h * 0.22, label, {
      fontSize: `${CONFIG.UI_FONT_SMALL + 2}px`, color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    const costText = this.add.text(x, y + h * 0.52, '$?', {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#ffd700', fontFamily: 'monospace',
    }).setOrigin(0.5);
    const keyText = this.add.text(x, y + h * 0.85, `[${keyName}]`, {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerdown', () => this.handleResearch(playerId, towerType, bg));
    bg.on('pointerover', () => { bg.setFillStyle(0x224422, 0.9); this.showTooltip(tooltip, x, y, playerId); });
    bg.on('pointerout', () => { bg.setFillStyle(0x112211, 0.85); this.hideTooltip(playerId); });
    this.researchButtons.push({ bg, labelText, costText, keyText, towerType, playerId });
  }

  private createConstructButton(
    x: number, y: number, w: number, h: number,
    towerType: TowerType, label: string, tooltip: string, keyName: string, playerId: 0 | 1,
  ): void {
    const color = playerId === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
    const bg = this.add.rectangle(x, y + h / 2, w, h, 0x111122, 0.85)
      .setStrokeStyle(2, color, 0.5)
      .setInteractive({ useHandCursor: true });
    const labelText = this.add.text(x, y + h * 0.22, label, {
      fontSize: `${CONFIG.UI_FONT_SMALL + 2}px`, color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    const costText = this.add.text(x, y + h * 0.52, '$?', {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#ffd700', fontFamily: 'monospace',
    }).setOrigin(0.5);
    const keyText = this.add.text(x, y + h * 0.85, `[${keyName}]`, {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerdown', () => this.handleConstruct(playerId, towerType, bg));
    bg.on('pointerover', () => { bg.setFillStyle(0x222244, 0.9); this.showTooltip(tooltip, x, y, playerId); });
    bg.on('pointerout', () => { bg.setFillStyle(0x111122, 0.85); this.hideTooltip(playerId); });
    this.constructButtons.push({ bg, labelText, costText, keyText, towerType, playerId });
  }

  private createPlaceButton(
    x: number, y: number, w: number, h: number,
    keyName: string, playerId: 0 | 1,
  ): void {
    const color = playerId === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
    const bg = this.add.rectangle(x, y + h / 2, w, h, 0x222211, 0.85)
      .setStrokeStyle(2, color, 0.5)
      .setInteractive({ useHandCursor: true });
    const labelText = this.add.text(x, y + h * 0.22, 'PLACE', {
      fontSize: `${CONFIG.UI_FONT_SMALL + 2}px`, color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    const statusText = this.add.text(x, y + h * 0.52, '--', {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);
    const keyText = this.add.text(x, y + h * 0.85, `[${keyName}]`, {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerdown', () => this.handlePlace(playerId, bg));
    bg.on('pointerover', () => { bg.setFillStyle(0x333322, 0.9); this.showTooltip('Place tower at carrier position', x, y, playerId); });
    bg.on('pointerout', () => { bg.setFillStyle(0x222211, 0.85); this.hideTooltip(playerId); });
    this.placeButtons.push({ bg, labelText, statusText, keyText, playerId });
  }

  private createTowerMgmtButton(
    x: number, y: number, w: number, h: number,
    action: string, label: string, tooltip: string, keyName: string, playerId: 0 | 1,
  ): void {
    const color = playerId === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
    const bg = this.add.rectangle(x, y + h / 2, w, h, 0x111122, 0.85)
      .setStrokeStyle(2, color, 0.5)
      .setInteractive({ useHandCursor: true });
    const labelText = this.add.text(x, y + h * 0.35, label, {
      fontSize: `${CONFIG.UI_FONT_SMALL}px`, color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    const keyText = this.add.text(x, y + h * 0.85, `[${keyName}]`, {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerdown', () => {
      if (action === 'towerPrev') this.handleTowerCycle(playerId, -1);
      else if (action === 'towerNext') this.handleTowerCycle(playerId, 1);
      else if (action === 'towerUpgrade') this.handleTowerUpgrade(playerId, bg);
    });
    bg.on('pointerover', () => { bg.setFillStyle(0x222244, 0.9); this.showTooltip(tooltip, x, y, playerId); });
    bg.on('pointerout', () => { bg.setFillStyle(0x111122, 0.85); this.hideTooltip(playerId); });
    this.categoryButtons.push({ bg, label: labelText, keyText, categoryId: 'towers', playerId });
  }

  // ── Actions ────────────────────────────────────────────────────────

  private handleResearch(playerId: 0 | 1, towerType: TowerType, btn?: Phaser.GameObjects.Rectangle): void {
    if (this.viewModel.gameOver) return;
    const player = this.viewModel.players[playerId];
    const cost = player.getResearchCost(towerType);
    if (this.viewModel.researchTower(playerId, towerType)) {
      if (btn) this.tweens.add({ targets: btn, scaleX: 1.15, scaleY: 1.15, duration: 80, yoyo: true, ease: 'Quad.easeOut' });
      this.showGoldPopup(playerId, `-$${cost}`);
      this.renderMenuForPlayer(playerId);
    } else {
      if (btn) this.tweens.add({ targets: btn, x: btn.x + 3, duration: 40, yoyo: true, repeat: 2, ease: 'Sine.inOut' });
    }
  }

  private handleConstruct(playerId: 0 | 1, towerType: TowerType, btn?: Phaser.GameObjects.Rectangle): void {
    if (this.viewModel.gameOver) return;
    const player = this.viewModel.players[playerId];
    const cost = player.getConstructionCost(towerType);
    if (this.viewModel.constructTower(playerId, towerType)) {
      if (btn) this.tweens.add({ targets: btn, scaleX: 1.15, scaleY: 1.15, duration: 80, yoyo: true, ease: 'Quad.easeOut' });
      this.showGoldPopup(playerId, `-$${cost}`);
    } else {
      if (btn) this.tweens.add({ targets: btn, x: btn.x + 3, duration: 40, yoyo: true, repeat: 2, ease: 'Sine.inOut' });
    }
  }

  private handlePlace(playerId: 0 | 1, btn?: Phaser.GameObjects.Rectangle): void {
    if (this.viewModel.gameOver) return;
    if (this.viewModel.placeTower(playerId)) {
      if (btn) this.tweens.add({ targets: btn, scaleX: 1.15, scaleY: 1.15, duration: 80, yoyo: true, ease: 'Quad.easeOut' });
    } else {
      if (btn) this.tweens.add({ targets: btn, x: btn.x + 3, duration: 40, yoyo: true, repeat: 2, ease: 'Sine.inOut' });
    }
  }

  private handleTowerCycle(playerId: 0 | 1, direction: -1 | 1): void {
    const towers = this.viewModel.getTowers(playerId);
    if (towers.length === 0) return;
    this.selectedTowerIndex[playerId] = ((this.selectedTowerIndex[playerId] + direction) % towers.length + towers.length) % towers.length;
  }

  private handleTowerUpgrade(playerId: 0 | 1, btn?: Phaser.GameObjects.Rectangle): void {
    if (this.viewModel.gameOver) return;
    const towers = this.viewModel.getTowers(playerId);
    const idx = this.selectedTowerIndex[playerId];
    if (idx >= towers.length) return;
    const tower = towers[idx];
    const cost = getTowerUpgradeCost(tower.towerType, tower.level);
    if (this.viewModel.upgradeTower(playerId, idx)) {
      if (btn) this.tweens.add({ targets: btn, scaleX: 1.15, scaleY: 1.15, duration: 80, yoyo: true, ease: 'Quad.easeOut' });
      this.showGoldPopup(playerId, `-$${cost}`);
    } else {
      if (btn) this.tweens.add({ targets: btn, x: btn.x + 3, duration: 40, yoyo: true, repeat: 2, ease: 'Sine.inOut' });
    }
  }

  private handleNuke(playerId: 0 | 1, btn?: Phaser.GameObjects.Rectangle): void {
    if (this.viewModel.gameOver) return;
    if (this.viewModel.launchNuke(playerId)) {
      if (btn) {
        this.tweens.add({
          targets: btn, scaleX: 1.15, scaleY: 1.15,
          duration: 80, yoyo: true, ease: 'Quad.easeOut',
        });
      }
    } else {
      if (btn) {
        this.tweens.add({
          targets: btn, x: btn.x + 3,
          duration: 40, yoyo: true, repeat: 2, ease: 'Sine.inOut',
        });
      }
    }
  }

  private handleUpgrade(playerId: 0 | 1, type: UpgradeType, btn?: Phaser.GameObjects.Rectangle): void {
    if (this.viewModel.gameOver) return;
    const player = this.viewModel.players[playerId];
    const cost = player.getUpgradeCost(type);
    if (this.viewModel.purchaseUpgrade(playerId, type)) {
      if (btn) {
        this.tweens.add({
          targets: btn, scaleX: 1.15, scaleY: 1.15,
          duration: 80, yoyo: true, ease: 'Quad.easeOut',
        });
      }
      this.showGoldPopup(playerId, `-$${cost}`);
    } else {
      if (btn) {
        this.tweens.add({
          targets: btn, x: btn.x + 3,
          duration: 40, yoyo: true, repeat: 2, ease: 'Sine.inOut',
        });
      }
    }
  }

  // ── Keyboard ───────────────────────────────────────────────────────

  private setupKeyboard(): void {
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      const key = event.key;

      // Handle speed control (keys 1, 2, 3)
      if (key === '1' || key === '2' || key === '3') {
        const speed = parseInt(key, 10);
        if (this.viewModel.setDebugSpeedMultiplier) {
          this.viewModel.setDebugSpeedMultiplier(speed);
          // Find and update the visual button state
          const speedBtn = this.speedButtons.find(b => b.speed === speed);
          if (speedBtn) {
            speedBtn.bg.setFillStyle(0x222244, 0.95);
            speedBtn.bg.setStrokeStyle(2, 0x00ddff, 0.9);
            speedBtn.label.setColor('#00ddff');
          }
          // Update other buttons
          for (const btn of this.speedButtons) {
            if (btn.speed !== speed) {
              btn.bg.setFillStyle(0x111122, 0.85);
              btn.bg.setStrokeStyle(2, 0x666666, 0.6);
              btn.label.setColor('#aaaaaa');
            }
          }
        }
        return;
      }

      this.dispatchKeyForPlayer(0, key, event);
      if (this.viewModel.mode === 'pvp') {
        this.dispatchKeyForPlayer(1, key, event);
      }
    });
  }

  private dispatchKeyForPlayer(playerId: 0 | 1, key: string, event: KeyboardEvent): void {
    const result = resolveKeyPress(key, playerId, this.activeCategory[playerId]);
    if (!result) return;

    switch (result.type) {
      case 'back':
        event.preventDefault();
        this.activeCategory[playerId] = null;
        this.renderMenuForPlayer(playerId);
        break;
      case 'navigate':
        this.activeCategory[playerId] = result.category;
        this.renderMenuForPlayer(playerId);
        break;
      case 'upgrade': {
        const btn = this.buttons.find(b => b.playerId === playerId && b.type === result.upgradeType);
        this.handleUpgrade(playerId, result.upgradeType, btn?.bg);
        break;
      }
      case 'research':
        this.handleResearch(playerId, result.towerType);
        break;
      case 'construct':
        this.handleConstruct(playerId, result.towerType);
        break;
      case 'action':
        if (result.action === 'nuke') {
          const nukeBtn = this.nukeButtons.find(b => b.playerId === playerId);
          this.handleNuke(playerId, nukeBtn?.bg);
        } else if (result.action === 'place') {
          this.handlePlace(playerId);
        } else if (result.action === 'towerPrev') {
          this.handleTowerCycle(playerId, -1);
        } else if (result.action === 'towerNext') {
          this.handleTowerCycle(playerId, 1);
        } else if (result.action === 'towerUpgrade') {
          this.handleTowerUpgrade(playerId);
        }
        break;
    }
  }


  // ── Popups ─────────────────────────────────────────────────────────

  private showGoldPopup(playerId: 0 | 1, text: string): void {
    this.showMoneyPopup(playerId, text, '#ff4444');
  }

  showInterestPopup(playerId: 0 | 1, amount: number): void {
    this.showMoneyPopup(playerId, `+$${amount}`, '#44ff44');
  }

  private showMoneyPopup(playerId: 0 | 1, text: string, color: string): void {
    const x = playerId === 0 ? CONFIG.UI_BAR_WIDTH + CONFIG.UI_GAP * 4 : CONFIG.GAME_WIDTH - CONFIG.UI_BAR_WIDTH - CONFIG.UI_GAP * 4;
    const y = CONFIG.UI_GAP * 2 + CONFIG.UI_BAR_HEIGHT + CONFIG.UI_GAP;
    const popup = this.add.text(x, y, text, {
      fontSize: `${CONFIG.UI_FONT_SMALL + 2}px`, color, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.popups.push(popup);

    this.tweens.add({
      targets: popup,
      y: popup.y - CONFIG.UI_GAP * 5,
      alpha: 0,
      duration: 600,
      onComplete: () => {
        popup.destroy();
        this.popups = this.popups.filter(p => p !== popup);
      },
    });
  }

  // ── Update loop ────────────────────────────────────────────────────

  update(): void {
    if (!this.viewModel.players) return;

    const currentSpeed = this.viewModel.debugSpeedMultiplier ?? 1;
    for (const { bg, label, speed } of this.speedButtons) {
      const active = currentSpeed === speed;
      bg.setFillStyle(active ? 0x222244 : 0x111122, active ? 0.95 : 0.85);
      bg.setStrokeStyle(2, active ? 0x00ddff : 0x666666, active ? 0.9 : 0.6);
      label.setColor(active ? '#00ddff' : '#aaaaaa');
    }

    if (DEBUG_MODE && this.viewModel.debugSpeedMultiplier !== undefined) {
      const speed = this.viewModel.debugSpeedMultiplier;
      if (this.debugSpeedText) {
        this.debugSpeedText.setText(`Speed: ${speed.toFixed(1)}x`);
      }
      if (this.debugSpeedSliderFill && this.debugSpeedSliderHandle && !this.debugMenuCollapsed) {
        const sliderW = 200;
        const sliderX = CONFIG.GAME_WIDTH / 2 - sliderW / 2;
        const sliderY = 40 + 90;
        const normalizedSpeed = (speed - 0.1) / 9.9;
        const fillWidth = sliderW * normalizedSpeed;
        this.debugSpeedSliderFill.setSize(fillWidth, 20);
        this.debugSpeedSliderHandle.setPosition(sliderX + fillWidth, sliderY);
      }
    }

    const [p1, p2] = this.viewModel.players;

    const barX = CONFIG.UI_GAP * 2.5;
    const barY = CONFIG.UI_GAP * 2;
    this.drawHPBar(this.p1HPBar, barX, barY, CONFIG.UI_BAR_WIDTH, CONFIG.UI_BAR_HEIGHT, p1.baseHP, CONFIG.BASE_HP, CONFIG.PLAYER1_COLOR);
    this.drawHPBar(this.p2HPBar, CONFIG.GAME_WIDTH - barX - CONFIG.UI_BAR_WIDTH, barY, CONFIG.UI_BAR_WIDTH, CONFIG.UI_BAR_HEIGHT, p2.baseHP, CONFIG.BASE_HP, CONFIG.PLAYER2_COLOR);

    this.p1HPText.setText(`${p1.baseHP}/${CONFIG.BASE_HP}`);
    this.p2HPText.setText(`${p2.baseHP}/${CONFIG.BASE_HP}`);

    this.p1GoldText.setText(`Gold: $${p1.gold}  Kills: ${p1.kills}`);
    const p2Prefix = this.viewModel.mode === 'ai' ? 'AI ' : '';
    this.p2GoldText.setText(`${p2Prefix}Gold: $${p2.gold}  Kills: ${p2.kills}`);

    const p1Count = this.viewModel.getParticleCount(0);
    const p2Count = this.viewModel.getParticleCount(1);
    this.p1StatsText.setText(`HP:${p1.particleHealth} ATK:${p1.particleAttack} RAD:${p1.particleRadius} VEL:${p1.particleSpeed} DEF:${Math.round(p1.particleDefense * 100)}% INT:${(p1.goldInterestRate * 100).toFixed(2)}% Units:${p1Count}/${p1.maxParticles}`);
    this.p2StatsText.setText(`HP:${p2.particleHealth} ATK:${p2.particleAttack} RAD:${p2.particleRadius} VEL:${p2.particleSpeed} DEF:${Math.round(p2.particleDefense * 100)}% INT:${(p2.goldInterestRate * 100).toFixed(2)}% Units:${p2Count}/${p2.maxParticles}`);

    for (const btn of this.buttons) {
      const player = this.viewModel.players[btn.playerId];
      const canAfford = player.canAfford(btn.type);
      const isAtMax = player.isUpgradeAtMax(btn.type);
      btn.bg.setAlpha(canAfford && !isAtMax ? 1 : 0.4);
      btn.costText.setText(`$${player.getUpgradeCost(btn.type)}`);
    }

    for (const btn of this.researchButtons) {
      const player = this.viewModel.players[btn.playerId];
      const researched = player.hasResearched(btn.towerType);
      const canResearch = player.canResearchTower(btn.towerType);
      btn.bg.setAlpha(researched ? 0.3 : canResearch ? 1 : 0.4);
      btn.costText.setText(researched ? 'DONE' : `$${player.getResearchCost(btn.towerType)}`);
      if (researched) btn.costText.setColor('#66ff66');
      else btn.costText.setColor('#ffd700');
    }

    for (const btn of this.constructButtons) {
      const player = this.viewModel.players[btn.playerId];
      const researched = player.hasResearched(btn.towerType);
      const canAfford = player.canAffordConstruction(btn.towerType);
      const hasCarrier = this.viewModel.hasActiveCarrier(btn.playerId);
      const atCap = this.viewModel.getTowers(btn.playerId).length >= CONFIG.TOWER_MAX_PER_PLAYER;
      btn.bg.setAlpha(researched && canAfford && !hasCarrier && !atCap ? 1 : 0.4);
      btn.costText.setText(researched ? `$${player.getConstructionCost(btn.towerType)}` : 'LOCKED');
    }

    const gameTimeMs = this.viewModel.gameTimeMs;
    for (const btn of this.nukeButtons) {
      const player = this.viewModel.players[btn.playerId];
      const canUse = player.canUseNuke(gameTimeMs);
      btn.bg.setAlpha(canUse ? 1 : 0.4);
      const remainingMs = player.getNukeCooldownRemainingMs(gameTimeMs);
      if (remainingMs <= 0) {
        btn.statusText.setText('READY');
        btn.statusText.setColor('#66ff66');
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        btn.statusText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);
        btn.statusText.setColor('#ff6666');
      }
    }

    for (const btn of this.placeButtons) {
      const hasCarrier = this.viewModel.hasActiveCarrier(btn.playerId);
      btn.bg.setAlpha(hasCarrier ? 1 : 0.4);
      if (hasCarrier) {
        btn.statusText.setText('READY');
        btn.statusText.setColor('#66ff66');
      } else {
        btn.statusText.setText('NO CARRIER');
        btn.statusText.setColor('#666666');
      }
    }

    this.updateTowerInfoText(0);
    this.updateTowerInfoText(1);
  }

  private updateTowerInfoText(playerId: 0 | 1): void {
    const info = this.towerInfoText[playerId];
    if (!info) return;

    const towers = this.viewModel.getTowers(playerId);
    if (towers.length === 0) {
      info.setText('No towers placed');
      return;
    }

    const idx = Math.min(this.selectedTowerIndex[playerId], towers.length - 1);
    this.selectedTowerIndex[playerId] = idx;
    const tower = towers[idx];
    const player = this.viewModel.players[playerId];
    const cost = getTowerUpgradeCost(tower.towerType, tower.level);
    const canAfford = player.gold >= cost;

    let statsLine: string;
    if (tower.towerType === 'laser') {
      const cur = getLaserStats(tower.level);
      const nxt = getLaserStats(tower.level + 1);
      statsLine = `DMG:${cur.damage}->${nxt.damage}  RNG:${cur.range}->${nxt.range}  SPD:${cur.attackSpeed.toFixed(1)}->${nxt.attackSpeed.toFixed(1)}`;
    } else {
      const cur = getSlowStats(tower.level);
      const nxt = getSlowStats(tower.level + 1);
      statsLine = `SLOW:${Math.round(cur.slowFactor * 100)}%->${Math.round(nxt.slowFactor * 100)}%  RNG:${cur.range}->${nxt.range}`;
    }

    const hp = `HP:${Math.ceil(tower.health)}/${tower.maxHealth}`;
    info.setText(
      `Tower ${idx + 1}/${towers.length}: ${tower.towerType.toUpperCase()} Lv${tower.level}\n` +
      `${hp}  ${statsLine}\n` +
      `Upgrade: $${cost}${canAfford ? '' : ' (need gold)'}`
    );
  }

  // ── Debug menu ─────────────────────────────────────────────────────

  private createDebugMenu(): void {
    const centerX = CONFIG.GAME_WIDTH / 2;
    const topY = 40;
    const menuW = 300;
    const menuH = 200;
    const collapsedH = 40;

    this.debugMenuBg = this.add.rectangle(centerX, topY + collapsedH / 2, menuW, menuH, 0x000000, 0.85)
      .setStrokeStyle(2, 0x00ff00, 0.8)
      .setInteractive({ useHandCursor: true })
      .setDepth(100);

    this.debugMenuToggle = this.add.text(centerX, topY + collapsedH / 2, 'DEBUG', {
      fontSize: `${CONFIG.UI_FONT_MED}px`,
      color: '#00ff00',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5).setDepth(101);

    this.debugSpeedText = this.add.text(centerX, topY + 50, 'Speed: 1.0x', {
      fontSize: `${CONFIG.UI_FONT_SMALL}px`,
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(101).setVisible(false);

    const sliderW = 200;
    const sliderH = 20;
    const sliderX = centerX - sliderW / 2;
    const sliderY = topY + 90;

    this.debugSpeedSlider = this.add.rectangle(sliderX + sliderW / 2, sliderY, sliderW, sliderH, 0x333333, 0.9)
      .setStrokeStyle(2, 0x00ff00, 0.8)
      .setInteractive({ useHandCursor: true })
      .setDepth(101)
      .setVisible(false);

    this.debugSpeedSliderFill = this.add.rectangle(sliderX, sliderY, 0, sliderH, 0x00ff00, 0.6)
      .setOrigin(0, 0.5)
      .setDepth(102)
      .setVisible(false);

    const handleW = 12;
    const handleH = 24;
    this.debugSpeedSliderHandle = this.add.rectangle(sliderX, sliderY, handleW, handleH, 0x00ff00, 1)
      .setStrokeStyle(2, 0xffffff, 1)
      .setOrigin(0.5, 0.5)
      .setDepth(103)
      .setVisible(false);

    this.debugMenuBg.on('pointerdown', () => {
      this.debugMenuCollapsed = !this.debugMenuCollapsed;
      this.updateDebugMenuVisibility();
    });

    const updateSpeedVisual = (speed: number) => {
      if (!this.debugSpeedSliderFill || !this.debugSpeedSliderHandle) return;
      const normalizedSpeed = (speed - 0.1) / 9.9;
      const fillWidth = sliderW * normalizedSpeed;
      this.debugSpeedSliderFill.setSize(fillWidth, sliderH);
      this.debugSpeedSliderHandle.setPosition(sliderX + fillWidth, sliderY);
    };

    this.debugSpeedSlider.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      if (this.debugMenuCollapsed) return;
      const updateSpeed = (x: number) => {
        const localX = Math.max(0, Math.min(sliderW, x - sliderX));
        const speed = Math.max(0.1, Math.min(10, (localX / sliderW) * 9.9 + 0.1));
        if (this.viewModel.setDebugSpeedMultiplier) {
          this.viewModel.setDebugSpeedMultiplier(speed);
        }
        updateSpeedVisual(speed);
      };
      updateSpeed(pointer.x);
      this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
        if (p.isDown) updateSpeed(p.x);
      });
      this.input.once('pointerup', () => {
        this.input.off('pointermove');
      });
    });

    updateSpeedVisual(1);
    this.updateDebugMenuVisibility();
  }

  private updateDebugMenuVisibility(): void {
    if (!this.debugMenuBg || !this.debugMenuToggle || !this.debugSpeedText || !this.debugSpeedSlider) return;

    const topY = 40;
    const collapsedH = 40;
    const menuH = 200;

    if (this.debugMenuCollapsed) {
      this.debugMenuBg.setSize(300, 40);
      this.debugMenuBg.setPosition(CONFIG.GAME_WIDTH / 2, topY + collapsedH / 2);
      this.debugMenuToggle.setPosition(CONFIG.GAME_WIDTH / 2, topY + collapsedH / 2);
      this.debugMenuToggle.setText('DEBUG');
      this.debugSpeedText.setVisible(false);
      this.debugSpeedSlider.setVisible(false);
      if (this.debugSpeedSliderFill) this.debugSpeedSliderFill.setVisible(false);
      if (this.debugSpeedSliderHandle) this.debugSpeedSliderHandle.setVisible(false);
    } else {
      this.debugMenuBg.setSize(300, 200);
      this.debugMenuBg.setPosition(CONFIG.GAME_WIDTH / 2, topY + menuH / 2);
      this.debugMenuToggle.setPosition(CONFIG.GAME_WIDTH / 2, topY + collapsedH / 2);
      this.debugMenuToggle.setText('DEBUG');
      this.debugSpeedText.setVisible(true);
      this.debugSpeedSlider.setVisible(true);
      if (this.debugSpeedSliderFill) this.debugSpeedSliderFill.setVisible(true);
      if (this.debugSpeedSliderHandle) this.debugSpeedSliderHandle.setVisible(true);
    }
  }

  // ── Drawing helpers ────────────────────────────────────────────────

  private drawHPBar(
    gfx: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    current: number, max: number, color: number
  ): void {
    const radius = CONFIG.UI_GAP;
    gfx.clear();
    gfx.fillStyle(0x111111, 0.8);
    gfx.fillRoundedRect(x, y, w, h, radius);
    const pct = Math.max(0, current / max);
    if (pct > 0) {
      gfx.fillStyle(color, 0.8);
      gfx.fillRoundedRect(x + 2, y + 2, (w - 4) * pct, h - 4, radius - 1);
    }
    gfx.lineStyle(2, color, 0.5);
    gfx.strokeRoundedRect(x, y, w, h, radius);
  }
}
