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

/** Summary of one research node for listing / stats purposes. */
export type ResearchNodeSummary = {
  id: string;
  name: string;
  kind: 'unlock' | 'path';
  /** 1 for unlocks; number of purchasable levels for paths. */
  maxLevel: number;
};

export const ResearchRegistry = {
  /** Every research node in the tree: unlocks first, then multi-level paths. Stable order. */
  allNodes(): ResearchNodeSummary[] {
    const unlocks: ResearchNodeSummary[] = [];
    const paths: ResearchNodeSummary[] = [];
    for (const meta of ALL_META) {
      if (meta.unlock) unlocks.push({ id: meta.unlock.id, name: meta.unlock.name, kind: 'unlock', maxLevel: 1 });
      for (const path of meta.upgradePaths) {
        paths.push({ id: path.id, name: path.name, kind: 'path', maxLevel: path.levels.length });
      }
    }
    for (const node of STANDALONE_UNLOCKS) {
      unlocks.push({ id: node.id, name: node.name, kind: 'unlock', maxLevel: 1 });
    }
    for (const path of ALL_GLOBAL_PATHS) {
      paths.push({ id: path.id, name: path.name, kind: 'path', maxLevel: path.levels.length });
    }
    return [...unlocks, ...paths];
  },

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
