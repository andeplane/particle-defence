import Phaser from 'phaser';
import { trackGameStarted } from '../analytics';
import { CONFIG } from '../config';
import { isMobile } from '../mobile';
import { GAME_MODE, type GameMode } from './MenuScene';
import type { GridType } from '../grid';
import { createMenuBackground } from './MenuBackground';
import { createMenuButton } from './createMenuButton';
import { SCENE_KEYS } from './SceneKeys';

const L = CONFIG.MENU_LAYOUT;

/** Order defines the number key (1..N) shown on each button and used for selection. */
const MAPS: readonly { label: string; type: GridType }[] = [
  { label: 'Random', type: 'random' },
  { label: 'Maze', type: 'maze' },
  { label: 'Hourglass', type: 'hourglass' },
  { label: 'Lanes', type: 'lanes' },
  { label: 'Islands', type: 'islands' },
  { label: 'Rooms', type: 'rooms' },
  { label: 'Fortress', type: 'fortress' },
];

export class MapSelectScene extends Phaser.Scene {
  private mode: GameMode = GAME_MODE.PVP;

  constructor() {
    super({ key: SCENE_KEYS.MAP_SELECT });
  }

  init(data: { mode?: GameMode }): void {
    this.mode = data.mode ?? GAME_MODE.PVP;
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

    const isAI = this.mode === GAME_MODE.AI;
    this.add.text(centerX, L.MODE_LABEL_Y, isAI ? 'Mode: 1 Player vs AI' : 'Mode: 2 Player', {
      fontSize: `${CONFIG.UI_FONT_MED}px`,
      color: isAI ? CONFIG.PLAYER1_COLOR_STR : CONFIG.PLAYER2_COLOR_STR,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    this.add.text(centerX, L.SUBTITLE_Y, 'Choose map', {
      fontSize: `${CONFIG.UI_FONT_LARGE}px`,
      color: L.SUBTITLE_COLOR_STR,
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    const btnW = L.MAP_BTN_WIDTH;
    const btnH = L.MAP_BTN_HEIGHT;
    const rowH = btnH + L.MAP_BTN_GAP;
    const firstRowY = L.FIRST_ROW_TOP_Y + btnH / 2;
    const columnX = [centerX - L.MAP_COLUMN_OFFSET_X, centerX + L.MAP_COLUMN_OFFSET_X];

    let lastY = firstRowY;
    MAPS.forEach(({ label, type }, i) => {
      const x = columnX[i % L.MAP_COLUMNS];
      const y = firstRowY + Math.floor(i / L.MAP_COLUMNS) * rowH;
      lastY = y;
      const hint = mobile ? undefined : String(i + 1);
      createMenuButton(this, x, y, btnW, btnH, label, L.MAP_COLORS[type], () => this.startGame(type), hint);
    });

    if (!mobile) {
      this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
        const idx = Number.parseInt(event.key, 10) - 1;
        const map = MAPS[idx];
        if (map) this.startGame(map.type);
      });

      this.add.text(centerX, lastY + btnH / 2 + L.HINT_OFFSET_Y, 'Press the number shown on a map', {
        fontSize: `${CONFIG.UI_FONT_SMALL}px`,
        color: L.HINT_COLOR_STR,
        fontFamily: 'monospace',
      }).setOrigin(0.5);
    }
  }

  private startGame(gridType: GridType): void {
    trackGameStarted(this.mode, gridType);
    this.scene.start(SCENE_KEYS.GAME, { mode: this.mode, gridType });
  }
}
