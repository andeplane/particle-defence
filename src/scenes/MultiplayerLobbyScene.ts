import Phaser from 'phaser';
import { CONFIG } from '../config.js';
import { SignalingClient } from '../multiplayer/SignalingClient.js';
import { createMenuButton } from './createMenuButton.js';

type LobbyState = 'idle' | 'creating' | 'waiting_for_peer' | 'joining' | 'connected' | 'error';

export class MultiplayerLobbyScene extends Phaser.Scene {
  private signalingClient!: SignalingClient;
  private state: LobbyState = 'idle';

  private statusText!: Phaser.GameObjects.Text;
  private roomCodeText!: Phaser.GameObjects.Text;
  private joinInput!: HTMLInputElement;
  private joinInputEl: Phaser.GameObjects.DOMElement | null = null;
  private joinErrorText!: Phaser.GameObjects.Text;

  constructor() {
    super({ key: 'MultiplayerLobbyScene' });
  }

  create(): void {
    const cx = CONFIG.GAME_WIDTH / 2;
    const cy = CONFIG.GAME_HEIGHT / 2;

    this.add.text(cx, cy - 220, 'Multiplayer', {
      fontSize: '48px',
      color: '#aaaaff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // --- Create Room Panel ---
    this.add.text(cx - 200, cy - 140, 'HOST', {
      fontSize: '22px',
      color: CONFIG.PLAYER1_COLOR_STR,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    createMenuButton(this, cx - 200, cy - 80, 220, 50,
      'Create Room', CONFIG.PLAYER1_COLOR, () => this.createRoom());

    this.roomCodeText = this.add.text(cx - 200, cy, '', {
      fontSize: '36px',
      color: '#ffffff',
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // --- Join Room Panel ---
    this.add.text(cx + 200, cy - 140, 'GUEST', {
      fontSize: '22px',
      color: CONFIG.PLAYER2_COLOR_STR,
      fontFamily: 'monospace',
      fontStyle: 'bold',
    }).setOrigin(0.5);

    // HTML input for room code
    this.joinInput = document.createElement('input');
    this.joinInput.type = 'text';
    this.joinInput.maxLength = 6;
    this.joinInput.placeholder = 'Room code';
    this.joinInput.style.cssText = [
      'background: #111122',
      'color: #ffffff',
      'border: 2px solid #aa4466',
      'font-family: monospace',
      'font-size: 20px',
      'text-align: center',
      'text-transform: uppercase',
      'padding: 6px 10px',
      'width: 160px',
      'outline: none',
    ].join(';');
    this.joinInput.addEventListener('input', () => {
      this.joinInput.value = this.joinInput.value.toUpperCase();
    });

    this.joinInputEl = this.add.dom(cx + 200, cy - 80, this.joinInput);

    createMenuButton(this, cx + 200, cy, 220, 50,
      'Join Room', CONFIG.PLAYER2_COLOR, () => this.joinRoom());

    this.joinErrorText = this.add.text(cx + 200, cy + 70, '', {
      fontSize: '16px',
      color: '#ff4466',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    // --- Shared status / back ---
    this.statusText = this.add.text(cx, cy + 140, '', {
      fontSize: '18px',
      color: '#aaaaaa',
      fontFamily: 'monospace',
    }).setOrigin(0.5);

    createMenuButton(this, cx, cy + 200, 160, 44,
      'Back', 0x555555, () => this.goBack());

    this.signalingClient = new SignalingClient();
    this.setupSignalingHandlers();
  }

  private setupSignalingHandlers(): void {
    this.signalingClient.on('open', () => {
      if (this.state === 'creating') {
        this.signalingClient.createRoom();
      } else if (this.state === 'joining') {
        const code = this.joinInput.value.trim().toUpperCase();
        this.signalingClient.joinRoom(code);
      }
    });

    this.signalingClient.on('room_created', ({ room }) => {
      this.state = 'waiting_for_peer';
      this.roomCodeText.setText(room);
      this.setStatus('Waiting for opponent…');
    });

    this.signalingClient.on('peer_joined', () => {
      this.state = 'connected';
      this.setStatus('Opponent joined — starting game…');
      this.time.delayedCall(500, () => {
        this.launchGame('multiplayer-host');
      });
    });

    this.signalingClient.on('joined', () => {
      this.state = 'waiting_for_peer';
      this.setStatus('Waiting for game to start…');
    });

    this.signalingClient.on('room_not_found', () => {
      this.joinErrorText.setText('Room not found or has expired');
      this.time.delayedCall(3000, () => {
        if (this.joinErrorText.active) this.joinErrorText.setText('');
      });
      this.state = 'idle';
      this.setStatus('');
    });

    this.signalingClient.on('room_full', () => {
      this.joinErrorText.setText('Room is full — try a different code');
      this.state = 'idle';
      this.setStatus('');
    });

    this.signalingClient.on('peer_left', () => {
      if (this.state === 'waiting_for_peer') {
        this.setStatus('Room closed — opponent left');
        this.state = 'idle';
        this.roomCodeText.setText('');
        this.joinErrorText.setText('');
      }
    });

    this.signalingClient.on('error', ({ message }) => {
      this.setStatus(`Error: ${message}`);
      this.state = 'error';
    });

    this.signalingClient.on('close', () => {
      if (this.state !== 'connected' && this.state !== 'idle') {
        this.setStatus('Could not connect to signaling server');
      }
    });
  }

  private createRoom(): void {
    if (this.state !== 'idle') return;
    this.state = 'creating';
    this.setStatus('Connecting…');
    this.roomCodeText.setText('');

    const url = import.meta.env.VITE_SIGNALING_URL as string;
    try {
      this.signalingClient.connect(url);
    } catch {
      this.setStatus('Could not reach signaling server');
      this.state = 'idle';
    }
  }

  private joinRoom(): void {
    if (this.state !== 'idle') return;
    const code = this.joinInput.value.trim().toUpperCase();
    if (code.length !== 6) {
      this.joinErrorText.setText('Enter a 6-character room code');
      return;
    }
    this.state = 'joining';
    this.joinErrorText.setText('');
    this.setStatus('Connecting…');

    const url = import.meta.env.VITE_SIGNALING_URL as string;
    try {
      this.signalingClient.connect(url);
    } catch {
      this.setStatus('Could not reach signaling server');
      this.state = 'idle';
    }
  }

  private launchGame(role: 'multiplayer-host' | 'multiplayer-guest'): void {
    // Clean up DOM input before navigating
    this.joinInput.remove();
    this.scene.start('GameScene', { mode: role, signalingClient: this.signalingClient });
  }

  private goBack(): void {
    this.signalingClient.disconnect();
    this.joinInput.remove();
    this.scene.start('MenuScene');
  }

  private setStatus(msg: string): void {
    this.statusText.setText(msg);
  }

  shutdown(): void {
    this.joinInput?.remove();
  }
}
