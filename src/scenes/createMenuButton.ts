import Phaser from 'phaser';
import { CONFIG } from '../config';

const L = CONFIG.MENU_LAYOUT;

/**
 * Bordered menu button with a centred label. `keyHint` (e.g. "1" or "H") is
 * drawn as `[1]` in the bottom-right corner so players see which key to press.
 */
export function createMenuButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  color: number,
  onClick: () => void,
  keyHint?: string,
): Phaser.GameObjects.Rectangle {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const colorStr = `rgb(${r},${g},${b})`;

  const bg = scene.add.rectangle(x, y, w, h, L.BUTTON_FILL, L.BUTTON_FILL_ALPHA)
    .setStrokeStyle(L.BUTTON_STROKE, color, L.BUTTON_STROKE_ALPHA)
    .setInteractive({ useHandCursor: true });

  scene.add.text(x, y, label, {
    fontSize: `${Math.round(L.BUTTON_FONT)}px`,
    color: colorStr,
    fontFamily: 'monospace',
    fontStyle: 'bold',
  }).setOrigin(0.5);

  if (keyHint) {
    scene.add.text(x + w / 2 - L.BUTTON_KEY_INSET_X, y + h / 2 - L.BUTTON_KEY_INSET_Y, `[${keyHint}]`, {
      fontSize: `${Math.round(L.BUTTON_KEY_FONT)}px`,
      color: L.BUTTON_KEY_COLOR_STR,
      fontFamily: 'monospace',
    }).setOrigin(1, 1);
  }

  bg.on('pointerdown', onClick);
  bg.on('pointerover', () => {
    bg.setFillStyle(L.BUTTON_FILL_HOVER, L.BUTTON_FILL_ALPHA_HOVER);
    bg.setStrokeStyle(L.BUTTON_STROKE, color, L.BUTTON_STROKE_ALPHA_HOVER);
  });
  bg.on('pointerout', () => {
    bg.setFillStyle(L.BUTTON_FILL, L.BUTTON_FILL_ALPHA);
    bg.setStrokeStyle(L.BUTTON_STROKE, color, L.BUTTON_STROKE_ALPHA);
  });

  return bg;
}
