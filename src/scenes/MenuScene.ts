import Phaser from 'phaser';
import { CONFIG } from '../config';
import { isMobile } from '../mobile';
import { createMenuButton } from './createMenuButton';
import { SCENE_KEYS } from './SceneKeys';

export type GameMode = 'ai' | 'pvp';
export const GAME_MODE = {
  AI: 'ai',
  PVP: 'pvp',
} as const satisfies Record<string, GameMode>;

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.MENU });
  }

  create(): void {
    const centerX = CONFIG.GAME_WIDTH / 2;
    const centerY = CONFIG.GAME_HEIGHT / 2;
    const mobile = isMobile();

    this.add.text(centerX, centerY - 120, 'Particle Defender', {
      fontSize: '64px',
      color: CONFIG.PLAYER1_COLOR_STR,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(centerX, centerY - 70, mobile ? 'Tap to start' : 'Choose mode', {
      fontSize: `${CONFIG.UI_FONT_LARGE + 4}px`,
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const btnW = 280;
    const btnH = 56;
    const gap = 24;

    createMenuButton(this, centerX, centerY - 20, btnW, btnH,
      '1 Player vs AI', CONFIG.PLAYER1_COLOR, () => this.startGame(GAME_MODE.AI));

    if (!mobile) {
      createMenuButton(this, centerX, centerY + gap + btnH - 20, btnW, btnH,
        '2 Player', CONFIG.PLAYER2_COLOR, () => this.startGame(GAME_MODE.PVP));
    }

    const howToPlayY = mobile
      ? centerY + gap + btnH - 20
      : centerY + 2 * (gap + btnH) - 20;
    createMenuButton(this, centerX, howToPlayY, btnW, btnH,
      'How to Play', 0x88aa88, () => this.scene.start(SCENE_KEYS.HOW_TO_PLAY));

    if (!mobile) {
      this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
        const key = event.key.toUpperCase();
        if (key === '1') this.startGame(GAME_MODE.AI);
        if (key === '2') this.startGame(GAME_MODE.PVP);
        if (key === 'H' || key === '3') this.scene.start(SCENE_KEYS.HOW_TO_PLAY);
      });

      this.add.text(centerX, centerY + 180, '[1] vs AI  [2] 2 Player  [H] How to Play', {
        fontSize: `${CONFIG.UI_FONT_SMALL}px`,
        color: '#666666',
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    }
  }

  private startGame(mode: GameMode): void {
    this.scene.start(SCENE_KEYS.MAP_SELECT, { mode });
  }
}
