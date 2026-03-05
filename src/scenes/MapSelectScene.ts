import Phaser from 'phaser';
import { CONFIG } from '../config';
import type { GameMode } from './MenuScene';
import type { GridType } from '../grid';
import { createMenuButton } from './createMenuButton';

export class MapSelectScene extends Phaser.Scene {
  private mode: GameMode = 'pvp';

  constructor() {
    super({ key: 'MapSelectScene' });
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data.mode ?? 'pvp';
  }

  create(): void {
    const centerX = CONFIG.GAME_WIDTH / 2;
    const centerY = CONFIG.GAME_HEIGHT / 2;

    this.add.text(centerX, centerY - 120, 'TOWER DEFENCE', {
      fontSize: '64px',
      color: CONFIG.PLAYER1_COLOR_STR,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(centerX, centerY - 70, 'Choose map', {
      fontSize: `${CONFIG.UI_FONT_LARGE + 4}px`,
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const btnW = 280;
    const btnH = 56;
    const gap = 24;

    createMenuButton(this, centerX, centerY - 20, btnW, btnH,
      'Random', 0x88aa88, () => this.startGame('random'));

    createMenuButton(this, centerX, centerY + gap + btnH - 20, btnW, btnH,
      'Maze', 0xaa88aa, () => this.startGame('maze'));

    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      if (key === '1') this.startGame('random');
      if (key === '2') this.startGame('maze');
    });

    this.add.text(centerX, centerY + 120, '[1] Random  [2] Maze', {
      fontSize: `${CONFIG.UI_FONT_SMALL}px`,
      color: '#666666',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  private startGame(gridType: GridType): void {
    this.scene.start('GameScene', { mode: this.mode, gridType });
  }
}
