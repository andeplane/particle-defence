import Phaser from 'phaser';
import { CONFIG } from '../config';

export type GameMode = 'ai' | 'pvp';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: 'MenuScene' });
  }

  create(): void {
    const centerX = CONFIG.GAME_WIDTH / 2;
    const centerY = CONFIG.GAME_HEIGHT / 2;

    // Title
    this.add.text(centerX, centerY - 120, 'TOWER DEFENCE', {
      fontSize: '64px',
      color: CONFIG.PLAYER1_COLOR_STR,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(centerX, centerY - 70, 'Choose mode', {
      fontSize: `${CONFIG.UI_FONT_LARGE + 4}px`,
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const btnW = 280;
    const btnH = 56;
    const gap = 24;

    // 1 Player vs AI button
    this.createButton(
      centerX,
      centerY - 20,
      btnW,
      btnH,
      '1 Player vs AI',
      CONFIG.PLAYER1_COLOR,
      () => this.startGame('ai')
    );

    // 2 Player button
    this.createButton(
      centerX,
      centerY + gap + btnH - 20,
      btnW,
      btnH,
      '2 Player',
      CONFIG.PLAYER2_COLOR,
      () => this.startGame('pvp')
    );

    // Keyboard shortcuts
    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      if (key === '1') this.startGame('ai');
      if (key === '2') this.startGame('pvp');
    });

    this.add.text(centerX, centerY + 120, '[1] vs AI  [2] 2 Player', {
      fontSize: `${CONFIG.UI_FONT_SMALL}px`,
      color: '#666666',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  private createButton(
    x: number,
    y: number,
    w: number,
    h: number,
    label: string,
    color: number,
    onClick: () => void
  ): void {
    const r = (color >> 16) & 0xff;
    const g = (color >> 8) & 0xff;
    const b = color & 0xff;
    const colorStr = `rgb(${r},${g},${b})`;

    const bg = this.add.rectangle(x, y, w, h, 0x111122, 0.9)
      .setStrokeStyle(3, color, 0.6)
      .setInteractive({ useHandCursor: true });

    this.add.text(x, y, label, {
      fontSize: '24px',
      color: colorStr,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    bg.on('pointerdown', onClick);
    bg.on('pointerover', () => {
      bg.setFillStyle(0x222244, 0.95);
      bg.setStrokeStyle(3, color, 0.9);
    });
    bg.on('pointerout', () => {
      bg.setFillStyle(0x111122, 0.9);
      bg.setStrokeStyle(3, color, 0.6);
    });
  }

  private startGame(mode: GameMode): void {
    this.scene.start('GameScene', { mode });
  }
}
