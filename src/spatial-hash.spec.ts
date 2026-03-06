import { describe, it, expect, beforeEach } from 'vitest';
import { SpatialHash } from './spatial-hash';
import { createMockParticle } from './__mocks__/createMockParticle';

describe(SpatialHash.name, () => {
  const CELL_SIZE = 32;
  const GAME_WIDTH = 256;
  let hash: SpatialHash;

  beforeEach(() => {
    hash = new SpatialHash(CELL_SIZE, GAME_WIDTH);
  });

  it('getNearby returns particle inserted in same cell', () => {
    const query = createMockParticle({ id: 1, x: 10, y: 10 });
    const other = createMockParticle({ id: 2, x: 15, y: 15 });

    hash.insert(query);
    hash.insert(other);

    const nearby = hash.getNearby(query);
    expect(nearby).toContain(other);
  });

  it('getNearby excludes the querying particle itself', () => {
    const query = createMockParticle({ id: 1, x: 10, y: 10 });
    hash.insert(query);

    const nearby = hash.getNearby(query);
    expect(nearby).not.toContain(query);
  });

  it('getNearby returns particles from adjacent cells', () => {
    const query = createMockParticle({ id: 1, x: 33, y: 33 });
    const adjacent = createMockParticle({ id: 2, x: 10, y: 10 });

    hash.insert(query);
    hash.insert(adjacent);

    const nearby = hash.getNearby(query);
    expect(nearby).toContain(adjacent);
  });

  it('getNearby returns empty for isolated particle', () => {
    const query = createMockParticle({ id: 1, x: 10, y: 10 });
    const farAway = createMockParticle({ id: 2, x: 200, y: 200 });

    hash.insert(query);
    hash.insert(farAway);

    const nearby = hash.getNearby(query);
    expect(nearby).not.toContain(farAway);
  });

  it('clear empties all buckets', () => {
    const p1 = createMockParticle({ id: 1, x: 10, y: 10 });
    const p2 = createMockParticle({ id: 2, x: 15, y: 15 });

    hash.insert(p1);
    hash.insert(p2);
    hash.clear();

    const nearby = hash.getNearby(p1);
    expect(nearby).toHaveLength(0);
  });

  it('correctly buckets particles at cell edges', () => {
    // Particle at exactly 32,32 should be in cell (1,1)
    const atEdge = createMockParticle({ id: 1, x: 32, y: 32 });
    // Particle at 31,31 should be in cell (0,0)
    const justBefore = createMockParticle({ id: 2, x: 31, y: 31 });

    hash.insert(atEdge);
    hash.insert(justBefore);

    // They are in adjacent cells, so should still find each other
    const nearbyFromEdge = hash.getNearby(atEdge);
    expect(nearbyFromEdge).toContain(justBefore);
  });

  it('returns multiple nearby particles', () => {
    const query = createMockParticle({ id: 1, x: 16, y: 16 });
    const p2 = createMockParticle({ id: 2, x: 10, y: 10 });
    const p3 = createMockParticle({ id: 3, x: 20, y: 20 });

    hash.insert(query);
    hash.insert(p2);
    hash.insert(p3);

    const nearby = hash.getNearby(query);
    expect(nearby).toContain(p2);
    expect(nearby).toContain(p3);
    expect(nearby).toHaveLength(2);
  });
});
