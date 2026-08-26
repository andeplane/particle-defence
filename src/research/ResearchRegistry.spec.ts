import { describe, it, expect } from 'vitest';
import { ResearchRegistry } from './ResearchRegistry';

describe('ResearchRegistry.allNodes', () => {
  it('lists every unlock and path exactly once with the correct kind', () => {
    const nodes = ResearchRegistry.allNodes();
    const ids = nodes.map(n => n.id);

    expect(new Set(ids).size).toBe(ids.length);
    expect(nodes.find(n => n.id === 'unlock_laser')?.kind).toBe('unlock');
    expect(nodes.find(n => n.id === 'unlock_nuke')?.kind).toBe('unlock');
    expect(nodes.find(n => n.id === 'laser_upgrades')?.kind).toBe('path');
    expect(nodes.find(n => n.id === 'tower_regen')?.kind).toBe('path');
  });

  it('reports maxLevel 1 for unlocks and the level count for paths', () => {
    for (const node of ResearchRegistry.allNodes()) {
      if (node.kind === 'unlock') {
        expect(node.maxLevel).toBe(1);
        expect(ResearchRegistry.findUnlock(node.id)).toBeDefined();
      } else {
        expect(node.maxLevel).toBe(ResearchRegistry.findPath(node.id)!.levels.length);
        expect(node.maxLevel).toBeGreaterThan(0);
      }
    }
  });
});
