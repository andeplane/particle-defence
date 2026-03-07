import Phaser from 'phaser';
import { CONFIG } from '../config';
import type { UpgradeType } from '../config';
import { MatchStatsRecorder } from '../stats';
import type { MatchStats, PerSecondSample } from '../stats';
import type { GameMode } from './MenuScene';

interface ChartSeries {
  data: (number | null)[];
  color: number;
  label: string;
}

interface ChartConfig {
  title: string;
  series: ChartSeries[];
  yMin?: number;
  yMax?: number;
  isStep?: boolean;
}

const CHART_W = 580;
const CHART_H = 250;
const GAP_X = 20;
const GAP_Y = 16;
const HEADER_H = 76;
const COLS = 3;

const PAD_LEFT = 55;
const PAD_RIGHT = 10;
const PAD_TOP = 28;
const PAD_BOTTOM = 22;

const Y_GRID_LINES = 4;
const CHART_BG = 0x111122;
const CHART_BORDER = 0x333355;
const GRID_COLOR = 0x222244;
const LABEL_HEX = '#777777';
const TITLE_HEX = '#ffffff';

const SCROLL_SPEED = 0.5;

export class PostGameStatsScene extends Phaser.Scene {
  private stats!: MatchStats;
  private mode!: GameMode;
  private wheelHandler?: (
    pointer: Phaser.Input.Pointer,
    _currentlyOver: Phaser.GameObjects.GameObject[],
    _dx: number,
    dy: number,
    _dz: number,
  ) => void;

  constructor() {
    super({ key: 'PostGameStatsScene' });
  }

  init(data: { stats: MatchStats; mode: GameMode }): void {
    this.stats = data.stats;
    this.mode = data.mode;
  }

  create(): void {
    this.cameras.main.setBackgroundColor(CONFIG.BG_COLOR);
    this.cameras.main.fadeIn(400, 0, 0, 0);

    this.drawHeader();

    const { samples } = this.stats;

    if (samples.length < 2) {
      this.add.text(CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT / 2, 'Game too short for stats', {
        fontSize: '32px', color: '#888888', fontFamily: 'monospace',
      }).setOrigin(0.5);
      this.addReturnButton();
      return;
    }

    const charts = this.buildCharts(samples);
    const startX = (CONFIG.GAME_WIDTH - (CHART_W * COLS + GAP_X * (COLS - 1))) / 2;
    const rows = Math.ceil(charts.length / COLS);
    const totalContentHeight = HEADER_H + rows * (CHART_H + GAP_Y) - GAP_Y;

    charts.forEach((chart, idx) => {
      const col = idx % COLS;
      const row = Math.floor(idx / COLS);
      const x = startX + col * (CHART_W + GAP_X);
      const y = HEADER_H + row * (CHART_H + GAP_Y);
      this.drawChart(x, y, CHART_W, CHART_H, chart, samples.length);
    });

    this.addReturnButton();

    const maxScrollY = Math.max(0, totalContentHeight - CONFIG.GAME_HEIGHT);
    if (maxScrollY > 0) {
      this.cameras.main.setBounds(0, 0, CONFIG.GAME_WIDTH, totalContentHeight);
      this.wheelHandler = (_pointer, _currentlyOver, _dx, dy) => {
        const cam = this.cameras.main;
        cam.scrollY += dy * SCROLL_SPEED;
        cam.scrollY = Phaser.Math.Clamp(cam.scrollY, 0, maxScrollY);
      };
      this.input.on('wheel', this.wheelHandler);

      const scrollHint = this.add.text(CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT - 60, 'Scroll to see more', {
        fontSize: '14px', color: '#555555', fontFamily: 'monospace',
      }).setOrigin(0.5);
      scrollHint.setScrollFactor(0);
    }
  }

  shutdown(): void {
    if (this.wheelHandler) {
      this.input.off('wheel', this.wheelHandler);
      this.wheelHandler = undefined;
    }
  }

  private drawHeader(): void {
    const { winner, durationSec } = this.stats;
    const winnerColor = winner === 0 ? CONFIG.PLAYER1_COLOR_STR : CONFIG.PLAYER2_COLOR_STR;
    const winnerLabel = winner === 1 && this.mode === 'ai' ? 'AI WINS!' : `PLAYER ${winner + 1} WINS!`;
    const mins = Math.floor(durationSec / 60);
    const secs = durationSec % 60;

    const winnerText = this.add.text(CONFIG.GAME_WIDTH / 2, 16, winnerLabel, {
      fontSize: '36px', color: winnerColor, fontFamily: 'monospace', fontStyle: 'bold',
    }).setOrigin(0.5, 0);
    winnerText.setScrollFactor(0);

    const durationText = this.add.text(CONFIG.GAME_WIDTH / 2, 52, `Match Duration: ${mins}:${secs.toString().padStart(2, '0')}`, {
      fontSize: '18px', color: '#888888', fontFamily: 'monospace',
    }).setOrigin(0.5, 0);
    durationText.setScrollFactor(0);
  }

  private buildCharts(samples: PerSecondSample[]): ChartConfig[] {
    const p1c = CONFIG.PLAYER1_COLOR;
    const p2c = CONFIG.PLAYER2_COLOR;
    const p1Label = 'P1';
    const p2Label = this.mode === 'ai' ? 'AI' : 'P2';

    const upgradeTypes: UpgradeType[] = ['health', 'attack', 'radius', 'spawnRate', 'speed', 'maxParticles'];
    const kpmData = MatchStatsRecorder.rollingKPM(samples, 30);

    return [
      {
        title: 'Army Size',
        series: [
          { data: samples.map(s => s.aliveUnits[0]), color: p1c, label: p1Label },
          { data: samples.map(s => s.aliveUnits[1]), color: p2c, label: p2Label },
        ],
        yMin: 0,
      },
      {
        title: 'Military Power',
        series: [
          { data: samples.map(s => s.powerCurve[0]), color: p1c, label: p1Label },
          { data: samples.map(s => s.powerCurve[1]), color: p2c, label: p2Label },
        ],
        yMin: 0,
      },
      {
        title: 'Kills / Min (30s rolling)',
        series: [
          { data: kpmData.map(k => k[0]), color: p1c, label: p1Label },
          { data: kpmData.map(k => k[1]), color: p2c, label: p2Label },
        ],
        yMin: 0,
      },
      {
        title: 'Base HP',
        series: [
          { data: samples.map(s => s.baseHP[0]), color: p1c, label: p1Label },
          { data: samples.map(s => s.baseHP[1]), color: p2c, label: p2Label },
        ],
        yMin: 0,
        yMax: CONFIG.BASE_HP,
      },
      {
        title: 'Gold (Unspent)',
        series: [
          { data: samples.map(s => s.goldBanked[0]), color: p1c, label: p1Label },
          { data: samples.map(s => s.goldBanked[1]), color: p2c, label: p2Label },
        ],
        yMin: 0,
      },
      {
        title: 'Total Upgrade Levels',
        series: [
          {
            data: samples.map(s => upgradeTypes.reduce((sum, t) => sum + s.upgradeLevels[0][t], 0)),
            color: p1c, label: p1Label,
          },
          {
            data: samples.map(s => upgradeTypes.reduce((sum, t) => sum + s.upgradeLevels[1][t], 0)),
            color: p2c, label: p2Label,
          },
        ],
        yMin: 0,
        isStep: true,
      },
      {
        title: 'Population Cap Pressure',
        series: [
          { data: samples.map(s => s.capPressure[0]), color: p1c, label: p1Label },
          { data: samples.map(s => s.capPressure[1]), color: p2c, label: p2Label },
        ],
        yMin: 0,
        yMax: 1,
      },
      {
        title: 'Damage / Second',
        series: [
          { data: samples.map(s => s.unitDamageDealt[0] + s.baseDamageDealt[0]), color: p1c, label: p1Label },
          { data: samples.map(s => s.unitDamageDealt[1] + s.baseDamageDealt[1]), color: p2c, label: p2Label },
        ],
        yMin: 0,
      },
      {
        title: 'Frontline Position (cell X)',
        series: [
          { data: samples.map(s => s.frontlineXCell[0]), color: p1c, label: p1Label },
          { data: samples.map(s => s.frontlineXCell[1]), color: p2c, label: p2Label },
        ],
      },
      {
        title: 'Tower Count',
        series: [
          { data: samples.map(s => s.towerCount[0]), color: p1c, label: p1Label },
          { data: samples.map(s => s.towerCount[1]), color: p2c, label: p2Label },
        ],
        yMin: 0,
        isStep: true,
      },
    ];
  }

  private drawChart(
    x: number, y: number, w: number, h: number,
    config: ChartConfig, sampleCount: number,
  ): void {
    const gfx = this.add.graphics();

    gfx.fillStyle(CHART_BG, 0.85);
    gfx.fillRoundedRect(x, y, w, h, 6);
    gfx.lineStyle(1, CHART_BORDER, 0.6);
    gfx.strokeRoundedRect(x, y, w, h, 6);

    const px = x + PAD_LEFT;
    const py = y + PAD_TOP;
    const pw = w - PAD_LEFT - PAD_RIGHT;
    const ph = h - PAD_TOP - PAD_BOTTOM;

    this.add.text(x + 10, y + 6, config.title, {
      fontSize: '16px', color: TITLE_HEX, fontFamily: 'monospace', fontStyle: 'bold',
    });

    this.drawLegend(x, y, w, config.series);

    const { yMin, yMax } = this.computeYRange(config);

    this.drawGridH(gfx, px, py, pw, ph, yMin, yMax);
    this.drawGridV(gfx, px, py, pw, ph, sampleCount);
    this.drawNukeMarkers(gfx, px, py, pw, ph, sampleCount);

    for (const series of config.series) {
      this.plotSeries(gfx, px, py, pw, ph, series, sampleCount, yMin, yMax, config.isStep ?? false);
    }
  }

  private drawLegend(x: number, y: number, w: number, series: ChartSeries[]): void {
    let lx = x + w - 12;
    for (let i = series.length - 1; i >= 0; i--) {
      const s = series[i];
      const hex = `#${s.color.toString(16).padStart(6, '0')}`;
      const txt = this.add.text(lx, y + 8, s.label, {
        fontSize: '13px', color: hex, fontFamily: 'monospace', fontStyle: 'bold',
      }).setOrigin(1, 0);

      const squareSize = 8;
      const sq = this.add.graphics();
      sq.fillStyle(s.color, 1);
      sq.fillRect(lx - txt.width - squareSize - 4, y + 10, squareSize, squareSize);

      lx -= txt.width + squareSize + 18;
    }
  }

  private drawGridH(
    gfx: Phaser.GameObjects.Graphics,
    px: number, py: number, pw: number, ph: number,
    yMin: number, yMax: number,
  ): void {
    gfx.lineStyle(1, GRID_COLOR, 0.5);
    for (let i = 0; i <= Y_GRID_LINES; i++) {
      const gy = py + ph - (i / Y_GRID_LINES) * ph;
      gfx.lineBetween(px, gy, px + pw, gy);

      const val = yMin + (i / Y_GRID_LINES) * (yMax - yMin);
      this.add.text(px - 6, gy, this.fmtAxisVal(val), {
        fontSize: '11px', color: LABEL_HEX, fontFamily: 'monospace',
      }).setOrigin(1, 0.5);
    }
  }

  private drawGridV(
    gfx: Phaser.GameObjects.Graphics,
    px: number, py: number, pw: number, ph: number,
    sampleCount: number,
  ): void {
    const interval = this.niceTimeInterval(sampleCount);
    gfx.lineStyle(1, GRID_COLOR, 0.25);
    for (let t = 0; t < sampleCount; t += interval) {
      const tx = px + (t / Math.max(1, sampleCount - 1)) * pw;
      gfx.lineBetween(tx, py, tx, py + ph);
      this.add.text(tx, py + ph + 4, this.fmtTime(t), {
        fontSize: '10px', color: LABEL_HEX, fontFamily: 'monospace',
      }).setOrigin(0.5, 0);
    }
  }

  private drawNukeMarkers(
    gfx: Phaser.GameObjects.Graphics,
    px: number, py: number, pw: number, ph: number,
    sampleCount: number,
  ): void {
    for (const evt of this.stats.events) {
      if (evt.type !== 'nuke') continue;
      const ex = px + (evt.timeSec / Math.max(1, sampleCount - 1)) * pw;
      const c = evt.player === 0 ? CONFIG.PLAYER1_COLOR : CONFIG.PLAYER2_COLOR;
      gfx.lineStyle(1, c, 0.25);
      gfx.lineBetween(ex, py, ex, py + ph);
    }
  }

  private plotSeries(
    gfx: Phaser.GameObjects.Graphics,
    px: number, py: number, pw: number, ph: number,
    series: ChartSeries, _sampleCount: number,
    yMin: number, yMax: number, isStep: boolean,
  ): void {
    const { data, color } = series;
    if (data.length === 0) return;

    const range = yMax - yMin || 1;
    const n = data.length;
    const toX = (i: number) => px + (i / Math.max(1, n - 1)) * pw;
    const toY = (v: number) => py + ph - ((v - yMin) / range) * ph;

    gfx.lineStyle(4, color, 0.15);
    this.traceLine(gfx, data, toX, toY, isStep);

    gfx.lineStyle(2, color, 0.9);
    this.traceLine(gfx, data, toX, toY, isStep);
  }

  private traceLine(
    gfx: Phaser.GameObjects.Graphics,
    data: (number | null)[],
    toX: (i: number) => number,
    toY: (v: number) => number,
    isStep: boolean,
  ): void {
    let drawing = false;
    let lastScreenY = 0;

    for (let i = 0; i < data.length; i++) {
      const val = data[i];
      if (val === null) {
        if (drawing) gfx.strokePath();
        drawing = false;
        continue;
      }

      const sx = toX(i);
      const sy = toY(val);

      if (!drawing) {
        gfx.beginPath();
        gfx.moveTo(sx, sy);
        drawing = true;
      } else if (isStep) {
        gfx.lineTo(sx, lastScreenY);
        gfx.lineTo(sx, sy);
      } else {
        gfx.lineTo(sx, sy);
      }
      lastScreenY = sy;
    }

    if (drawing) gfx.strokePath();
  }

  private computeYRange(config: ChartConfig): { yMin: number; yMax: number } {
    let dMin = Infinity;
    let dMax = -Infinity;

    for (const s of config.series) {
      for (const v of s.data) {
        if (v !== null) {
          if (v < dMin) dMin = v;
          if (v > dMax) dMax = v;
        }
      }
    }

    if (!isFinite(dMin)) { dMin = 0; dMax = 1; }

    let yMin = config.yMin ?? dMin;
    let yMax = config.yMax ?? dMax;

    if (yMin === yMax) {
      yMin = yMin - 1;
      yMax = yMax + 1;
    }

    if (config.yMax === undefined) yMax += (yMax - yMin) * 0.08;
    if (config.yMin === undefined) yMin -= (yMax - yMin) * 0.05;

    return { yMin, yMax };
  }

  private fmtAxisVal(val: number): string {
    const abs = Math.abs(val);
    if (abs >= 1000) return `${(val / 1000).toFixed(1)}k`;
    if (abs >= 100) return Math.round(val).toString();
    if (Number.isInteger(val)) return val.toString();
    if (abs >= 10) return val.toFixed(1);
    return val.toFixed(2);
  }

  private fmtTime(sec: number): string {
    if (sec < 60) return `${sec}s`;
    const m = Math.floor(sec / 60);
    const s = sec % 60;
    return s === 0 ? `${m}m` : `${m}:${s.toString().padStart(2, '0')}`;
  }

  private niceTimeInterval(totalSec: number): number {
    const candidates = [5, 10, 15, 30, 60, 120, 300, 600];
    const target = totalSec / 5;
    for (const c of candidates) {
      if (c >= target) return c;
    }
    return candidates[candidates.length - 1];
  }

  private addReturnButton(): void {
    const btn = this.add.text(CONFIG.GAME_WIDTH / 2, CONFIG.GAME_HEIGHT - 36, 'Click to return to menu', {
      fontSize: '22px', color: '#666666', fontFamily: 'monospace',
    }).setOrigin(0.5).setInteractive({ useHandCursor: true });
    btn.setScrollFactor(0);

    btn.on('pointerover', () => btn.setColor('#ffffff'));
    btn.on('pointerout', () => btn.setColor('#666666'));
    btn.on('pointerdown', () => this.scene.start('MenuScene'));
  }
}
