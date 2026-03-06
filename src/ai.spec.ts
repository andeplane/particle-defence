import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AIController, type AIGameState } from './ai';
import { createPlayer, type PlayerConfig } from './player';
import { createMockParticle } from './__mocks__/createMockParticle';
import type { IParticle } from './particles/AbstractParticle';

const playerConfig: PlayerConfig = {
  baseHP: 1000,
  startingGold: 100,
  particleBaseHealth: 3,
  particleBaseAttack: 1,
  particleBaseRadius: 3,
  particleBaseSpeed: 180,
  spawnIntervalMs: 200,
  spawnRateReductionPerLevel: 20,
  minSpawnInterval: 50,
  speedPerLevel: 20,
  maxParticlesPerPlayer: 100,
  maxParticlesPerLevel: 50,
  nuclearFirstAvailableMs: 0,
  nuclearCooldownMs: 5000,
};

function makeParticles(ownerCounts: { p0: number; p1: number }): IParticle[] {
  const particles: IParticle[] = [];
  for (let i = 0; i < ownerCounts.p0; i++) {
    particles.push(createMockParticle({ id: i, owner: 0, alive: true }));
  }
  for (let i = 0; i < ownerCounts.p1; i++) {
    particles.push(createMockParticle({ id: ownerCounts.p0 + i, owner: 1, alive: true }));
  }
  return particles;
}

function createState(overrides: Partial<AIGameState> = {}): AIGameState {
  return {
    players: [createPlayer(0, playerConfig), createPlayer(1, playerConfig)],
    particles: [],
    gameTimeMs: 10_000,
    gameOver: false,
    launchNuke: vi.fn(() => true),
    ...overrides,
  };
}

describe(AIController.name, () => {
  let ai: AIController;

  beforeEach(() => {
    ai = new AIController(1, { baseHP: 1000 });
  });

  describe('decision throttle', () => {
    it('does nothing when delta is below decision interval', () => {
      const state = createState();
      const goldBefore = state.players[1].gold;

      ai.update(50, state);

      expect(state.launchNuke).not.toHaveBeenCalled();
      expect(state.players[1].gold).toBe(goldBefore);
    });

    it('makes decisions when accumulated delta exceeds interval', () => {
      const state = createState();
      state.players[1].gold = 9999;

      ai.update(100, state);
      ai.update(101, state);

      // After 201ms total (>200ms threshold), should make a decision
      expect(state.players[1].gold).toBeLessThan(9999);
    });
  });

  describe('game over', () => {
    it('returns early when gameOver is true', () => {
      const state = createState({ gameOver: true });
      state.players[1].gold = 9999;
      const goldBefore = state.players[1].gold;

      ai.update(300, state);

      expect(state.launchNuke).not.toHaveBeenCalled();
      expect(state.players[1].gold).toBe(goldBefore);
    });
  });

  describe('nuke decisions', () => {
    it.each([
      {
        scenario: 'losingBadly',
        aiHP: 500,
        humanHP: 900,
        p0Count: 10,
        p1Count: 10,
        shouldNuke: true,
      },
      {
        scenario: 'enemyFlood',
        aiHP: 1000,
        humanHP: 1000,
        p0Count: 100,
        p1Count: 10,
        shouldNuke: true,
      },
      {
        scenario: 'desperation',
        aiHP: 200,
        humanHP: 200,
        p0Count: 10,
        p1Count: 10,
        shouldNuke: true,
      },
      {
        scenario: 'valueNuke',
        aiHP: 1000,
        humanHP: 1000,
        p0Count: 400,
        p1Count: 400,
        shouldNuke: true,
      },
      {
        scenario: 'no trigger',
        aiHP: 1000,
        humanHP: 1000,
        p0Count: 10,
        p1Count: 10,
        shouldNuke: false,
      },
    ])('$scenario -> shouldNuke=$shouldNuke', ({ aiHP, humanHP, p0Count, p1Count, shouldNuke }) => {
      const state = createState({
        particles: makeParticles({ p0: p0Count, p1: p1Count }),
      });
      state.players[0].baseHP = humanHP;
      state.players[1].baseHP = aiHP;

      ai.update(300, state);

      if (shouldNuke) {
        expect(state.launchNuke).toHaveBeenCalledWith(1);
      } else {
        expect(state.launchNuke).not.toHaveBeenCalled();
      }
    });

    it('does not launch nuke when on cooldown', () => {
      const state = createState({
        particles: makeParticles({ p0: 100, p1: 10 }),
      });
      state.players[1].baseHP = 200;
      state.players[1].useNuke(9000);

      ai.update(300, state);

      expect(state.launchNuke).not.toHaveBeenCalled();
    });
  });

  describe('upgrade decisions', () => {
    it('buys an upgrade when affordable', () => {
      const state = createState();
      state.players[1].gold = 9999;
      const goldBefore = state.players[1].gold;

      ai.update(300, state);

      expect(state.players[1].gold).toBeLessThan(goldBefore);
    });

    it('does not buy when cannot afford any upgrade', () => {
      const state = createState();
      state.players[1].gold = 0;

      ai.update(300, state);

      expect(state.players[1].gold).toBe(0);
    });

    it('prioritizes spawnRate early game', () => {
      const state = createState({ gameTimeMs: 5_000 });
      state.players[1].gold = 9999;

      ai.update(300, state);

      expect(state.players[1].getUpgradeLevel('spawnRate')).toBeGreaterThan(0);
    });

    it('boosts health when human attack is higher', () => {
      const state = createState({ gameTimeMs: 60_000 });
      const human = state.players[0];
      human.gold = 9999;
      for (let i = 0; i < 5; i++) human.buyUpgrade('attack');

      state.players[1].gold = 9999;
      // Exhaust spawnRate and attack to high levels so health becomes best option
      for (let i = 0; i < 10; i++) {
        state.players[1].buyUpgrade('spawnRate');
        state.players[1].buyUpgrade('attack');
      }

      ai.update(300, state);

      expect(state.players[1].getUpgradeLevel('health')).toBeGreaterThan(0);
    });

    it('boosts maxParticles when near cap', () => {
      const state = createState({
        gameTimeMs: 60_000,
        particles: makeParticles({ p0: 10, p1: 85 }),
      });
      state.players[1].gold = 9999;
      // Saturate other upgrades so maxParticles scores higher
      for (let i = 0; i < 10; i++) {
        state.players[1].buyUpgrade('spawnRate');
        state.players[1].buyUpgrade('attack');
        state.players[1].buyUpgrade('health');
        state.players[1].buyUpgrade('speed');
      }

      ai.update(300, state);

      expect(state.players[1].getUpgradeLevel('maxParticles')).toBeGreaterThan(0);
    });
  });
});
