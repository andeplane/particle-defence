import Phaser from 'phaser';
import { CONFIG, type UpgradeType } from '../config';
import type { GameScene } from './GameScene';

interface UpgradeButton {
  bg: Phaser.GameObjects.Rectangle;
  label: Phaser.GameObjects.Text;
  costText: Phaser.GameObjects.Text;
  keyText: Phaser.GameObjects.Text;
  type: UpgradeType;
  playerId: 0 | 1;
}

interface NukeButton {
  bg: Phaser.GameObjects.Rectangle;
  labelText: Phaser.GameObjects.Text;
  statusText: Phaser.GameObjects.Text;
  keyText: Phaser.GameObjects.Text;
  playerId: 0 | 1;
}

export class UIScene extends Phaser.Scene {
  private gameScene!: GameScene;

  // HUD elements
  private p1HPBar!: Phaser.GameObjects.Graphics;
  private p2HPBar!: Phaser.GameObjects.Graphics;
  private p1GoldText!: Phaser.GameObjects.Text;
  private p2GoldText!: Phaser.GameObjects.Text;
  private p1StatsText!: Phaser.GameObjects.Text;
  private p2StatsText!: Phaser.GameObjects.Text;
  private p1HPText!: Phaser.GameObjects.Text;
  private p2HPText!: Phaser.GameObjects.Text;
  private buttons: UpgradeButton[] = [];
  private nukeButtons: NukeButton[] = [];

  // Gold popup pool
  private popups: Phaser.GameObjects.Text[] = [];

  constructor() {
    super({ key: 'UIScene' });
  }

  init(data: { gameScene: GameScene }): void {
    this.gameScene = data.gameScene;
  }

  create(): void {
    this.createHPBars();
    this.createGoldDisplay();
    this.createStatsDisplay();
    this.createUpgradeButtons();
    this.createNukeButtons();
    this.setupKeyboard();
  }

  private createHPBars(): void {
    const barW = CONFIG.UI_BAR_WIDTH;
    const barH = CONFIG.UI_BAR_HEIGHT;
    const y = CONFIG.UI_GAP * 2;

    // P1 HP bar (top left)
    this.p1HPBar = this.add.graphics();
    this.p1HPText = this.add.text(barW / 2 + CONFIG.UI_GAP * 2.5, y + barH / 2, '', {
      fontSize: `${CONFIG.UI_FONT_SMALL}px`, color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);

    // P2 HP bar (top right)
    this.p2HPBar = this.add.graphics();
    this.p2HPText = this.add.text(CONFIG.GAME_WIDTH - barW / 2 - CONFIG.UI_GAP * 2.5, y + barH / 2, '', {
      fontSize: `${CONFIG.UI_FONT_SMALL}px`, color: '#ffffff', fontFamily: 'monospace',
    }).setOrigin(0.5);
  }

  private createGoldDisplay(): void {
    const y = CONFIG.UI_GAP * 2 + CONFIG.UI_BAR_HEIGHT + CONFIG.UI_GAP * 2;
    this.p1GoldText = this.add.text(CONFIG.UI_GAP * 2.5, y, '', {
      fontSize: `${CONFIG.UI_FONT_MED}px`, color: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold',
    });
    this.p2GoldText = this.add.text(CONFIG.GAME_WIDTH - CONFIG.UI_GAP * 2.5, y, '', {
      fontSize: `${CONFIG.UI_FONT_MED}px`, color: '#ffd700', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(1, 0);
  }

  private createStatsDisplay(): void {
    const y = CONFIG.UI_GAP * 2 + CONFIG.UI_BAR_HEIGHT + CONFIG.UI_GAP * 2 + CONFIG.UI_FONT_MED + CONFIG.UI_GAP * 2;
    this.p1StatsText = this.add.text(CONFIG.UI_GAP * 2.5, y, '', {
      fontSize: `${CONFIG.UI_FONT_SMALL}px`, color: '#aaaaaa', fontFamily: 'monospace',
    });
    this.p2StatsText = this.add.text(CONFIG.GAME_WIDTH - CONFIG.UI_GAP * 2.5, y, '', {
      fontSize: `${CONFIG.UI_FONT_SMALL}px`, color: '#aaaaaa', fontFamily: 'monospace',
    }).setOrigin(1, 0);
  }

  private createUpgradeButtons(): void {
    const upgrades: { type: UpgradeType; label: string; p1Key: string; p2Key: string }[] = [
      { type: 'health', label: 'HP', p1Key: 'Q', p2Key: 'U' },
      { type: 'attack', label: 'ATK', p1Key: 'W', p2Key: 'I' },
      { type: 'radius', label: 'RAD', p1Key: 'E', p2Key: 'O' },
      { type: 'spawnRate', label: 'SPWN', p1Key: 'R', p2Key: 'P' },
      { type: 'speed', label: 'VEL', p1Key: 'T', p2Key: 'Y' },
    ];

    const btnW = CONFIG.UI_BTN_WIDTH;
    const btnH = CONFIG.UI_BTN_HEIGHT;
    const gap = CONFIG.UI_GAP;
    const bottomY = CONFIG.GAME_HEIGHT - btnH - CONFIG.UI_GAP * 2;

    // P1 buttons (bottom left)
    upgrades.forEach((u, i) => {
      const x = CONFIG.UI_GAP * 2.5 + i * (btnW + gap) + btnW / 2;
      this.createButton(x, bottomY, btnW, btnH, u.type, u.label, u.p1Key, 0);
    });

    // P2 buttons (bottom right)
    upgrades.forEach((u, i) => {
      const x = CONFIG.GAME_WIDTH - CONFIG.UI_GAP * 2.5 - (4 - i) * (btnW + gap) - btnW / 2;
      this.createButton(x, bottomY, btnW, btnH, u.type, u.label, u.p2Key, 1);
    });
  }

  private createButton(
    x: number, y: number, w: number, h: number,
    type: UpgradeType, label: string, keyName: string, playerId: 0 | 1
  ): void {
    const color = playerId === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;

    const bg = this.add.rectangle(x, y + h / 2, w, h, 0x111122, 0.85)
      .setStrokeStyle(2, color, 0.5)
      .setInteractive({ useHandCursor: true });

    const labelText = this.add.text(x, y + h * 0.22, label, {
      fontSize: `${CONFIG.UI_FONT_SMALL + 2}px`, color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    const costText = this.add.text(x, y + h * 0.52, '$?', {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#ffd700', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const keyText = this.add.text(x, y + h * 0.85, `[${keyName}]`, {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerdown', () => this.purchaseUpgrade(playerId, type, bg));

    bg.on('pointerover', () => bg.setFillStyle(0x222244, 0.9));
    bg.on('pointerout', () => bg.setFillStyle(0x111122, 0.85));

    this.buttons.push({ bg, label: labelText, costText, keyText, type, playerId });
  }

  private createNukeButtons(): void {
    const btnW = CONFIG.UI_BTN_WIDTH;
    const btnH = CONFIG.UI_BTN_HEIGHT;
    const gap = CONFIG.UI_GAP;
    const bottomY = CONFIG.GAME_HEIGHT - btnH - CONFIG.UI_GAP * 2;

    // P1 nuke button (after upgrade buttons, index 5)
    const p1X = CONFIG.UI_GAP * 2.5 + 5 * (btnW + gap) + btnW / 2;
    this.nukeButtons.push(this.createNukeButton(p1X, bottomY, btnW, btnH, 0, 'F'));

    // P2 nuke button (leftmost of 6, mirrored from P1)
    const p2X = CONFIG.GAME_WIDTH - CONFIG.UI_GAP * 2.5 - 5 * (btnW + gap) - btnW / 2;
    this.nukeButtons.push(this.createNukeButton(p2X, bottomY, btnW, btnH, 1, 'J'));
  }

  private createNukeButton(
    x: number, y: number, w: number, h: number,
    playerId: 0 | 1, keyName: string
  ): NukeButton {
    const color = playerId === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;

    const bg = this.add.rectangle(x, y + h / 2, w, h, 0x221111, 0.85)
      .setStrokeStyle(2, color, 0.5)
      .setInteractive({ useHandCursor: true });

    const labelText = this.add.text(x, y + h * 0.22, 'NUKE', {
      fontSize: `${CONFIG.UI_FONT_SMALL + 2}px`, color: '#ffffff', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);

    const statusText = this.add.text(x, y + h * 0.52, '--:--', {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#ff6666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    const keyText = this.add.text(x, y + h * 0.85, `[${keyName}]`, {
      fontSize: `${CONFIG.UI_FONT_SMALL - 2}px`, color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5);

    bg.on('pointerdown', () => this.launchNuke(playerId, bg));
    bg.on('pointerover', () => bg.setFillStyle(0x332222, 0.9));
    bg.on('pointerout', () => bg.setFillStyle(0x221111, 0.85));

    return { bg, labelText, statusText, keyText, playerId };
  }

  private launchNuke(playerId: 0 | 1, btn?: Phaser.GameObjects.Rectangle): void {
    if (this.gameScene.gameOver) return;
    if (this.gameScene.launchNuke(playerId)) {
      if (btn) {
        this.tweens.add({
          targets: btn,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 80,
          yoyo: true,
          ease: 'Quad.easeOut',
        });
      }
    } else {
      if (btn) {
        this.tweens.add({
          targets: btn,
          x: btn.x + 3,
          duration: 40,
          yoyo: true,
          repeat: 2,
          ease: 'Sine.inOut',
        });
      }
    }
  }

  private setupKeyboard(): void {
    const p1Keys: Record<string, UpgradeType> = {
      Q: 'health', W: 'attack', E: 'radius', R: 'spawnRate', T: 'speed',
    };
    const p2Keys: Record<string, UpgradeType> = {
      U: 'health', I: 'attack', O: 'radius', P: 'spawnRate', Y: 'speed',
    };

    this.input.keyboard!.on('keydown', (event: KeyboardEvent) => {
      const key = event.key.toUpperCase();
      if (key === 'F') {
        const nukeBtn = this.nukeButtons.find(b => b.playerId === 0);
        this.launchNuke(0, nukeBtn?.bg);
      }
      if (key === 'J') {
        const nukeBtn = this.nukeButtons.find(b => b.playerId === 1);
        this.launchNuke(1, nukeBtn?.bg);
      }
      if (p1Keys[key]) {
        const btn = this.buttons.find(b => b.playerId === 0 && b.type === p1Keys[key]);
        this.purchaseUpgrade(0, p1Keys[key], btn?.bg);
      }
      if (p2Keys[key]) {
        const btn = this.buttons.find(b => b.playerId === 1 && b.type === p2Keys[key]);
        this.purchaseUpgrade(1, p2Keys[key], btn?.bg);
      }
    });
  }

  private purchaseUpgrade(playerId: 0 | 1, type: UpgradeType, btn?: Phaser.GameObjects.Rectangle): void {
    if (this.gameScene.gameOver) return;
    const player = this.gameScene.players[playerId];
    const cost = player.getUpgradeCost(type);
    if (player.buyUpgrade(type)) {
      // Flash button
      if (btn) {
        this.tweens.add({
          targets: btn,
          scaleX: 1.15,
          scaleY: 1.15,
          duration: 80,
          yoyo: true,
          ease: 'Quad.easeOut',
        });
      }
      // Gold popup
      this.showGoldPopup(playerId, `-$${cost}`);
    } else {
      // Shake button to indicate can't afford
      if (btn) {
        this.tweens.add({
          targets: btn,
          x: btn.x + 3,
          duration: 40,
          yoyo: true,
          repeat: 2,
          ease: 'Sine.inOut',
        });
      }
    }
  }

  private showGoldPopup(playerId: 0 | 1, text: string): void {
    const x = playerId === 0 ? CONFIG.UI_BAR_WIDTH + CONFIG.UI_GAP * 4 : CONFIG.GAME_WIDTH - CONFIG.UI_BAR_WIDTH - CONFIG.UI_GAP * 4;
    const y = CONFIG.UI_GAP * 2 + CONFIG.UI_BAR_HEIGHT + CONFIG.UI_GAP;
    const popup = this.add.text(x, y, text, {
      fontSize: `${CONFIG.UI_FONT_SMALL + 2}px`, color: '#ff4444', fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.popups.push(popup);

    this.tweens.add({
      targets: popup,
      y: popup.y - CONFIG.UI_GAP * 5,
      alpha: 0,
      duration: 600,
      onComplete: () => {
        popup.destroy();
        this.popups = this.popups.filter(p => p !== popup);
      },
    });
  }

  update(): void {
    if (!this.gameScene.players) return;

    const [p1, p2] = this.gameScene.players;

    const barX = CONFIG.UI_GAP * 2.5;
    const barY = CONFIG.UI_GAP * 2;
    this.drawHPBar(this.p1HPBar, barX, barY, CONFIG.UI_BAR_WIDTH, CONFIG.UI_BAR_HEIGHT, p1.baseHP, CONFIG.BASE_HP, CONFIG.PLAYER1_COLOR);
    this.drawHPBar(this.p2HPBar, CONFIG.GAME_WIDTH - barX - CONFIG.UI_BAR_WIDTH, barY, CONFIG.UI_BAR_WIDTH, CONFIG.UI_BAR_HEIGHT, p2.baseHP, CONFIG.BASE_HP, CONFIG.PLAYER2_COLOR);

    this.p1HPText.setText(`${p1.baseHP}/${CONFIG.BASE_HP}`);
    this.p2HPText.setText(`${p2.baseHP}/${CONFIG.BASE_HP}`);

    this.p1GoldText.setText(`Gold: $${p1.gold}  Kills: ${p1.kills}`);
    this.p2GoldText.setText(`Gold: $${p2.gold}  Kills: ${p2.kills}`);

    const p1Count = this.gameScene.particles.filter(p => p.owner === 0).length;
    const p2Count = this.gameScene.particles.filter(p => p.owner === 1).length;
    this.p1StatsText.setText(`HP:${p1.particleHealth} ATK:${p1.particleAttack} RAD:${p1.particleRadius} VEL:${p1.particleSpeed} Units:${p1Count}`);
    this.p2StatsText.setText(`HP:${p2.particleHealth} ATK:${p2.particleAttack} RAD:${p2.particleRadius} VEL:${p2.particleSpeed} Units:${p2Count}`);

    // Update button affordability and cost display
    for (const btn of this.buttons) {
      const player = this.gameScene.players[btn.playerId];
      const canAfford = player.canAfford(btn.type);
      btn.bg.setAlpha(canAfford ? 1 : 0.4);
      btn.costText.setText(`$${player.getUpgradeCost(btn.type)}`);
    }

    // Update nuke button cooldown display
    const gameTimeMs = this.gameScene.gameTimeMs;
    for (const btn of this.nukeButtons) {
      const player = this.gameScene.players[btn.playerId];
      const canUse = player.canUseNuke(gameTimeMs);
      btn.bg.setAlpha(canUse ? 1 : 0.4);
      const remainingMs = player.getNukeCooldownRemainingMs(gameTimeMs);
      if (remainingMs <= 0) {
        btn.statusText.setText('READY');
        btn.statusText.setColor('#66ff66');
      } else {
        const mins = Math.floor(remainingMs / 60000);
        const secs = Math.floor((remainingMs % 60000) / 1000);
        btn.statusText.setText(`${mins}:${secs.toString().padStart(2, '0')}`);
        btn.statusText.setColor('#ff6666');
      }
    }
  }

  private drawHPBar(
    gfx: Phaser.GameObjects.Graphics,
    x: number, y: number, w: number, h: number,
    current: number, max: number, color: number
  ): void {
    const radius = CONFIG.UI_GAP;
    gfx.clear();
    // Background
    gfx.fillStyle(0x111111, 0.8);
    gfx.fillRoundedRect(x, y, w, h, radius);
    // Fill
    const pct = Math.max(0, current / max);
    if (pct > 0) {
      gfx.fillStyle(color, 0.8);
      gfx.fillRoundedRect(x + 2, y + 2, (w - 4) * pct, h - 4, radius - 1);
    }
    // Border
    gfx.lineStyle(2, color, 0.5);
    gfx.strokeRoundedRect(x, y, w, h, radius);
  }
}
