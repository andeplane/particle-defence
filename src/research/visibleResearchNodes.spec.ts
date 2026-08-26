import { describe, it, expect, vi } from 'vitest';
import { getVisibleResearchNodes } from './visibleResearchNodes';
import type { IPlayer } from '../player';
import { TOWER_TYPE } from '../config';

function makePlayer(overrides: Partial<{
  hasLaser: boolean;
  hasWeakness: boolean;
  hasNuke: boolean;
}>): IPlayer {
  const { hasLaser = false, hasWeakness = false, hasNuke = false } = overrides;
  return {
    hasResearched: (type: string) => type === TOWER_TYPE.LASER ? hasLaser : type === TOWER_TYPE.WEAKNESS ? hasWeakness : false,
    hasUnlocked: (id: string) => id === 'unlock_nuke' ? hasNuke : false,
    getPathLevel: vi.fn(() => 0),
    getPathCost: vi.fn(() => 100),
    canPurchasePath: vi.fn(() => false),
    getUnlockCost: vi.fn(() => 200),
    canPurchaseUnlock: vi.fn(() => true),
    getResearchProgress: vi.fn(() => -1),
    getResearchRemainingMs: vi.fn(() => 0),
  } as unknown as IPlayer;
}

describe('getVisibleResearchNodes', () => {
  it('before any research: shows laser, weakness, nuke unlocks', () => {
    const nodes = getVisibleResearchNodes(makePlayer({}));
    const ids = nodes.map(n => n.id);
    expect(ids).toContain('unlock_laser');
    expect(ids).toContain('unlock_weakness');
    expect(ids).toContain('unlock_nuke');
    expect(ids).not.toContain('tower_regen');
    expect(ids).not.toContain('laser_bounce');
  });

  it('after laser: replaces laser unlock with bounce; adds overcharge, regen, range', () => {
    const nodes = getVisibleResearchNodes(makePlayer({ hasLaser: true }));
    const ids = nodes.map(n => n.id);
    expect(ids).not.toContain('unlock_laser');
    expect(ids).toContain('laser_bounce');
    expect(ids).toContain('laser_overcharge');
    expect(ids).toContain('tower_regen');
    expect(ids).toContain('tower_range');
    expect(ids).toContain('unlock_weakness'); // weakness still not researched
  });

  it('after weakness: replaces weakness unlock with slow; adds stun, regen, range', () => {
    const nodes = getVisibleResearchNodes(makePlayer({ hasWeakness: true }));
    const ids = nodes.map(n => n.id);
    expect(ids).not.toContain('unlock_weakness');
    expect(ids).toContain('weakness_slow');
    expect(ids).toContain('weakness_stun');
    expect(ids).toContain('tower_regen');
    expect(ids).toContain('tower_range');
    expect(ids).toContain('unlock_laser'); // laser still not researched
  });

  it('after both towers: all tier-2 researches visible, tier-1 unlocks gone', () => {
    const nodes = getVisibleResearchNodes(makePlayer({ hasLaser: true, hasWeakness: true }));
    const ids = nodes.map(n => n.id);
    expect(ids).not.toContain('unlock_laser');
    expect(ids).not.toContain('unlock_weakness');
    expect(ids).toContain('laser_bounce');
    expect(ids).toContain('laser_overcharge');
    expect(ids).toContain('weakness_slow');
    expect(ids).toContain('weakness_stun');
    expect(ids).toContain('tower_regen');
    expect(ids).toContain('tower_range');
  });

  it('hides nuke unlock after nuke is researched', () => {
    const nodes = getVisibleResearchNodes(makePlayer({ hasNuke: true }));
    const ids = nodes.map(n => n.id);
    expect(ids).not.toContain('unlock_nuke');
  });
});
