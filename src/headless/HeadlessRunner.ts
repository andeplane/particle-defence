import { CONFIG } from '../config';
import type { UpgradeType } from '../config';
import { AIController } from '../ai';
import { GameEngine, type GameEngineCallbacks } from '../GameEngine';
import { generateGrid } from '../grid/generators';
import { MatchStatsRecorder } from '../stats/MatchStatsRecorder';
import type { GameResult, HeadlessRunConfig, PlayerSummary } from './types';

const defaultConfig: HeadlessRunConfig = {
  gridType: 'random',
  tickMs: 1000,
  maxGameTimeSec: 30 * 60,
};

export function runHeadlessGame(configOverrides?: Partial<HeadlessRunConfig>): GameResult {
  const config = configOverrides ? { ...defaultConfig, ...configOverrides } : defaultConfig;

  const grid = generateGrid(config.gridType);
  const statsRecorder = new MatchStatsRecorder({ cellW: grid.cellW });

  const callbacks = createStatsCallbacks(statsRecorder);

  const engine = new GameEngine(grid, callbacks, {
    createAIController: (playerId) => {
      const profile = playerId === 0 ? config.p0Profile : config.p1Profile;
      const aiConfig = profile ? { baseHP: CONFIG.BASE_HP, profile } : { baseHP: CONFIG.BASE_HP };
      return new AIController(playerId, aiConfig);
    },
  });
  engine.init('both');

  const maxTicks = Math.ceil((config.maxGameTimeSec * 1000) / config.tickMs);

  for (let i = 0; i < maxTicks; i++) {
    engine.tick(config.tickMs);
    statsRecorder.tick(config.tickMs, engine.particles, engine.players);
    if (engine.gameOver) break;
  }

  const winner = engine.gameOver ? (engine.winner as 0 | 1) : -1;
  const matchStats = statsRecorder.finalize(winner === -1 ? 0 : winner);

  return {
    winner,
    durationSec: Math.floor(engine.gameTimeMs / 1000),
    players: [
      summarizePlayer(engine, 0),
      summarizePlayer(engine, 1),
    ],
    matchStats,
  };
}

function summarizePlayer(engine: GameEngine, id: 0 | 1): PlayerSummary {
  const player = engine.players[id];
  const upgrades: Record<UpgradeType, number> = {
    health: player.getUpgradeLevel('health'),
    attack: player.getUpgradeLevel('attack'),
    radius: player.getUpgradeLevel('radius'),
    spawnRate: player.getUpgradeLevel('spawnRate'),
    speed: player.getUpgradeLevel('speed'),
    defense: player.getUpgradeLevel('defense'),
    maxParticles: player.getUpgradeLevel('maxParticles'),
    interestRate: player.getUpgradeLevel('interestRate'),
  };

  const towerCount = engine.towers[id].filter(t => t.alive).length;

  return {
    id,
    finalHP: player.baseHP,
    finalGold: player.gold,
    kills: player.kills,
    upgradeLevels: upgrades,
    towerCount,
  };
}

function createStatsCallbacks(recorder: MatchStatsRecorder): GameEngineCallbacks {
  return {
    onKill: (killer, victim) => {
      recorder.recordKill(killer.owner);
      recorder.recordUnitDamage(killer.owner, victim.maxHealth);
      recorder.recordGoldIncome(killer.owner, CONFIG.KILL_REWARD);
    },
    onBaseDamage: (playerId, damage) => {
      const attacker = playerId === 0 ? 1 : 0;
      recorder.recordBaseDamage(attacker as 0 | 1, damage);
    },
    onParticleSpawned: () => {},
    onNuke: (playerId, killCount) => {
      recorder.recordNuke(playerId, killCount);
      const reward = Math.floor(killCount * CONFIG.KILL_REWARD * CONFIG.NUCLEAR_KILL_REWARD_FRACTION);
      recorder.recordGoldIncome(playerId, reward);
    },
    onGameOver: () => {},
    onStuckRespawn: () => {},
    onInterest: () => {},
    onTowerPlaced: (tower, playerId) => {
      recorder.recordTowerPlaced(playerId, (tower as { towerType?: string }).towerType ?? 'unknown');
    },
    onTowerDeath: () => {},
    spawnExplosion: () => {},
  };
}
