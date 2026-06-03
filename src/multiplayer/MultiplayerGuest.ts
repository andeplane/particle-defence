import { decode } from './GameStateEncoder.js';
import type { PeerConnection } from './PeerConnection.js';
import type { PlayerInputMessage, EncodedParticle, GameStateSnapshotHeader } from './types.js';

/** Minimal interface to update the Phaser scene without importing it directly (avoids circular deps). */
export interface GuestSceneInterface {
  updateParticleSprites(particles: EncodedParticle[]): void;
  updatePlayerStats(header: GameStateSnapshotHeader): void;
  removeDeadParticles(aliveIds: Set<number>): void;
}

interface SnapshotBuffer {
  receivedAt: number;
  header: GameStateSnapshotHeader;
  particles: Map<number, EncodedParticle>;
}

const RENDER_DELAY_MS = 100;

export class MultiplayerGuest {
  private snapshotBuffer: SnapshotBuffer[] = [];
  private lastAppliedTick = -1;
  /** All known particles by id (merged from full-sync and deltas). */
  private particleState = new Map<number, EncodedParticle>();
  private peer: PeerConnection;
  private scene: GuestSceneInterface;

  constructor(peer: PeerConnection, scene: GuestSceneInterface) {
    this.peer = peer;
    this.scene = scene;
    peer.onMessage = (buffer: ArrayBuffer) => this.handleSnapshot(buffer);
  }

  private handleSnapshot(buffer: ArrayBuffer): void {
    const { header, particles } = decode(buffer);

    // Ignore out-of-order snapshots
    if (header.tick <= this.lastAppliedTick && !header.isFullSync) return;

    // Build a particle map for this snapshot
    const particleMap = new Map<number, EncodedParticle>();
    for (const p of particles) {
      particleMap.set(p.id, p);
    }

    this.snapshotBuffer.push({ receivedAt: Date.now(), header, particles: particleMap });

    // Keep only the last 2 snapshots for interpolation
    while (this.snapshotBuffer.length > 2) {
      this.snapshotBuffer.shift();
    }

    this.renderAtDelay();
  }

  /** Call from the game loop to render interpolated state. */
  renderAtDelay(): void {
    if (this.snapshotBuffer.length === 0) return;

    const renderTime = Date.now() - RENDER_DELAY_MS;

    // Find the snapshot pair to interpolate between
    let older: SnapshotBuffer | null = null;
    let newer: SnapshotBuffer | null = null;

    for (const snap of this.snapshotBuffer) {
      if (snap.receivedAt <= renderTime) {
        older = snap;
      } else if (!newer) {
        newer = snap;
      }
    }

    // Apply the best available snapshot
    const snap = older ?? this.snapshotBuffer[0];
    if (!snap) return;
    if (snap.header.tick <= this.lastAppliedTick && !snap.header.isFullSync) return;

    this.lastAppliedTick = snap.header.tick;

    if (snap.header.isFullSync) {
      // Replace entire particle state; particles not in this snapshot are dead
      this.particleState = new Map(snap.particles);
    } else {
      // Merge delta into existing state
      for (const [id, p] of snap.particles) {
        this.particleState.set(id, p);
      }
    }

    // If we have two snapshots, interpolate positions
    if (older && newer) {
      const t0 = older.receivedAt;
      const t1 = newer.receivedAt;
      const alpha = t1 === t0 ? 1 : (renderTime - t0) / (t1 - t0);
      const clamped = Math.min(1, Math.max(0, alpha));

      for (const [id, p] of this.particleState) {
        const newP = newer.particles.get(id);
        if (newP) {
          // Lerp position for smooth rendering
          this.particleState.set(id, {
            ...p,
            x: p.x + (newP.x - p.x) * clamped,
            y: p.y + (newP.y - p.y) * clamped,
          });
        }
      }
    }

    const aliveIds = new Set(this.particleState.keys());

    if (snap.header.isFullSync) {
      this.scene.removeDeadParticles(aliveIds);
    }

    this.scene.updateParticleSprites(Array.from(this.particleState.values()));
    this.scene.updatePlayerStats(snap.header);
  }

  /** Send a player input action to the host. */
  sendInput(msg: PlayerInputMessage): void {
    this.peer.sendInput(msg);
  }
}
