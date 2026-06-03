export type SignalingEventMap = {
  room_created: { room: string };
  joined: { polite: true };
  peer_joined: Record<string, never>;
  room_full: Record<string, never>;
  room_not_found: Record<string, never>;
  peer_left: Record<string, never>;
  offer: { sdp: RTCSessionDescriptionInit };
  answer: { sdp: RTCSessionDescriptionInit };
  ice: { candidate: RTCIceCandidateInit };
  error: { message: string };
  open: Record<string, never>;
  close: Record<string, never>;
};

type Handler<T> = (payload: T) => void;
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type HandlerMap = { [K in keyof SignalingEventMap]?: Handler<any>[] };

export class SignalingClient {
  private ws: WebSocket | null = null;
  private handlers: HandlerMap = {};

  connect(url: string): void {
    this.ws = new WebSocket(url);
    this.ws.addEventListener('open', () => this.emit('open', {}));
    this.ws.addEventListener('close', () => this.emit('close', {}));
    this.ws.addEventListener('message', (ev: MessageEvent<string>) => {
      let msg: { type: keyof SignalingEventMap } & Record<string, unknown>;
      try {
        msg = JSON.parse(ev.data) as typeof msg;
      } catch {
        return;
      }
      this.emit(msg.type, msg);
    });
  }

  createRoom(): void {
    this.send({ type: 'create_room' });
  }

  joinRoom(code: string): void {
    this.send({ type: 'join', room: code });
  }

  on<K extends keyof SignalingEventMap>(type: K, handler: Handler<SignalingEventMap[K]>): void {
    if (!this.handlers[type]) this.handlers[type] = [];
    this.handlers[type]!.push(handler);
  }

  off<K extends keyof SignalingEventMap>(type: K, handler: Handler<SignalingEventMap[K]>): void {
    const list = this.handlers[type];
    if (list) {
      this.handlers[type] = list.filter(h => h !== handler);
    }
  }

  send(msg: object): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(msg));
    }
  }

  disconnect(): void {
    this.ws?.close();
    this.ws = null;
  }

  private emit(type: keyof SignalingEventMap, payload: unknown): void {
    const list = this.handlers[type];
    if (list) {
      for (const h of list) {
        h(payload);
      }
    }
  }
}
