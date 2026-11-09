import { BasicParticle } from '../particles/BasicParticle';
import { LaserTowerParticle } from '../particles/LaserTowerParticle';
import { SlowTowerParticle } from '../particles/SlowTowerParticle';
import type { GameObjectMeta, ResearchNodeMeta, ResearchPath } from './types';

const ALL_META: GameObjectMeta<unknown>[] = [
  BasicParticle.meta as GameObjectMeta<unknown>,
  LaserTowerParticle.meta as GameObjectMeta<unknown>,
  SlowTowerParticle.meta as GameObjectMeta<unknown>,
];

export const ResearchRegistry = {
  findUnlock(id: string): ResearchNodeMeta | undefined {
    for (const meta of ALL_META) {
      if (meta.unlock?.id === id) return meta.unlock;
    }
    return undefined;
  },

  findPath(id: string): ResearchPath<unknown> | undefined {
    for (const meta of ALL_META) {
      for (const path of meta.upgradePaths) {
        if (path.id === id) return path;
      }
    }
    return undefined;
  },

  getNextLevelCost(pathId: string, currentLevel: number): number | undefined {
    return this.findPath(pathId)?.levels[currentLevel]?.cost;
  },

  prerequisitesMet(nodeId: string, purchased: Map<string, number>): boolean {
    const unlock = this.findUnlock(nodeId);
    const requires = unlock?.requires ?? this.findPath(nodeId)?.requires ?? [];
    return requires.every(req => (purchased.get(req) ?? 0) >= 1);
  },
};
