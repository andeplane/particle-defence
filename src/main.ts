import Phaser from 'phaser';
import { CONFIG } from './config';
import { isMobile } from './mobile';
import { GameScene } from './scenes/GameScene';
import { MapSelectScene } from './scenes/MapSelectScene';
import { MenuScene } from './scenes/MenuScene';
import { HowToPlayScene } from './scenes/HowToPlayScene';
import { PostGameStatsScene } from './scenes/PostGameStatsScene';
import { UIScene } from './scenes/UIScene';

const config: Phaser.Types.Core.GameConfig = {
  type: Phaser.WEBGL,
  width: CONFIG.GAME_WIDTH,
  height: CONFIG.GAME_HEIGHT,
  parent: 'game-container',
  backgroundColor: CONFIG.BG_COLOR,
  scene: [MenuScene, MapSelectScene, GameScene, UIScene, PostGameStatsScene, HowToPlayScene],
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH,
  },
  render: {
    antialias: true,
    pixelArt: false,
  },
  input: {
    touch: true,
  },
};

new Phaser.Game(config);

if (isMobile()) {
  const enterFullscreen = () => {
    const doc = document.documentElement;
    const rfs = doc.requestFullscreen
      ?? (doc as unknown as Record<string, unknown>)['webkitRequestFullscreen'] as (() => Promise<void>) | undefined;
    if (rfs) {
      rfs.call(doc).then(() => {
        try {
          const orient = screen.orientation as unknown as { lock?: (type: string) => Promise<void> };
          orient.lock?.('landscape')?.catch(() => {});
        } catch { /* orientation lock not supported */ }
      }).catch(() => {});
    }
    document.removeEventListener('pointerdown', enterFullscreen);
  };
  document.addEventListener('pointerdown', enterFullscreen, { once: true });
}
