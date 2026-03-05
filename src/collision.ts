import type { AbstractParticle, GameContext } from './particles';
import { CONFIG } from './config';

export interface CollisionResult {
  kills: { killer: AbstractParticle; victim: AbstractParticle }[];
}

export function resolveCollisions(context: GameContext): CollisionResult {
  const { particles, spatialHash, players } = context;
  const result: CollisionResult = { kills: [] };
  const processed = new Set<number>();

  for (const p of particles) {
    if (!p.alive) continue;

    const nearby = spatialHash.getNearby(p);
    for (const other of nearby) {
      if (!other.alive) continue;
      if (p.owner === other.owner) continue;

      const lo = Math.min(p.id, other.id);
      const hi = Math.max(p.id, other.id);
      const pairKey = (lo + hi) * (lo + hi + 1) / 2 + hi;

      if (processed.has(pairKey)) continue;

      const dx = other.x - p.x;
      const dy = other.y - p.y;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const minDist = p.radius + other.radius;

      if (dist < minDist && dist > 0) {
        processed.add(pairKey);

        p.onCollide(other, context);
        other.onCollide(p, context);

        const nx = dx / dist;
        const ny = dy / dist;
        const overlap = minDist - dist;

        p.x -= nx * overlap * 0.5;
        p.y -= ny * overlap * 0.5;
        other.x += nx * overlap * 0.5;
        other.y += ny * overlap * 0.5;

        const dvx = p.vx - other.vx;
        const dvy = p.vy - other.vy;
        const dot = dvx * nx + dvy * ny;

        p.vx -= dot * nx;
        p.vy -= dot * ny;
        other.vx += dot * nx;
        other.vy += dot * ny;

        if (!p.alive) {
          p.onDeath(context);
          result.kills.push({ killer: other, victim: p });
          players[other.owner].gold += CONFIG.KILL_REWARD;
          players[other.owner].kills++;
        }
        if (!other.alive) {
          other.onDeath(context);
          result.kills.push({ killer: p, victim: other });
          players[p.owner].gold += CONFIG.KILL_REWARD;
          players[p.owner].kills++;
        }
      }
    }
  }

  return result;
}
