const WINDOW_MS = 60_000;
const MAX_CREATES_PER_WINDOW = 2;

interface Entry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private map = new Map<string, Entry>();

  /** Returns true if the request is allowed, false if rate-limited. */
  allow(ip: string, nowMs = Date.now()): boolean {
    const entry = this.map.get(ip);
    if (!entry || nowMs >= entry.resetAt) {
      this.map.set(ip, { count: 1, resetAt: nowMs + WINDOW_MS });
      return true;
    }
    if (entry.count >= MAX_CREATES_PER_WINDOW) {
      return false;
    }
    entry.count++;
    return true;
  }
}
