import { vi } from 'vitest';
import type { IParticle } from '../particles/AbstractParticle';

export function createMockParticle(overrides: Partial<IParticle> = {}): IParticle {
  const defaults: IParticle = {
    id: 0,
    x: 0,
    y: 0,
    vx: 100,
    vy: 0,
    health: 3,
    maxHealth: 3,
    attack: 1,
    radius: 3,
    speed: 180,
    owner: 0,
    alive: true,
    spawnX: 0,
    spawnY: 0,
    age: 0,
    typeName: 'mock',
    canMove: true,
    sprite: null,
    trail: null,
    update: vi.fn(),
    onCollide: vi.fn(function (this: IParticle, other: IParticle) {
      this.health -= other.attack;
      if (this.health <= 0) this.alive = false;
    }),
    onDeath: vi.fn(),
    getBaseDamage: vi.fn(() => 1),
    isStuck: vi.fn(() => false),
    takeDamage: vi.fn(function (this: IParticle, amount: number) {
      this.health -= amount;
      if (this.health <= 0) this.alive = false;
    }),
    destroy: vi.fn(),
  };

  return { ...defaults, ...overrides };
}
