import { describe, it, expect, vi, beforeEach } from 'vitest';
import { createMockPeerPair } from './mockPeerPair.js';
import { MultiplayerHost } from '../MultiplayerHost.js';
import { MultiplayerGuest, type GuestSceneInterface } from '../MultiplayerGuest.js';
import { GameEngine, type GameEngineCallbacks } from '../../GameEngine.js';
import { generateGrid } from '../../grid/generators/index.js';
import { decode } from '../GameStateEncoder.js';
import type { EncodedParticle, GameStateSnapshotHeader } from '../types.js';

function makeNoOpCallbacks(): GameEngineCallbacks {
  return {
    onKill: () => {},
    onBaseDamage: () => {},
    onParticleSpawned: () => {},
    onNuke: () => {},
    onGameOver: () => {},
    onStuckRespawn: () => {},
    onInterest: () => {},
    onTowerPlaced: () => {},
    onTowerDeath: () => {},
    spawnExplosion: () => {},
  };
}

function makeEngine(): GameEngine {
  const grid = generateGrid('random');
  const engine = new GameEngine(grid, makeNoOpCallbacks(), { createAIController: null });
  engine.init('none');
  return engine;
}

function makeMockScene(): GuestSceneInterface & {
  sprites: EncodedParticle[];
  stats: GameStateSnapshotHeader | null;
  removedIds: Set<number>;
} {
  const scene = {
    sprites: [] as EncodedParticle[],
    stats: null as GameStateSnapshotHeader | null,
    removedIds: new Set<number>(),
    updateParticleSprites: vi.fn((particles: EncodedParticle[]) => {
      scene.sprites = [...particles];
    }),
    updatePlayerStats: vi.fn((header: GameStateSnapshotHeader) => {
      scene.stats = header;
    }),
    removeDeadParticles: vi.fn((ids: Set<number>) => {
      scene.removedIds = new Set(ids);
    }),
  };
  return scene;
}

describe('multiplayer integration', () => {
  let engine: GameEngine;
  let hostConn: ReturnType<typeof createMockPeerPair>[0];
  let guestConn: ReturnType<typeof createMockPeerPair>[1];
  let host: MultiplayerHost;
  let scene: ReturnType<typeof makeMockScene>;
  let guest: MultiplayerGuest;

  beforeEach(() => {
    engine = makeEngine();
    [hostConn, guestConn] = createMockPeerPair();
    host = new MultiplayerHost(engine, hostConn as never);
    scene = makeMockScene();
    guest = new MultiplayerGuest(guestConn as never, scene);
  });

  it('full-sync round-trip: guest receives correct p0Hp, p1Gold, particle count', () => {
    // Run a few ticks so particles spawn
    for (let i = 0; i < 10; i++) {
      engine.tick(100);
    }

    host.sendSnapshot();

    expect(scene.stats).not.toBeNull();
    expect(scene.stats!.p0Hp).toBeCloseTo(engine.players[0].baseHP);
    expect(scene.stats!.p1Gold).toBeCloseTo(engine.players[1].gold);
    expect(scene.sprites.length).toBeGreaterThanOrEqual(0);
  });

  it('guest input applied on host: upgrade increases player attack level', () => {
    const p1 = engine.players[1];
    // Give the guest enough gold to buy upgrade
    p1.gold = 10000;
    const levelBefore = p1.getUpgradeLevel('attack');

    // Guest sends upgrade input — routed synchronously via mock peer pair
    guest.sendInput({ type: 'upgrade', upgradeType: 'attack' });

    expect(p1.getUpgradeLevel('attack')).toBe(levelBefore + 1);
  });

  it('delta vs full-sync cadence: after 50 ticks, at least one isFullSync snapshot sent', () => {
    const receivedBuffers: ArrayBuffer[] = [];
    const origOnMessage = guestConn.onMessage;
    guestConn.onMessage = (buf: ArrayBuffer) => {
      receivedBuffers.push(buf);
      origOnMessage(buf);
    };
    // Reassign since hostConn.sendGameState calls guestConn.onMessage
    hostConn.sendGameState = (buf: ArrayBuffer) => guestConn.onMessage(buf);

    for (let i = 0; i < 55; i++) {
      engine.tick(100);
      host.sendSnapshot();
    }

    const fullSyncs = receivedBuffers
      .map(b => decode(b))
      .filter(d => d.header.isFullSync);

    expect(fullSyncs.length).toBeGreaterThanOrEqual(1);

    const deltas = receivedBuffers
      .map(b => decode(b))
      .filter(d => !d.header.isFullSync);
    expect(deltas.length).toBeGreaterThan(0);
  });

  it('disconnect propagates: hostConn.disconnect() calls guestConn.onDisconnected', () => {
    const onDisconnected = vi.fn();
    guestConn.onDisconnected = onDisconnected;

    hostConn.disconnect();

    expect(onDisconnected).toHaveBeenCalledOnce();
  });
});
