import Phaser from 'phaser';
import { CONFIG } from '../config';
import { trackHowToPlayClicked } from '../analytics';
import { isMobile } from '../mobile';
import { createMenuBackground } from './MenuBackground';
import { createMenuButton } from './createMenuButton';
import { SCENE_KEYS } from './SceneKeys';

export type GameMode = 'ai' | 'pvp';
export const GAME_MODE = {
  AI: 'ai',
  PVP: 'pvp',
} as const satisfies Record<string, GameMode>;

const L = CONFIG.MENU_LAYOUT;
const KEY_AI = '1';
const KEY_PVP = '2';
const KEY_HOW_TO_PLAY = 'H';
const KEY_HOW_TO_PLAY_ALT = '3';

export class MenuScene extends Phaser.Scene {
  constructor() {
    super({ key: SCENE_KEYS.MENU });
  }

  create(): void {
    const centerX = CONFIG.GAME_WIDTH / 2;
    const mobile = isMobile();
    createMenuBackground(this);

    this.add.text(centerX, L.TITLE_Y, 'Particle Defender', {
      fontSize: `${Math.round(L.TITLE_FONT)}px`,
      color: CONFIG.PLAYER1_COLOR_STR,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(centerX, L.SUBTITLE_Y, mobile ? 'Tap to start' : 'Choose mode', {
      fontSize: `${CONFIG.UI_FONT_LARGE}px`,
      color: L.SUBTITLE_COLOR_STR,
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const btnW = L.MODE_BTN_WIDTH;
    const btnH = L.MODE_BTN_HEIGHT;
    const rowH = btnH + L.MODE_BTN_GAP;
    const firstY = L.FIRST_ROW_TOP_Y + btnH / 2;
    const hint = (k: string) => (mobile ? undefined : k);

    createMenuButton(this, centerX, firstY, btnW, btnH,
      '1 Player vs AI', CONFIG.PLAYER1_COLOR, () => this.startGame(GAME_MODE.AI), hint(KEY_AI));

    if (!mobile) {
      createMenuButton(this, centerX, firstY + rowH, btnW, btnH,
        '2 Player', CONFIG.PLAYER2_COLOR, () => this.startGame(GAME_MODE.PVP), hint(KEY_PVP));
    }

    const howToPlayY = mobile ? firstY + rowH : firstY + 2 * rowH;
    createMenuButton(this, centerX, howToPlayY, btnW, btnH,
      'How to Play', L.HOW_TO_PLAY_COLOR, () => this.openHowToPlay(), hint(KEY_HOW_TO_PLAY));

    if (!mobile) {
      this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
        const key = event.key.toUpperCase();
        if (key === KEY_AI) this.startGame(GAME_MODE.AI);
        if (key === KEY_PVP) this.startGame(GAME_MODE.PVP);
        if (key === KEY_HOW_TO_PLAY || key === KEY_HOW_TO_PLAY_ALT) this.openHowToPlay();
      });

      this.add.text(centerX, howToPlayY + btnH / 2 + L.HINT_OFFSET_Y, 'Press the key shown on a button', {
        fontSize: `${CONFIG.UI_FONT_SMALL}px`,
        color: L.HINT_COLOR_STR,
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    }
  }

  private openHowToPlay(): void {
    trackHowToPlayClicked();
    this.scene.start(SCENE_KEYS.HOW_TO_PLAY);
  }

  private startGame(mode: GameMode): void {
    this.scene.start(SCENE_KEYS.MAP_SELECT, { mode });
  }
}
