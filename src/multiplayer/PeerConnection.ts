import type { PlayerInputMessage } from './types.js';
import type { SignalingClient } from './SignalingClient.js';

const ICE_SERVERS: RTCIceServer[] = [
  { urls: 'stun:stun.l.google.com:19302' },
  { urls: 'stun:stun1.l.google.com:19302' },
];

// Append TURN server if env vars are set at build time
const TURN_URL = import.meta.env.VITE_TURN_URL as string | undefined;
const TURN_USERNAME = import.meta.env.VITE_TURN_USERNAME as string | undefined;
const TURN_CREDENTIAL = import.meta.env.VITE_TURN_CREDENTIAL as string | undefined;
if (TURN_URL) {
  ICE_SERVERS.push({ urls: TURN_URL, username: TURN_USERNAME, credential: TURN_CREDENTIAL });
}

export interface PeerConnectionOptions {
  isPolite: boolean;
  signalingClient: SignalingClient;
  onMessage: (buffer: ArrayBuffer) => void;
  onInputMessage: (msg: PlayerInputMessage) => void;
  onConnected: () => void;
  onDisconnected: () => void;
}

export class PeerConnection {
  private pc: RTCPeerConnection;
  private gameStateChannel: RTCDataChannel | null = null;
  private inputChannel: RTCDataChannel | null = null;
  private makingOffer = false;
  private pendingCandidates: RTCIceCandidateInit[] = [];
  private remoteDescSet = false;
  private channelsOpen = 0;
  private disconnectTimer: ReturnType<typeof setTimeout> | null = null;

  private readonly isPolite: boolean;
  private readonly signalingClient: SignalingClient;
  private readonly onMessage: (buffer: ArrayBuffer) => void;
  private readonly onInputMessage: (msg: PlayerInputMessage) => void;
  private readonly onConnected: () => void;
  private readonly onDisconnected: () => void;

  constructor(opts: PeerConnectionOptions) {
    this.isPolite = opts.isPolite;
    this.signalingClient = opts.signalingClient;
    this.onMessage = opts.onMessage;
    this.onInputMessage = opts.onInputMessage;
    this.onConnected = opts.onConnected;
    this.onDisconnected = opts.onDisconnected;

    this.pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });

    if (!this.isPolite) {
      // Impolite peer (host) creates DataChannels
      this.gameStateChannel = this.pc.createDataChannel('game-state', {
        ordered: false,
        maxRetransmits: 0,
      });
      this.inputChannel = this.pc.createDataChannel('game-input', { ordered: true });
      this.wireDataChannel(this.gameStateChannel, 'game-state');
      this.wireDataChannel(this.inputChannel, 'game-input');
    } else {
      // Polite peer (guest) receives DataChannels
      this.pc.ondatachannel = (ev) => {
        if (ev.channel.label === 'game-state') {
          this.gameStateChannel = ev.channel;
          this.wireDataChannel(this.gameStateChannel, 'game-state');
        } else if (ev.channel.label === 'game-input') {
          this.inputChannel = ev.channel;
          this.wireDataChannel(this.inputChannel, 'game-input');
        }
      };
    }

    this.pc.onicecandidate = ({ candidate }) => {
      if (candidate) {
        this.signalingClient.send({ type: 'ice', candidate: candidate.toJSON() });
      }
    };

    this.pc.onnegotiationneeded = async () => {
      try {
        this.makingOffer = true;
        const offer = await this.pc.createOffer();
        if (this.pc.signalingState !== 'stable') return;
        await this.pc.setLocalDescription(offer);
        this.signalingClient.send({ type: 'offer', sdp: this.pc.localDescription! });
      } catch (e) {
        console.error('negotiation error', e);
      } finally {
        this.makingOffer = false;
      }
    };

    this.pc.onconnectionstatechange = () => {
      const state = this.pc.connectionState;
      if (state === 'connected') {
        if (this.disconnectTimer) {
          clearTimeout(this.disconnectTimer);
          this.disconnectTimer = null;
        }
      } else if (state === 'failed') {
        this.handleDisconnect();
      } else if (state === 'disconnected') {
        // Wait 15 s before treating as hard failure (transient disconnects can recover)
        this.disconnectTimer = setTimeout(() => this.handleDisconnect(), 15_000);
      }
    };

    this.wireSignalingHandlers();
  }

  private wireDataChannel(ch: RTCDataChannel, label: string): void {
    ch.onopen = () => {
      this.channelsOpen++;
      if (this.channelsOpen === 2) {
        this.onConnected();
      }
    };
    ch.onclose = () => {
      this.channelsOpen = Math.max(0, this.channelsOpen - 1);
    };
    ch.onmessage = (ev) => {
      if (label === 'game-state') {
        if (ev.data instanceof ArrayBuffer) {
          this.onMessage(ev.data);
        } else if (ev.data instanceof Blob) {
          ev.data.arrayBuffer().then(buf => this.onMessage(buf));
        }
      } else if (label === 'game-input') {
        try {
          const msg = JSON.parse(ev.data as string) as PlayerInputMessage;
          this.onInputMessage(msg);
        } catch { /* malformed input */ }
      }
    };
  }

  private wireSignalingHandlers(): void {
    this.signalingClient.on('offer', async ({ sdp }) => {
      const offerCollision = this.makingOffer || this.pc.signalingState !== 'stable';
      const ignoreOffer = !this.isPolite && offerCollision;
      if (ignoreOffer) return;

      if (offerCollision) {
        await Promise.all([
          this.pc.setLocalDescription({ type: 'rollback' }),
          this.pc.setRemoteDescription(sdp),
        ]);
      } else {
        await this.pc.setRemoteDescription(sdp);
      }

      this.remoteDescSet = true;
      await this.flushPendingCandidates();

      const answer = await this.pc.createAnswer();
      await this.pc.setLocalDescription(answer);
      this.signalingClient.send({ type: 'answer', sdp: this.pc.localDescription! });
    });

    this.signalingClient.on('answer', async ({ sdp }) => {
      await this.pc.setRemoteDescription(sdp);
      this.remoteDescSet = true;
      await this.flushPendingCandidates();
    });

    this.signalingClient.on('ice', async ({ candidate }) => {
      if (this.remoteDescSet) {
        try {
          await this.pc.addIceCandidate(candidate);
        } catch { /* ignore invalid candidates */ }
      } else {
        this.pendingCandidates.push(candidate);
      }
    });

    this.signalingClient.on('peer_left', () => {
      this.handleDisconnect();
    });
  }

  private async flushPendingCandidates(): Promise<void> {
    for (const c of this.pendingCandidates) {
      try {
        await this.pc.addIceCandidate(c);
      } catch { /* ignore */ }
    }
    this.pendingCandidates = [];
  }

  private handleDisconnect(): void {
    if (this.disconnectTimer) {
      clearTimeout(this.disconnectTimer);
      this.disconnectTimer = null;
    }
    this.onDisconnected();
  }

  sendGameState(buffer: ArrayBuffer): void {
    if (this.gameStateChannel?.readyState === 'open') {
      this.gameStateChannel.send(buffer);
    }
  }

  sendInput(msg: PlayerInputMessage): void {
    if (this.inputChannel?.readyState === 'open') {
      this.inputChannel.send(JSON.stringify(msg));
    }
  }

  disconnect(): void {
    if (this.disconnectTimer) clearTimeout(this.disconnectTimer);
    this.gameStateChannel?.close();
    this.inputChannel?.close();
    this.pc.close();
  }
}
