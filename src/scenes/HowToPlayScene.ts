import Phaser from 'phaser';
import { CONFIG } from '../config';
import { isMobile } from '../mobile';
import { TABS, getTabContent, type TabId, type ContentSection } from './howToPlayData';

const TAB_BAR_H = 52;
const TAB_BTN_W = 160;
const TAB_BTN_H = 38;
const TAB_GAP = 12;

const CONTENT_PAD_X = 80;
const CONTENT_START_Y = TAB_BAR_H + 24;
const SECTION_GAP = 28;
const LINE_HEIGHT = 22;
const HEADER_SIZE = 22;
const BODY_SIZE = 16;

const SCROLL_SPEED = 0.5;

export class HowToPlayScene extends Phaser.Scene {
  private activeTab: TabId = 'overview';
  private contentGroup: Phaser.GameObjects.Group | null = null;
  private tabButtons: { bg: Phaser.GameObjects.Rectangle; label: Phaser.GameObjects.Text; tabId: TabId }[] = [];
  private wheelHandler?: (
    pointer: Phaser.Input.Pointer,
    currentlyOver: Phaser.GameObjects.GameObject[],
    dx: number,
    dy: number,
    dz: number,
  ) => void;
  private maxScrollY = 0;

  constructor() {
    super({ key: 'HowToPlayScene' });
  }

  create(): void {
    this.cameras.main.setBackgroundColor(CONFIG.BG_COLOR);
    this.cameras.main.fadeIn(300, 0, 0, 0);

    this.drawTabBar();
    this.drawBackButton();
    this.renderContent();
    this.setupScroll();
    this.setupKeyboard();
  }

  shutdown(): void {
    if (this.wheelHandler) {
      this.input.off('wheel', this.wheelHandler);
      this.wheelHandler = undefined;
    }
  }

  private drawTabBar(): void {
    const totalW = TABS.length * TAB_BTN_W + (TABS.length - 1) * TAB_GAP;
    const startX = (CONFIG.GAME_WIDTH - totalW) / 2 + TAB_BTN_W / 2;
    const y = TAB_BAR_H / 2;

    this.tabButtons = [];

    for (let i = 0; i < TABS.length; i++) {
      const tab = TABS[i];
      const x = startX + i * (TAB_BTN_W + TAB_GAP);

      const bg = this.add.rectangle(x, y, TAB_BTN_W, TAB_BTN_H, 0x111122, 0.9)
        .setStrokeStyle(2, CONFIG.PLAYER1_COLOR, 0.5)
        .setInteractive({ useHandCursor: true })
        .setScrollFactor(0)
        .setDepth(10);

      const label = this.add.text(x, y, tab.label, {
        fontSize: `${BODY_SIZE}px`,
        color: '#aaaaaa',
        fontFamily: 'monospace',
        fontStyle: 'bold',
      }).setOrigin(0.5).setScrollFactor(0).setDepth(10);

      bg.on('pointerdown', () => this.switchTab(tab.id));
      bg.on('pointerover', () => {
        if (this.activeTab !== tab.id) {
          bg.setFillStyle(0x222244, 0.95);
        }
      });
      bg.on('pointerout', () => {
        if (this.activeTab !== tab.id) {
          bg.setFillStyle(0x111122, 0.9);
        }
      });

      this.tabButtons.push({ bg, label, tabId: tab.id });
    }

    this.updateTabHighlight();
  }

  private updateTabHighlight(): void {
    for (const btn of this.tabButtons) {
      const isActive = btn.tabId === this.activeTab;
      btn.bg.setFillStyle(isActive ? 0x222244 : 0x111122, isActive ? 0.95 : 0.9);
      btn.bg.setStrokeStyle(2, CONFIG.PLAYER1_COLOR, isActive ? 0.9 : 0.4);
      btn.label.setColor(isActive ? '#00ddff' : '#aaaaaa');
    }
  }

  private drawBackButton(): void {
    const label = isMobile() ? 'Back to Menu' : '[ ESC ] Back to Menu';
    const btn = this.add.text(CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT - 30, label, {
      fontSize: `${BODY_SIZE}px`,
      color: '#666666',
      fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true }).setScrollFactor(0).setDepth(10);

    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout', () => btn.setColor('#666666'));
    btn.on('pointerdown', () => this.scene.start('MenuScene'));
  }

  private setupKeyboard(): void {
    if (isMobile()) return;
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        this.scene.start('MenuScene');
        return;
      }
      const tabIndex = parseInt(event.key) - 1;
      if (tabIndex >= 0 && tabIndex < TABS.length) {
        this.switchTab(TABS[tabIndex].id);
      }
    });
  }

  private switchTab(tabId: TabId): void {
    if (tabId === this.activeTab) return;
    this.activeTab = tabId;
    this.updateTabHighlight();
    this.renderContent();
    this.cameras.main.scrollY = 0;
    this.updateScrollBounds();
  }

  private renderContent(): void {
    if (this.contentGroup) {
      this.contentGroup.clear(true, true);
    }
    this.contentGroup = this.add.group();

    const sections = getTabContent(this.activeTab);
    let y = CONTENT_START_Y;

    for (const section of sections) {
      y = this.renderSection(section, y);
      y += SECTION_GAP;
    }

    this.maxScrollY = Math.max(0, y - CONFIG.GAME_HEIGHT + 60);
    this.updateScrollBounds();
  }

  private renderSection(section: ContentSection, startY: number): number {
    let y = startY;

    const header = this.add.text(CONTENT_PAD_X, y, section.title, {
      fontSize: `${HEADER_SIZE}px`,
      color: CONFIG.PLAYER1_COLOR_STR,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    });
    this.contentGroup!.add(header);
    y += HEADER_SIZE + 8;

    for (const line of section.lines) {
      if (line === '') {
        y += LINE_HEIGHT * 0.4;
        continue;
      }
      const text = this.add.text(CONTENT_PAD_X + 16, y, line, {
        fontSize: `${BODY_SIZE}px`,
        color: '#cccccc',
        fontFamily: 'monospace',
      });
      this.contentGroup!.add(text);
      y += LINE_HEIGHT;
    }

    return y;
  }

  private setupScroll(): void {
    this.wheelHandler = (_pointer, _currentlyOver, _dx, dy) => {
      const cam = this.cameras.main;
      cam.scrollY += dy * SCROLL_SPEED;
      cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, this.maxScrollY);
    };
    this.input.on('wheel', this.wheelHandler);
  }

  private updateScrollBounds(): void {
    if (this.maxScrollY > 0) {
      this.cameras.main.setBounds(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT + this.maxScrollY);
    } else {
      this.cameras.main.setBounds(0, 0, CONFIG.GAME_WIDTH, CONFIG.GAME_HEIGHT);
      this.cameras.main.scrollY = 0;
    }
  }
}
