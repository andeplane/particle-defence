import Phaser from 'phaser';

export function createMenuButton(
  scene: Phaser.Scene,
  x: number,
  y: number,
  w: number,
  h: number,
  label: string,
  color: number,
  onClick: () => void
): Phaser.GameObjects.Rectangle {
  const r = (color >> 16) & 0xff;
  const g = (color >> 8) & 0xff;
  const b = color & 0xff;
  const colorStr = `rgb(${r},${g},${b})`;

  const bg = scene.add.rectangle(x, y, w, h, 0x111122, 0.9)
    .setStrokeStyle(3, color, 0.6)
    .setInteractive({ useHandCursor: true });

  scene.add.text(x, y, label, {
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

  return bg;
}
