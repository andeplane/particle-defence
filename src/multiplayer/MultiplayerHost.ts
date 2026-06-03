import type { GameEngine } from '../GameEngine.js';
import type { PeerConnection } from './PeerConnection.js';
import type { PlayerInputMessage } from './types.js';
import type { AbstractParticle } from '../particles/AbstractParticle.js';
import { encode, UPGRADE_TYPE_ORDER } from './GameStateEncoder.js';
import type { GameStateSnapshotHeader } from './types.js';

const FULL_SYNC_EVERY_N_TICKS = 50;

export class MultiplayerHost {
  private ticksSinceFullSync = 0;
  private isFirstTick = true;
  private engine: GameEngine;
  private peer: PeerConnection;

  constructor(engine: GameEngine, peer: PeerConnection) {
    this.engine = engine;
    this.peer = peer;
    peer.onInputMessage = (msg: PlayerInputMessage) => this.applyGuestInput(msg);
  }

  /** Call after each engine.tick() to send a snapshot to the guest. */
  sendSnapshot(): void {
    const isFullSync = this.isFirstTick || this.ticksSinceFullSync >= FULL_SYNC_EVERY_N_TICKS;
    this.isFirstTick = false;

    const [p0, p1] = this.engine.players;
    const p0Upgrades = new Uint8Array(8);
    const p1Upgrades = new Uint8Array(8);
    for (let i = 0; i < UPGRADE_TYPE_ORDER.length; i++) {
      p0Upgrades[i] = p0.getUpgradeLevel(UPGRADE_TYPE_ORDER[i]);
      p1Upgrades[i] = p1.getUpgradeLevel(UPGRADE_TYPE_ORDER[i]);
    }

    const particles = this.engine.particles.filter(p => p.alive) as unknown as AbstractParticle[];

    const header: GameStateSnapshotHeader = {
      tick: this.engine.tickCount,
      isFullSync,
      particleCount: particles.length,
      p0Hp: p0.baseHP,
      p1Hp: p1.baseHP,
      p0Gold: p0.gold,
      p1Gold: p1.gold,
      p0Upgrades,
      p1Upgrades,
    };

    const buffer = encode(header, particles);
    this.peer.sendGameState(buffer);

    if (isFullSync) {
      this.ticksSinceFullSync = 0;
    } else {
      this.ticksSinceFullSync++;
    }
  }

  private applyGuestInput(msg: PlayerInputMessage): void {
    const guestPlayerId = 1 as const;
    const player = this.engine.players[guestPlayerId];

    switch (msg.type) {
      case 'upgrade': {
        if (player.canAfford(msg.upgradeType) && !player.isUpgradeAtMax(msg.upgradeType)) {
          player.buyUpgrade(msg.upgradeType);
        }
        break;
      }
      case 'nuke': {
        this.engine.launchNuke(guestPlayerId);
        break;
      }
      case 'tower_research': {
        this.engine.buyResearch(guestPlayerId, msg.towerType);
        break;
      }
      case 'tower_build': {
        const sites = this.engine.getEligibleTowerSites(guestPlayerId);
        if (sites.length > 0) {
          this.engine.constructTower(guestPlayerId, msg.towerType, sites[0].id);
        }
        break;
      }
      case 'tower_place': {
        this.engine.placeTower(guestPlayerId);
        break;
      }
      case 'tower_upgrade': {
        this.engine.upgradeTower(guestPlayerId, msg.towerIndex);
        break;
      }
    }
  }
}
