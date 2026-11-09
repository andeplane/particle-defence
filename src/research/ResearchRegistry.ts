import { CONFIG } from '../config';
import { BasicParticle } from '../particles/BasicParticle';
import { LaserTowerParticle } from '../particles/LaserTowerParticle';
import { WeaknessTowerParticle } from '../particles/WeaknessTowerParticle';
import { ALL_GLOBAL_PATHS } from './globalResearchPaths';
import type { GameObjectMeta, ResearchNodeMeta, ResearchPath } from './types';

const ALL_META: GameObjectMeta<unknown>[] = [
  BasicParticle.meta as GameObjectMeta<unknown>,
  LaserTowerParticle.meta as GameObjectMeta<unknown>,
  WeaknessTowerParticle.meta as GameObjectMeta<unknown>,
];

/** Standalone unlock nodes not tied to any game object class. */
const STANDALONE_UNLOCKS: ResearchNodeMeta[] = [
  {
    id: 'unlock_nuke',
    name: 'Nuclear Weapon',
    description: 'Unlock nuclear weapon launch',
    cost: CONFIG.NUKE_RESEARCH_COST,
    durationMs: CONFIG.NUKE_RESEARCH_DURATION_MS,
  },
  {
    id: 'unlock_territory_income',
    name: 'Territory Income',
    description: 'Owned cells generate passive gold income',
    cost: CONFIG.TERRITORY_INCOME_RESEARCH_COST,
    durationMs: CONFIG.TERRITORY_INCOME_RESEARCH_DURATION_MS,
  },
];

export const ResearchRegistry = {
  findUnlock(id: string): ResearchNodeMeta | undefined {
    for (const meta of ALL_META) {
      if (meta.unlock?.id === id) return meta.unlock;
    }
    for (const node of STANDALONE_UNLOCKS) {
      if (node.id === id) return node;
    }
    return undefined;
  },

  findPath(id: string): ResearchPath<unknown> | undefined {
    for (const meta of ALL_META) {
      for (const path of meta.upgradePaths) {
        if (path.id === id) return path;
      }
    }
    for (const path of ALL_GLOBAL_PATHS) {
      if (path.id === id) return path as ResearchPath<unknown>;
    }
    return undefined;
  },

  getNextLevelCost(pathId: string, currentLevel: number): number | undefined {
    return this.findPath(pathId)?.levels[currentLevel]?.cost;
  },

  prerequisitesMet(nodeId: string, purchased: Map<string, number>): boolean {
    const unlock = this.findUnlock(nodeId);
    const path = this.findPath(nodeId);
    const requires = unlock?.requires ?? path?.requires ?? [];
    const requiresAny = unlock?.requiresAny ?? path?.requiresAny ?? [];

    const andMet = requires.every(req => (purchased.get(req) ?? 0) >= 1);
    const anyMet = requiresAny.length === 0 || requiresAny.some(req => (purchased.get(req) ?? 0) >= 1);
    return andMet && anyMet;
  },
};
