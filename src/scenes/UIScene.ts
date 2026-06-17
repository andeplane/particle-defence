import Phaser from 'phaser';
import { CONFIG, DEBUG_MODE, TOWER_TYPE, getTowerUpgradeCost, setDebugEverythingCheap, type UpgradeType, type TowerType } from '../config';
import { isMobile } from '../mobile';
import type { IPlayer } from '../player';
import { GAME_MODE, type GameMode } from './MenuScene';
import {
  MENU_CATEGORIES,
  getConstructionSubmenuItems,
  type BuildSubmenu,
  type MenuCategory,
  type MenuItemDef,
  resolveKeyPress,
} from './menuConfig';
import { getClearedUIState } from './UISceneState';
import {
  backFromConstructionState,
  createDefaultConstructionMenuState,
  getVisibleConstructionItems,
  selectConstructionTower,
  type ConstructionMenuState,
} from './constructionMenuState';
import { LaserTowerParticle, getLaserStatsAtLevel } from '../particles/LaserTowerParticle';
import { WeaknessTowerParticle, getWeaknessStatsAtLevel } from '../particles/WeaknessTowerParticle';
import { getVisibleResearchNodes, type ResearchNodeDef } from '../research/visibleResearchNodes';
import type { TowerSite } from '../grid';
import { SCENE_KEYS } from './SceneKeys';

export interface TowerSelectionForRender {
  active: boolean;
  selectedIndex: number;
  selectedBuildSiteId?: number;
}

export interface IGameViewModel {
  readonly players: readonly [IPlayer, IPlayer];
  readonly mode: GameMode;
  readonly gameTimeMs: number;
  readonly gameOver: boolean;
  getParticleCount(owner: 0 | 1): number;
  purchaseUpgrade(playerId: 0 | 1, type: UpgradeType): boolean;
  launchNuke(playerId: 0 | 1): boolean;
  researchTower(playerId: 0 | 1, towerType: TowerType): boolean;
  /** Purchase (or start timer for) a dynamic research node (unlock or path level). */
  purchaseResearchNode(playerId: 0 | 1, nodeId: string, isPath: boolean, durationMs: number): boolean;
  constructTower(playerId: 0 | 1, towerType: TowerType, siteId: number): boolean;
  upgradeTower(playerId: 0 | 1, towerIndex: number): boolean;
  getEligibleTowerSites(playerId: 0 | 1): readonly TowerSite[];
  getTowerSites(): readonly TowerSite[];
  isTowerSiteOccupied(siteId: number): boolean;
  getTowers(playerId: 0 | 1): ReadonlyArray<LaserTowerParticle | WeaknessTowerParticle>;
  getPendingConstruction(playerId: 0 | 1): { towerType: TowerType; progress: number; remainingMs: number } | null;
  getPendingTowerUpgrade(playerId: 0 | 1, towerIndex: number): { progress: number; remainingMs: number } | null;
  /** Mutable; UIScene updates each frame for in-world selection ring rendering */
  towerSelectionForRender?: [TowerSelectionForRender, TowerSelectionForRender];
  debugSpeedMultiplier?: number;
  setDebugSpeedMultiplier?: (speed: number) => void;
  debugEverythingCheap?: boolean;
  setDebugEverythingCheap?: (enabled: boolean) => void;
}



interface UpgradeButton {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  keyText: Phaser.GameObjects.Text;
  clockGfx: Phaser.GameObjects.Graphics;
  type: UpgradeType;
  playerId: 0 | 1;
}

interface NukeButton {
  bg: Phaser.GameObjects.Rectangle;
  labelText: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
  keyText: Phaser.GameObjects.Text;
  clockGfx: Phaser.GameObjects.Graphics;
  playerId: 0 | 1;
}

type BuildAction = 'buildPrev' | 'buildNext' | 'buildSelected';

interface BuildActionButton {
  bg: Phaser.GameObjects.Rectangle;
  labelText: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
  keyText: Phaser.GameObjects.Text;
  clockGfx?: Phaser.GameObjects.Graphics;
  action: BuildAction;
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
  private activeBuildSubmenu: [BuildSubmenu | null, BuildSubmenu | null] = [null, null];
  private categoryTitle: [Phaser.GameObjects.Text | null, Phaser.GameObjects.Text | null] = [null, null];
  private backButtons: BackButton[] = [];
  private placeholderText: [Phaser.GameObjects.Text | null, Phaser.GameObjects.Text | null] = [null, null];
  private tooltipText: [Phaser.GameObjects.Text | null, Phaser.GameObjects.Text | null] = [null, null];
  private hoveredUpgradeBtn: [{ type: UpgradeType; x: number; y: number } | null, { type: UpgradeType; x: number; y: number } | null] = [null, null];
  private selectedTowerIndex: [number, number] = [0, 0];
  private constructionMenuState: [ConstructionMenuState, ConstructionMenuState] = [
    createDefaultConstructionMenuState(),
    createDefaultConstructionMenuState(),
  ];
  private selectedBuildSiteId: [number, number] = [0, 0];
  private researchButtons: { bg: Phaser.GameObjects.Rectangle; labelText: Phaser.GameObjects.Text; costText: Phaser.GameObjects.Text; keyText: Phaser.GameObjects.Text; clockGfx: Phaser.GameObjects.Graphics; node: ResearchNodeDef; playerId: 0 | 1 }[] = [];
  private constructButtons: { bg: Phaser.GameObjects.Rectangle; labelText: Phaser.GameObjects.Text; costText: Phaser.GameObjects.Text; keyText: Phaser.GameObjects.Text; clockGfx: Phaser.GameObjects.Graphics; towerType: TowerType; playerId: 0 | 1 }[] = [];
  private buildActionButtons: BuildActionButton[] = [];
  private towerInfoText: [Phaser.GameObjects.Text | null, Phaser.GameObjects.Text | null] = [null, null];
  private popups: Phaser.GameObjects.Text[] = [];
  private debugMenuCollapsed: boolean = true;
  private debugMenuBg?: Phaser.GameObjects.Rectangle;
  private debugMenuToggle?: Phaser.GameObjects.Text;
  private debugSpeedText?: Phaser.GameObjects.Text;
  private debugSpeedSlider?: Phaser.GameObjects.Rectangle;
  private debugSpeedSliderFill?: Phaser.GameObjects.Rectangle;
  private debugSpeedSliderHandle?: Phaser.GameObjects.Rectangle;
  private debugEverythingCheapToggle?: Phaser.GameObjects.Rectangle;
  private debugEverythingCheapText?: Phaser.GameObjects.Text;
  private speedButtons: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; speed: number }[] = [];
  private readonly _mobile = isMobile();

  constructor() {
    super({ key: SCENE_KEYS.UI });
  }

  init(data: { viewModel?: IGameViewModel; gameScene?: IGameViewModel; mode?: GameMode }): void {
    this.viewModel = data.viewModel ?? data.gameScene!;
  }

  shutdown(): void {
    this.clearUIState();
  }

  private clearUIState(): void {
    const cleared = getClearedUIState();
    this.speedButtons = cleared.speedButtons as typeof this.speedButtons;
    this.buttons = cleared.buttons as typeof this.buttons;
    this.nukeButtons = cleared.nukeButtons as typeof this.nukeButtons;
    this.categoryButtons = cleared.categoryButtons as typeof this.categoryButtons;
    this.backButtons = cleared.backButtons as typeof this.backButtons;
    this.researchButtons = cleared.researchButtons as typeof this.researchButtons;
    this.constructButtons = cleared.constructButtons as typeof this.constructButtons;
    this.buildActionButtons = cleared.placeButtons as typeof this.buildActionButtons;
    this.popups = cleared.popups as typeof this.popups;
    this.activeCategory = cleared.activeCategory;
    this.activeBuildSubmenu = cleared.activeBuildSubmenu;
    this.categoryTitle = cleared.categoryTitle as typeof this.categoryTitle;
    this.placeholderText = cleared.placeholderText as typeof this.placeholderText;
    this.tooltipText = cleared.tooltipText as typeof this.tooltipText;
    this.selectedTowerIndex = cleared.selectedTowerIndex;
    this.constructionMenuState = [
      createDefaultConstructionMenuState(),
      createDefaultConstructionMenuState(),
    ];
    this.selectedBuildSiteId = [0, 0];
    this.debugMenuBg = undefined;
    this.debugMenuToggle = undefined;
    this.debugSpeedText = undefined;
    this.debugSpeedSlider = undefined;
    this.debugSpeedSliderFill = undefined;
    this.debugSpeedSliderHandle = undefined;
    this.debugEverythingCheapToggle = undefined;
    this.debugEverythingCheapText = undefined;
  }

  create(): void {
    this.createSpeedButtons();
    this.createHPBars();
    this.createGoldDisplay();
    this.createStatsDisplay();
    this.renderMenuForPlayer(0);
    if (this.viewModel.mode === GAME_MODE.PVP) {
      this.renderMenuForPlayer(1);
    }
    this.setupKeyboard();
    if (DEBUG_MODE) {
      this.createDebugMenu();
    }
  }

  private createSpeedButtons(): void {
    if (!this.viewModel.setDebugSpeedMultiplier || this.viewModel.debugSpeedMultiplier === undefined) return;

    this.speedButtons = [];
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
        if (!label.scene) return;
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
      case 'spawnRate': {
        const pps = 1000 / player.spawnInterval;
        const nextPps = pps + CONFIG.SPAWN_RATE_PER_LEVEL;
        current = `${pps.toFixed(1)}/s`;
        next = `Next: ${nextPps.toFixed(1)}/s`;
        break;
      }
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
      btn.bg.destroy(); btn.label.destroy(); btn.costText.destroy(); btn.keyText.destroy(); btn.clockGfx.destroy();
      return false;
    });
    this.nukeButtons = this.nukeButtons.filter(btn => {
      if (btn.playerId !== playerId) return true;
      btn.bg.destroy(); btn.labelText.destroy(); btn.statusText.destroy(); btn.keyText.destroy(); btn.clockGfx.destroy();
      return false;
    });
    this.categoryButtons = this.categoryButtons.filter(btn => {
      if (btn.playerId !== playerId) return true;
      btn.bg.destroy(); btn.label.destroy(); btn.keyText.destroy();
      return false;
    });
    this.researchButtons = this.researchButtons.filter(btn => {
      if (btn.playerId !== playerId) return true;
      btn.bg.destroy(); btn.labelText.destroy(); btn.costText.destroy(); btn.keyText.destroy(); btn.clockGfx.destroy();
      return false;
    });
    this.constructButtons = this.constructButtons.filter(btn => {
      if (btn.playerId !== playerId) return true;
      btn.bg.destroy(); btn.labelText.destroy(); btn.costText.destroy(); btn.keyText.destroy(); btn.clockGfx.destroy();
      return false;
    });
    this.buildActionButtons = this.buildActionButtons.filter(btn => {
      if (btn.playerId !== playerId) return true;
      btn.bg.destroy(); btn.labelText.destroy(); btn.statusText.destroy(); btn.keyText.destroy(); btn.clockGfx?.destroy();
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
    const buildSubmenu = this.activeBuildSubmenu[playerId];

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

    const title = category === 'construction' && buildSubmenu !== null
      ? `${catDef.label}: ${buildSubmenu.toUpperCase()}`
      : catDef.label;
    this.categoryTitle[playerId] = this.add.text(titleX, titleY, title, {
      fontSize: `${CONFIG.UI_FONT_SMALL}px`, color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(isRight ? 1 : 0, 0.5);

    // Research menu: dynamically computed from player state
    if (category === 'research') {
      const player = this.viewModel.players[playerId];
      const researchNodes = getVisibleResearchNodes(player);
      const staggerOffset = (btnW + gap) * 0.4;
      const topRowCount = Math.min(4, researchNodes.length);
      const bottomRowCount = researchNodes.length - topRowCount;
      researchNodes.forEach((node, i) => {
        const isTopRow = i < topRowCount;
        const rowIndex = isTopRow ? i : i - topRowCount;
        const totalInRow = isTopRow ? topRowCount : bottomRowCount;
        const y = isTopRow ? topRowY : bottomRowY;
        const rowOffset = isTopRow ? 0 : staggerOffset;
        const x = this.getButtonX(playerId, rowIndex, totalInRow, rowOffset, isRight);
        const nodeKey = playerId === 0 ? node.p1Key : node.p2Key;
        this.createResearchButton(x, y, btnW, btnH, node, nodeKey, playerId);
      });
      const backKey = playerId === 0 ? 'Tab' : 'Bksp';
      const backIndex = isRight ? 0 : bottomRowCount;
      const backX = this.getButtonX(playerId, backIndex, bottomRowCount + 1, (btnW + gap) * 0.4, isRight);
      this.createBackButton(backX, bottomRowY, btnW, btnH, backKey, playerId);
      return;
    }

    const items = category === 'construction' && buildSubmenu !== null
      ? getConstructionSubmenuItems(buildSubmenu)
      : catDef.items;

    if (items.length === 0) {
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
    const visibleItems = this.getVisibleMenuItems(playerId, items);
    const topRowCount = Math.min(4, visibleItems.length);
    const bottomRowCount = visibleItems.length - topRowCount;

    visibleItems.forEach((item, i) => {
      const isTopRow = i < topRowCount;
      const rowIndex = isTopRow ? i : i - topRowCount;
      const totalInRow = isTopRow ? topRowCount : bottomRowCount;
      const y = isTopRow ? topRowY : bottomRowY;
      const rowOffset = isTopRow ? 0 : staggerOffset;
      const x = this.getButtonX(playerId, rowIndex, totalInRow, rowOffset, isRight);

      if (item.kind === 'upgrade') {
        this.createUpgradeButton(x, y, btnW, btnH, item.type, item.label, key(item), playerId);
      } else if (item.kind === 'construct') {
        this.createConstructButton(x, y, btnW, btnH, item.towerType, item.label, item.tooltip, key(item), playerId);
      } else if (item.kind === 'buildSubmenu') {
        this.createBuildSubmenuButton(x, y, btnW, btnH, item.buildSubmenu, item.label, item.tooltip, key(item), playerId);
      } else if (item.kind === 'action' && item.action === 'nuke') {
        this.createActionButton(x, y, btnW, btnH, item.label, item.tooltip, key(item), playerId);
      } else if (item.kind === 'action' && (item.action === 'buildPrev' || item.action === 'buildNext' || item.action === 'buildSelected')) {
        this.createBuildActionButton(x, y, btnW, btnH, item.action, item.label, item.tooltip, key(item), playerId);
      } else if (item.kind === 'action' && (item.action === 'towerPrev' || item.action === 'towerNext' || item.action === 'towerUpgrade')) {
        this.createTowerMgmtButton(x, y, btnW, btnH, item.action, item.label, item.tooltip, key(item), playerId);
      }
    });

    const backKey = playerId === 0 ? 'Tab' : 'Bksp';
    const backIndex = isRight ? 0 : bottomRowCount;
    const backX = this.getButtonX(playerId, backIndex, bottomRowCount + 1, staggerOffset, isRight);
    this.createBackButton(backX, bottomRowY, btnW, btnH, backKey, playerId);

    if (category === 'towers' || category === 'construction') {
      const infoX = isRight ? rightEdge - 2 * (btnW + gap) : startX + 2 * (btnW + gap);
      const infoY = topRowY - CONFIG.UI_FONT_SMALL * 3 - CONFIG.UI_GAP * 4;
      this.towerInfoText[playerId] = this.add.text(infoX, infoY, '', {
        fontSize: `${CONFIG.UI_FONT_SMALL}px`, color: '#cccccc', fontFamily: 'monospace',
      }).setOrigin(isRight ? 1 : 0, 0);
    }
  }

  private createBuildSubmenuButton(
    x: number, y: number, w: number, h: number,
    buildSubmenu: BuildSubmenu, label: string, tooltip: string, keyName: string, playerId: 0 | 1,
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
    }).setOrigin(0.5).setVisible(!this._mobile);

    bg.on('pointerdown', () => {
      this.activeBuildSubmenu[playerId] = buildSubmenu;
      this.renderMenuForPlayer(playerId);
    });
    bg.on('pointerover', () => {
      bg.setFillStyle(0x222244, 0.9);
      this.showTooltip(tooltip, x, y, playerId);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x111122, 0.85);
      this.hideTooltip(playerId);
    });
    this.categoryButtons.push({ bg, label: labelText, keyText, categoryId: 'construction', playerId });
  }

  private getVisibleMenuItems(playerId: 0 | 1, items: readonly MenuItemDef[]) {
    if (this.activeCategory[playerId] !== 'construction' || this.activeBuildSubmenu[playerId] !== 'towers') {
      return items;
    }
    return getVisibleConstructionItems(items, this.constructionMenuState[playerId]);
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
    }).setOrigin(0.5).setVisible(!this._mobile);

    bg.on('pointerdown', () => {
      this.activeCategory[playerId] = categoryId;
      this.activeBuildSubmenu[playerId] = null;
      this.renderMenuForPlayer(playerId);
    });
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
    }).setOrigin(0.5).setVisible(!this._mobile);

    bg.on('pointerdown', () => {
      if (this.activeCategory[playerId] === 'construction' && this.constructionMenuState[playerId].siteSelectionActive) {
        this.constructionMenuState[playerId] = backFromConstructionState(this.constructionMenuState[playerId]);
      } else if (this.activeCategory[playerId] === 'construction' && this.activeBuildSubmenu[playerId] !== null) {
        this.activeBuildSubmenu[playerId] = null;
      } else {
        this.activeCategory[playerId] = null;
        this.activeBuildSubmenu[playerId] = null;
      }
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
    }).setOrigin(0.5).setVisible(!this._mobile);

    const clockGfx = this.add.graphics().setDepth(10);

    bg.on('pointerdown', () => this.handleUpgrade(playerId, type, bg));
    bg.on('pointerover', () => {
      bg.setFillStyle(0x222244, 0.9);
      const player = this.viewModel.players[playerId];
      this.hoveredUpgradeBtn[playerId] = { type, x, y };
      this.showTooltip(this.buildUpgradeTooltip(type, player), x, y, playerId);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x111122, 0.85);
      this.hoveredUpgradeBtn[playerId] = null;
      this.hideTooltip(playerId);
    });
    this.buttons.push({ bg, label: labelText, costText, keyText, clockGfx, type, playerId });
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
    }).setOrigin(0.5).setVisible(!this._mobile);

    const clockGfx = this.add.graphics().setDepth(10);

    bg.on('pointerdown', () => this.handleNuke(playerId, bg));
    bg.on('pointerover', () => {
      bg.setFillStyle(0x332222, 0.9);
      this.showTooltip(tooltip, x, y, playerId);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x221111, 0.85);
      this.hideTooltip(playerId);
    });
    this.nukeButtons.push({ bg, labelText, statusText, keyText, clockGfx, playerId });
  }

  private createResearchButton(
    x: number, y: number, w: number, h: number,
    node: ResearchNodeDef, keyName: string, playerId: 0 | 1,
  ): void {
    const color = playerId === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
    const bg = this.add.rectangle(x, y + h / 2, w, h, 0x112211, 0.85)
      .setStrokeStyle(2, color, 0.5)
      .setInteractive({ useHandCursor: true });
    const labelText = this.add.text(x, y + h * 0.22, node.label, {
      fontSize: `${CONFIG.UI_FONT_SMALL + 2}px`, color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    const costText = this.add.text(x, y + h * 0.52, '$?', {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#ffd700', fontFamily: 'monospace',
    }).setOrigin(0.5);
    const keyText = this.add.text(x, y + h * 0.85, `[${keyName}]`, {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5).setVisible(!this._mobile);

    const clockGfx = this.add.graphics().setDepth(10);

    bg.on('pointerdown', () => this.handleResearchNode(playerId, node, bg));
    bg.on('pointerover', () => { bg.setFillStyle(0x224422, 0.9); this.showTooltip(node.tooltip, x, y, playerId); });
    bg.on('pointerout', () => { bg.setFillStyle(0x112211, 0.85); this.hideTooltip(playerId); });
    this.researchButtons.push({ bg, labelText, costText, keyText, clockGfx, node, playerId });
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
    }).setOrigin(0.5).setVisible(!this._mobile);

    const clockGfx = this.add.graphics().setDepth(10);

    bg.on('pointerdown', () => this.handleConstruct(playerId, towerType, bg));
    bg.on('pointerover', () => { bg.setFillStyle(0x222244, 0.9); this.showTooltip(tooltip, x, y, playerId); });
    bg.on('pointerout', () => { bg.setFillStyle(0x111122, 0.85); this.hideTooltip(playerId); });
    this.constructButtons.push({ bg, labelText, costText, keyText, clockGfx, towerType, playerId });
  }

  private createBuildActionButton(
    x: number, y: number, w: number, h: number,
    action: BuildAction, label: string, tooltip: string, keyName: string, playerId: 0 | 1,
  ): void {
    const color = playerId === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
    const bg = this.add.rectangle(x, y + h / 2, w, h, 0x222211, 0.85)
      .setStrokeStyle(2, color, 0.5)
      .setInteractive({ useHandCursor: true });
    const labelText = this.add.text(x, y + h * 0.22, label, {
      fontSize: `${CONFIG.UI_FONT_SMALL + 2}px`, color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    const statusText = this.add.text(x, y + h * 0.52, '--', {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);
    const keyText = this.add.text(x, y + h * 0.85, `[${keyName}]`, {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5).setVisible(!this._mobile);

    const clockGfx = action === 'buildSelected' ? this.add.graphics().setDepth(10) : undefined;

    bg.on('pointerdown', () => this.handleBuildAction(playerId, action, bg));
    bg.on('pointerover', () => { bg.setFillStyle(0x333322, 0.9); this.showTooltip(tooltip, x, y, playerId); });
    bg.on('pointerout', () => { bg.setFillStyle(0x222211, 0.85); this.hideTooltip(playerId); });
    this.buildActionButtons.push({ bg, labelText, statusText, keyText, clockGfx, action, playerId });
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
    }).setOrigin(0.5).setVisible(!this._mobile);

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

  private handleResearchNode(playerId: 0 | 1, node: ResearchNodeDef, btn?: Phaser.GameObjects.Rectangle): void {
    if (this.viewModel.gameOver) return;
    const player = this.viewModel.players[playerId];
    const cost = node.isPath ? player.getPathCost(node.id) : player.getUnlockCost(node.id);
    if (this.viewModel.purchaseResearchNode(playerId, node.id, node.isPath, node.durationMs)) {
      if (btn) this.tweens.add({ targets: btn, scaleX: 1.15, scaleY: 1.15, duration: 80, yoyo: true, ease: 'Quad.easeOut' });
      this.showGoldPopup(playerId, `-$${cost}`);
      this.renderMenuForPlayer(playerId);
    } else {
      if (btn) this.tweens.add({ targets: btn, x: btn.x + 3, duration: 40, yoyo: true, repeat: 2, ease: 'Sine.inOut' });
    }
  }

  private handleConstruct(playerId: 0 | 1, towerType: TowerType, btn?: Phaser.GameObjects.Rectangle): void {
    if (this.viewModel.gameOver) return;
    this.constructionMenuState[playerId] = {
      ...this.constructionMenuState[playerId],
      selectedTowerType: towerType,
    };
    const player = this.viewModel.players[playerId];
    if (!player.hasResearched(towerType)) {
      if (btn) this.tweens.add({ targets: btn, x: btn.x + 3, duration: 40, yoyo: true, repeat: 2, ease: 'Sine.inOut' });
      return;
    }
    this.constructionMenuState[playerId] = selectConstructionTower(this.constructionMenuState[playerId], towerType);
    if (btn) this.tweens.add({ targets: btn, scaleX: 1.15, scaleY: 1.15, duration: 80, yoyo: true, ease: 'Quad.easeOut' });
    this.renderMenuForPlayer(playerId);
  }

  private handleBuildAction(playerId: 0 | 1, action: BuildAction, btn?: Phaser.GameObjects.Rectangle): void {
    if (this.viewModel.gameOver) return;
    if (action === 'buildPrev' || action === 'buildNext') {
      const direction = action === 'buildPrev' ? -1 : 1;
      this.handleBuildSiteCycle(playerId, direction);
      if (btn) this.tweens.add({ targets: btn, scaleX: 1.08, scaleY: 1.08, duration: 60, yoyo: true, ease: 'Quad.easeOut' });
      return;
    }

    const selectedSite = this.getSelectedBuildSite(playerId);
    if (!selectedSite) {
      if (btn) this.tweens.add({ targets: btn, x: btn.x + 3, duration: 40, yoyo: true, repeat: 2, ease: 'Sine.inOut' });
      return;
    }

    const towerType = this.constructionMenuState[playerId].selectedTowerType;
    const cost = this.viewModel.players[playerId].getConstructionCost(towerType);
    if (this.viewModel.constructTower(playerId, towerType, selectedSite.id)) {
      if (btn) this.tweens.add({ targets: btn, scaleX: 1.15, scaleY: 1.15, duration: 80, yoyo: true, ease: 'Quad.easeOut' });
      this.showGoldPopup(playerId, `-$${cost}`);
    } else {
      if (btn) this.tweens.add({ targets: btn, x: btn.x + 3, duration: 40, yoyo: true, repeat: 2, ease: 'Sine.inOut' });
    }
  }

  private handleBuildSiteCycle(playerId: 0 | 1, direction: -1 | 1): void {
    const eligibleSites = this.viewModel.getEligibleTowerSites(playerId);
    if (eligibleSites.length === 0) return;
    const currentSiteId = this.selectedBuildSiteId[playerId];
    const currentIndex = Math.max(0, eligibleSites.findIndex((site) => site.id === currentSiteId));
    const nextIndex = ((currentIndex + direction) % eligibleSites.length + eligibleSites.length) % eligibleSites.length;
    this.selectedBuildSiteId[playerId] = eligibleSites[nextIndex].id;
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
      const hovered = this.hoveredUpgradeBtn[playerId];
      if (hovered && hovered.type === type) {
        this.showTooltip(
          this.buildUpgradeTooltip(type, this.viewModel.players[playerId]),
          hovered.x, hovered.y, playerId,
        );
      }
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
    if (this._mobile) return;
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      const key = event.key;

      // Handle speed control (keys 1, 2, 3)
      if (key === '1' || key === '2' || key === '3') {
        const speed = parseInt(key, 10);
        if (this.viewModel.setDebugSpeedMultiplier) {
          this.viewModel.setDebugSpeedMultiplier(speed);
          for (const btn of this.speedButtons) {
            if (!btn.label?.scene) continue;
            if (btn.speed === speed) {
              btn.bg.setFillStyle(0x222244, 0.95);
              btn.bg.setStrokeStyle(2, 0x00ddff, 0.9);
              btn.label.setColor('#00ddff');
            } else {
              btn.bg.setFillStyle(0x111122, 0.85);
              btn.bg.setStrokeStyle(2, 0x666666, 0.6);
              btn.label.setColor('#aaaaaa');
            }
          }
        }
        return;
      }

      this.dispatchKeyForPlayer(0, key, event);
      if (this.viewModel.mode === GAME_MODE.PVP) {
        this.dispatchKeyForPlayer(1, key, event);
      }
    });
  }

  private dispatchKeyForPlayer(playerId: 0 | 1, key: string, event: KeyboardEvent): void {
    const result = resolveKeyPress(
      key,
      playerId,
      this.activeCategory[playerId],
      this.activeBuildSubmenu[playerId],
      this.constructionMenuState[playerId].siteSelectionActive,
    );
    if (!result) return;

    switch (result.type) {
      case 'back':
        event.preventDefault();
        if (this.activeCategory[playerId] === 'construction' && this.constructionMenuState[playerId].siteSelectionActive) {
          this.constructionMenuState[playerId] = backFromConstructionState(this.constructionMenuState[playerId]);
        } else if (this.activeCategory[playerId] === 'construction' && this.activeBuildSubmenu[playerId] !== null) {
          this.activeBuildSubmenu[playerId] = null;
        } else {
          this.activeCategory[playerId] = null;
          this.activeBuildSubmenu[playerId] = null;
        }
        this.renderMenuForPlayer(playerId);
        break;
      case 'navigate':
        this.activeCategory[playerId] = result.category;
        this.activeBuildSubmenu[playerId] = null;
        this.renderMenuForPlayer(playerId);
        break;
      case 'navigateBuildSubmenu':
        this.activeBuildSubmenu[playerId] = result.buildSubmenu;
        this.renderMenuForPlayer(playerId);
        break;
      case 'upgrade': {
        const btn = this.buttons.find(b => b.playerId === playerId && b.type === result.upgradeType);
        this.handleUpgrade(playerId, result.upgradeType, btn?.bg);
        break;
      }
      case 'research':
        // Legacy case — no longer reached since research items are dynamic
        break;
      case 'researchKey': {
        const player = this.viewModel.players[playerId];
        const nodes = getVisibleResearchNodes(player);
        const keyProp = playerId === 0 ? 'p1Key' : 'p2Key';
        const node = nodes.find(n => n[keyProp] === result.key);
        if (node) {
          const btn = this.researchButtons.find(b => b.playerId === playerId && b.node.id === node.id);
          this.handleResearchNode(playerId, node, btn?.bg);
        }
        break;
      }
      case 'construct':
        this.handleConstruct(playerId, result.towerType);
        break;
      case 'action':
        if (result.action === 'nuke') {
          const nukeBtn = this.nukeButtons.find(b => b.playerId === playerId);
          this.handleNuke(playerId, nukeBtn?.bg);
        } else if (result.action === 'buildPrev' || result.action === 'buildNext' || result.action === 'buildSelected') {
          const buildBtn = this.buildActionButtons.find(b => b.playerId === playerId && b.action === result.action);
          this.handleBuildAction(playerId, result.action, buildBtn?.bg);
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

  showTerritoryIncomePopup(playerId: 0 | 1, amount: number): void {
    this.showMoneyPopup(playerId, `+$${amount} territory`, '#88ff44');
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

  // ── Clock overlay (shared by all button types) ────────────────────

  private drawClockOverlay(gfx: Phaser.GameObjects.Graphics, cx: number, cy: number, w: number, h: number, progress: number): void {
    gfx.clear();
    if (progress >= 1) return;

    const hw = w / 2, hh = h / 2;
    const startAngle = -Math.PI / 2;

    const edgePt = (angle: number): [number, number] => {
      const dx = Math.cos(angle), dy = Math.sin(angle);
      const tx = dx !== 0 ? hw / Math.abs(dx) : Infinity;
      const ty = dy !== 0 ? hh / Math.abs(dy) : Infinity;
      const t = Math.min(tx, ty);
      return [cx + dx * t, cy + dy * t];
    };

    const normCW = (a: number) =>
      ((a - startAngle) % (2 * Math.PI) + 2 * Math.PI) % (2 * Math.PI);

    gfx.fillStyle(0x000000, 0.75);

    if (progress <= 0) {
      gfx.fillRect(cx - hw, cy - hh, w, h);
    } else {
      const progressAngle = startAngle + progress * 2 * Math.PI;
      const progressCW = normCW(progressAngle);
      const corners: [number, number][] = [
        [cx + hw, cy - hh], [cx + hw, cy + hh],
        [cx - hw, cy + hh], [cx - hw, cy - hh],
      ];
      const [px, py] = edgePt(progressAngle);
      const [sx, sy] = edgePt(startAngle);
      gfx.beginPath();
      gfx.moveTo(cx, cy);
      gfx.lineTo(px, py);
      for (const corner of corners) {
        if (normCW(Math.atan2(corner[1] - cy, corner[0] - cx)) > progressCW)
          gfx.lineTo(corner[0], corner[1]);
      }
      gfx.lineTo(sx, sy);
      gfx.closePath();
      gfx.fillPath();

      gfx.lineStyle(2, 0xffffff, 0.9);
      gfx.beginPath();
      gfx.moveTo(cx, cy);
      gfx.lineTo(px, py);
      gfx.strokePath();
    }
  }

  // ── Update loop ────────────────────────────────────────────────────

  update(): void {
    if (!this.viewModel.players) return;

    const currentSpeed = this.viewModel.debugSpeedMultiplier ?? 1;
    for (const { bg, label, speed } of this.speedButtons) {
      if (!label?.scene) continue;
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

    if (DEBUG_MODE && !this.debugMenuCollapsed) {
      this.updateEverythingCheapToggle();
    }

    const [p1, p2] = this.viewModel.players;

    const barX = CONFIG.UI_GAP * 2.5;
    const barY = CONFIG.UI_GAP * 2;
    this.drawHPBar(this.p1HPBar, barX, barY, CONFIG.UI_BAR_WIDTH, CONFIG.UI_BAR_HEIGHT, p1.baseHP, CONFIG.BASE_HP, CONFIG.PLAYER1_COLOR);
    this.drawHPBar(this.p2HPBar, CONFIG.GAME_WIDTH - barX - CONFIG.UI_BAR_WIDTH, barY, CONFIG.UI_BAR_WIDTH, CONFIG.UI_BAR_HEIGHT, p2.baseHP, CONFIG.BASE_HP, CONFIG.PLAYER2_COLOR);

    this.p1HPText.setText(`${p1.baseHP}/${CONFIG.BASE_HP}`);
    this.p2HPText.setText(`${p2.baseHP}/${CONFIG.BASE_HP}`);

    this.p1GoldText.setText(`Gold: $${p1.gold}  Kills: ${p1.kills}`);
    const p2Prefix = this.viewModel.mode === GAME_MODE.AI ? 'AI ' : '';
    this.p2GoldText.setText(`${p2Prefix}Gold: $${p2.gold}  Kills: ${p2.kills}`);

    const p1Count = this.viewModel.getParticleCount(0);
    const p2Count = this.viewModel.getParticleCount(1);
    this.p1StatsText.setText(`HP:${p1.particleHealth.toFixed(1)} ATK:${p1.particleAttack.toFixed(1)} RAD:${p1.particleRadius.toFixed(1)} VEL:${p1.particleSpeed.toFixed(1)} DEF:${Math.round(p1.particleDefense * 100)}% INT:${(p1.goldInterestRate * 100).toFixed(2)}% Units:${p1Count}/${p1.maxParticles}`);
    this.p2StatsText.setText(`HP:${p2.particleHealth.toFixed(1)} ATK:${p2.particleAttack.toFixed(1)} RAD:${p2.particleRadius.toFixed(1)} VEL:${p2.particleSpeed.toFixed(1)} DEF:${Math.round(p2.particleDefense * 100)}% INT:${(p2.goldInterestRate * 100).toFixed(2)}% Units:${p2Count}/${p2.maxParticles}`);

    const gameTimeMs = this.viewModel.gameTimeMs;

    for (const btn of this.buttons) {
      const player = this.viewModel.players[btn.playerId];
      const progress = player.getUpgradeProgress(btn.type, gameTimeMs);
      if (progress >= 0 && progress < 1) {
        btn.bg.setAlpha(0.8);
        btn.costText.setText(`${Math.ceil(player.getUpgradeRemainingMs(btn.type, gameTimeMs) / 1000)}s`);
        btn.costText.setColor('#ffffff');
        this.drawClockOverlay(btn.clockGfx, btn.bg.x, btn.bg.y, btn.bg.width, btn.bg.height, progress);
      } else {
        btn.clockGfx.clear();
        const canAfford = player.canAfford(btn.type);
        const isAtMax = player.isUpgradeAtMax(btn.type);
        btn.bg.setAlpha(canAfford && !isAtMax ? 1 : 0.4);
        btn.costText.setText(`$${player.getUpgradeCost(btn.type)}`);
        btn.costText.setColor('#ffd700');
      }
    }

    for (const btn of this.researchButtons) {
      const player = this.viewModel.players[btn.playerId];
      const { node } = btn;
      const progress = player.getResearchProgress(node.id, gameTimeMs);
      if (progress >= 0 && progress < 1) {
        btn.bg.setAlpha(0.8);
        btn.costText.setText(`${Math.ceil(player.getResearchRemainingMs(node.id, gameTimeMs) / 1000)}s`);
        btn.costText.setColor('#ffffff');
        this.drawClockOverlay(btn.clockGfx, btn.bg.x, btn.bg.y, btn.bg.width, btn.bg.height, progress);
      } else {
        btn.clockGfx.clear();
        if (node.isPath) {
          const level = player.getPathLevel(node.id);
          const maxed = level >= node.maxLevel;
          const canBuy = !maxed && player.canPurchasePath(node.id);
          btn.bg.setAlpha(maxed ? 0.3 : canBuy ? 1 : 0.4);
          btn.costText.setText(maxed ? `MAX (${level}/${node.maxLevel})` : `Lv${level + 1} $${player.getPathCost(node.id)}`);
          btn.costText.setColor(maxed ? '#66ff66' : '#ffd700');
        } else {
          const done = player.hasUnlocked(node.id);
          const canBuy = !done && player.canPurchaseUnlock(node.id);
          btn.bg.setAlpha(done ? 0.3 : canBuy ? 1 : 0.4);
          btn.costText.setText(done ? 'DONE' : `$${player.getUnlockCost(node.id)}`);
          btn.costText.setColor(done ? '#66ff66' : '#ffd700');
        }
      }
    }

    for (const btn of this.constructButtons) {
      const player = this.viewModel.players[btn.playerId];
      const researched = player.hasResearched(btn.towerType);
      const pending = this.viewModel.getPendingConstruction(btn.playerId);
      const isConstructing = pending?.towerType === btn.towerType;
      if (isConstructing && pending) {
        btn.bg.setAlpha(0.8);
        btn.bg.setStrokeStyle(2, btn.playerId === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR, 0.8);
        btn.costText.setText(`${Math.ceil(pending.remainingMs / 1000)}s`);
        btn.costText.setColor('#ffffff');
        this.drawClockOverlay(btn.clockGfx, btn.bg.x, btn.bg.y, btn.bg.width, btn.bg.height, pending.progress);
      } else {
        btn.clockGfx.clear();
        const selected = this.constructionMenuState[btn.playerId].selectedTowerType === btn.towerType;
        btn.bg.setAlpha(researched ? (selected ? 1 : 0.7) : 0.4);
        btn.bg.setStrokeStyle(2, selected ? 0xffffff : (btn.playerId === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR), selected ? 0.9 : 0.5);
        btn.costText.setText(researched ? `$${player.getConstructionCost(btn.towerType)}` : 'LOCKED');
        btn.costText.setColor(researched ? '#ffd700' : '#666666');
      }
    }

    for (const btn of this.nukeButtons) {
      const player = this.viewModel.players[btn.playerId];
      const nukeProgress = player.getResearchProgress('unlock_nuke', gameTimeMs);
      if (nukeProgress >= 0 && nukeProgress < 1) {
        // Nuke research in progress
        btn.clockGfx.clear();
        btn.bg.setAlpha(0.8);
        btn.statusText.setText(`${Math.ceil(player.getResearchRemainingMs('unlock_nuke', gameTimeMs) / 1000)}s`);
        btn.statusText.setColor('#ffffff');
        this.drawClockOverlay(btn.clockGfx, btn.bg.x, btn.bg.y, btn.bg.width, btn.bg.height, nukeProgress);
      } else if (!player.hasUnlocked('unlock_nuke')) {
        btn.clockGfx.clear();
        btn.bg.setAlpha(0.4);
        btn.statusText.setText('LOCKED');
        btn.statusText.setColor('#666666');
      } else {
        const remainingMs = player.getNukeCooldownRemainingMs(gameTimeMs);
        if (remainingMs <= 0) {
          btn.clockGfx.clear();
          btn.bg.setAlpha(1);
          btn.statusText.setText('READY');
          btn.statusText.setColor('#66ff66');
        } else {
          const progress = 1 - remainingMs / CONFIG.NUCLEAR_COOLDOWN_MS;
          btn.bg.setAlpha(0.6);
          const mins = Math.floor(remainingMs / 60000);
          const secs = Math.floor((remainingMs % 60000) / 1000);
          btn.statusText.setText(mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`);
          btn.statusText.setColor('#ff6666');
          this.drawClockOverlay(btn.clockGfx, btn.bg.x, btn.bg.y, btn.bg.width, btn.bg.height, progress);
        }
      }
    }

    for (const btn of this.buildActionButtons) {
      const selectedSite = this.getSelectedBuildSite(btn.playerId);
      const player = this.viewModel.players[btn.playerId];
      const towerType = this.constructionMenuState[btn.playerId].selectedTowerType;
      const pending = this.viewModel.getPendingConstruction(btn.playerId);

      if (btn.action === 'buildSelected' && btn.clockGfx) {
        if (pending) {
          btn.bg.setAlpha(0.8);
          btn.statusText.setText(`${Math.ceil(pending.remainingMs / 1000)}s`);
          btn.statusText.setColor('#ffffff');
          this.drawClockOverlay(btn.clockGfx, btn.bg.x, btn.bg.y, btn.bg.width, btn.bg.height, pending.progress);
        } else {
          btn.clockGfx.clear();
          const canBuild = selectedSite !== null
            && player.hasResearched(towerType)
            && player.canAffordConstruction(towerType)
            && this.viewModel.getTowers(btn.playerId).length < CONFIG.TOWER_MAX_PER_PLAYER;
          btn.bg.setAlpha(canBuild ? 1 : 0.4);
          if (!selectedSite) {
            btn.statusText.setText('NO SITE');
            btn.statusText.setColor('#666666');
          } else {
            btn.statusText.setText(`SITE ${selectedSite.id + 1}`);
            btn.statusText.setColor(canBuild ? '#66ff66' : '#ffaa33');
          }
        }
      } else {
        btn.bg.setAlpha(selectedSite ? 1 : 0.4);
        btn.statusText.setText(selectedSite ? `${selectedSite.id + 1}/6` : 'NO SITE');
        btn.statusText.setColor(selectedSite ? '#cccccc' : '#666666');
      }
    }

    this.updatePanelInfoText(0);
    this.updatePanelInfoText(1);

    if (this.viewModel.towerSelectionForRender) {
      this.viewModel.towerSelectionForRender[0] = {
        active: this.activeCategory[0] === 'towers',
        selectedIndex: this.selectedTowerIndex[0],
        selectedBuildSiteId: this.activeCategory[0] === 'construction' && this.constructionMenuState[0].siteSelectionActive ? this.getSelectedBuildSite(0)?.id : undefined,
      };
      this.viewModel.towerSelectionForRender[1] = {
        active: this.activeCategory[1] === 'towers',
        selectedIndex: this.selectedTowerIndex[1],
        selectedBuildSiteId: this.activeCategory[1] === 'construction' && this.constructionMenuState[1].siteSelectionActive ? this.getSelectedBuildSite(1)?.id : undefined,
      };
    }
  }

  private getSelectedBuildSite(playerId: 0 | 1): TowerSite | null {
    const eligibleSites = this.viewModel.getEligibleTowerSites(playerId);
    if (eligibleSites.length === 0) return null;
    const selectedSiteId = this.selectedBuildSiteId[playerId];
    const selected = eligibleSites.find((site) => site.id === selectedSiteId) ?? eligibleSites[0];
    this.selectedBuildSiteId[playerId] = selected.id;
    return selected;
  }

  private updatePanelInfoText(playerId: 0 | 1): void {
    if (this.activeCategory[playerId] === 'construction') {
      this.updateBuildInfoText(playerId);
      return;
    }
    this.updateTowerInfoText(playerId);
  }

  private updateBuildInfoText(playerId: 0 | 1): void {
    const info = this.towerInfoText[playerId];
    if (!info) return;

    const towerType = this.constructionMenuState[playerId].selectedTowerType;
    const selectedSite = this.getSelectedBuildSite(playerId);
    const player = this.viewModel.players[playerId];
    const cost = player.getConstructionCost(towerType);
    const eligibleCount = this.viewModel.getEligibleTowerSites(playerId).length;

    if (!this.constructionMenuState[playerId].siteSelectionActive) {
      info.setText('Choose LASER or WEAKNESS to select a tower type');
      return;
    }

    if (!player.hasResearched(towerType)) {
      info.setText(`${towerType.toUpperCase()} selected\nResearch required before building\nEligible sites: ${eligibleCount}/6`);
      return;
    }

    if (!selectedSite) {
      info.setText(`${towerType.toUpperCase()} selected\nNo eligible sites\nOwn all adjacent open cells around a pad`);
      return;
    }

    const canAfford = player.canAffordConstruction(towerType);
    info.setText(
      `${towerType.toUpperCase()} selected  Cost: $${cost}${canAfford ? '' : ' (need gold)'}\n` +
      `Selected site ${selectedSite.id + 1}/6  Eligible: ${eligibleCount}/6\n` +
      'Cycle sites, then BUILD'
    );
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
    if (tower.towerType === TOWER_TYPE.LASER) {
      const t = tower as LaserTowerParticle;
      const nxt = getLaserStatsAtLevel(t.level + 1);
      statsLine = `DMG:${t.damage}->${nxt.damage}  SPD:${t.attackSpeed.toFixed(1)}->${nxt.attackSpeed.toFixed(1)}`;
    } else {
      const t = tower as WeaknessTowerParticle;
      const nxt = getWeaknessStatsAtLevel(t.level + 1);
      statsLine = `DRN:${t.drainDps.toFixed(1)}->${nxt.drainDps.toFixed(1)}  ATK-:${Math.round(t.attackReduction * 100)}%->${Math.round(nxt.attackReduction * 100)}%`;
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
    const menuH = 250;
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

    // Everything cheap toggle
    const toggleW = 180;
    const toggleH = 30;
    const toggleX = centerX;
    const toggleY = topY + 140;

    this.debugEverythingCheapToggle = this.add.rectangle(toggleX, toggleY, toggleW, toggleH, 0x333333, 0.9)
      .setStrokeStyle(2, 0x00ff00, 0.8)
      .setInteractive({ useHandCursor: true })
      .setDepth(101)
      .setVisible(false);

    this.debugEverythingCheapText = this.add.text(toggleX, toggleY, 'Everything cheap? OFF', {
      fontSize: `${CONFIG.UI_FONT_SMALL}px`,
      color: '#ffffff',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setDepth(102).setVisible(false);

    this.debugEverythingCheapToggle.on('pointerdown', () => {
      if (this.debugMenuCollapsed) return;
      const current = this.viewModel.debugEverythingCheap ?? false;
      const newValue = !current;
      if (this.viewModel.setDebugEverythingCheap) {
        this.viewModel.setDebugEverythingCheap(newValue);
      }
      setDebugEverythingCheap(newValue);
      this.updateEverythingCheapToggle();
    });

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
    this.updateEverythingCheapToggle();
    this.updateDebugMenuVisibility();
  }

  private updateEverythingCheapToggle(): void {
    if (!this.debugEverythingCheapToggle || !this.debugEverythingCheapText) return;
    const enabled = this.viewModel.debugEverythingCheap ?? false;
    this.debugEverythingCheapToggle.setFillStyle(enabled ? 0x00ff00 : 0x333333, enabled ? 0.6 : 0.9);
    this.debugEverythingCheapText.setText(`Everything cheap? ${enabled ? 'ON' : 'OFF'}`);
  }

  private updateDebugMenuVisibility(): void {
    if (!this.debugMenuBg || !this.debugMenuToggle || !this.debugSpeedText || !this.debugSpeedSlider) return;

    const topY = 40;
    const collapsedH = 40;
    const menuH = 250;

    if (this.debugMenuCollapsed) {
      this.debugMenuBg.setSize(300, 40);
      this.debugMenuBg.setPosition(CONFIG.GAME_WIDTH / 2, topY + collapsedH / 2);
      this.debugMenuToggle.setPosition(CONFIG.GAME_WIDTH / 2, topY + collapsedH / 2);
      this.debugMenuToggle.setText('DEBUG');
      this.debugSpeedText.setVisible(false);
      this.debugSpeedSlider.setVisible(false);
      if (this.debugSpeedSliderFill) this.debugSpeedSliderFill.setVisible(false);
      if (this.debugSpeedSliderHandle) this.debugSpeedSliderHandle.setVisible(false);
      if (this.debugEverythingCheapToggle) this.debugEverythingCheapToggle.setVisible(false);
      if (this.debugEverythingCheapText) this.debugEverythingCheapText.setVisible(false);
    } else {
      this.debugMenuBg.setSize(300, menuH);
      this.debugMenuBg.setPosition(CONFIG.GAME_WIDTH / 2, topY + menuH / 2);
      this.debugMenuToggle.setPosition(CONFIG.GAME_WIDTH / 2, topY + collapsedH / 2);
      this.debugMenuToggle.setText('DEBUG');
      this.debugSpeedText.setVisible(true);
      this.debugSpeedSlider.setVisible(true);
      if (this.debugSpeedSliderFill) this.debugSpeedSliderFill.setVisible(true);
      if (this.debugSpeedSliderHandle) this.debugSpeedSliderHandle.setVisible(true);
      if (this.debugEverythingCheapToggle) this.debugEverythingCheapToggle.setVisible(true);
      if (this.debugEverythingCheapText) this.debugEverythingCheapText.setVisible(true);
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
