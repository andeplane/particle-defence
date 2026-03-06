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

    const btnW = 180;
    const btnH = 44;
    const gap = 12;
    const colGap = 160;
    const leftX = centerX - colGap;
    const rightX = centerX + colGap;
    const rowH = btnH + gap;

    const mapButtons: { x: number; y: number; label: string; color: number; type: GridType }[] = [
      { x: leftX, y: centerY - 20, label: 'Random', color: 0x88aa88, type: 'random' },
      { x: rightX, y: centerY - 20, label: 'Maze', color: 0xaa88aa, type: 'maze' },
      { x: leftX, y: centerY - 20 + rowH, label: 'Hourglass', color: 0xaa8844, type: 'hourglass' },
      { x: rightX, y: centerY - 20 + rowH, label: 'Lanes', color: 0x4488aa, type: 'lanes' },
      { x: leftX, y: centerY - 20 + 2 * rowH, label: 'Islands', color: 0x44aa88, type: 'islands' },
      { x: rightX, y: centerY - 20 + 2 * rowH, label: 'Rooms', color: 0x8844aa, type: 'rooms' },
      { x: leftX, y: centerY - 20 + 3 * rowH, label: 'Fortress', color: 0xaa4444, type: 'fortress' },
    ];

    for (const { x, y, label, color, type } of mapButtons) {
      createMenuButton(this, x, y, btnW, btnH, label, color, () => this.startGame(type));
    }

    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      const keyToType: Record<string, GridType> = {
        '1': 'random',
        '2': 'maze',
        '3': 'hourglass',
        '4': 'lanes',
        '5': 'islands',
        '6': 'rooms',
        '7': 'fortress',
      };
      const gridType = keyToType[key];
      if (gridType) this.startGame(gridType);
    });

    this.add.text(centerX, centerY + 180, '[1-7] Select map', {
      fontSize: `${CONFIG.UI_FONT_SMALL}px`,
      color: '#666666',
      fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  private startGame(gridType: GridType): void {
    this.scene.start('GameScene', { mode: this.mode, gridType });
  }
}
