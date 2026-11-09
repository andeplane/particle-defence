import { describe, it, expect } from 'vitest';
import { RateLimiter } from './rateLimit.js';

describe('RateLimiter', () => {
  it('allows first two requests within the window', () => {
    const limiter = new RateLimiter();
    expect(limiter.allow('1.2.3.4', 0)).toBe(true);
    expect(limiter.allow('1.2.3.4', 1000)).toBe(true);
  });

  it('rejects the third create_room within 60s from the same IP', () => {
    const limiter = new RateLimiter();
    limiter.allow('1.2.3.4', 0);
    limiter.allow('1.2.3.4', 1000);
    expect(limiter.allow('1.2.3.4', 2000)).toBe(false);
  });

  it('accepts a request after the window resets', () => {
    const limiter = new RateLimiter();
    limiter.allow('1.2.3.4', 0);
    limiter.allow('1.2.3.4', 1000);
    expect(limiter.allow('1.2.3.4', 2000)).toBe(false);

    // Advance past 60 s window
    expect(limiter.allow('1.2.3.4', 61_000)).toBe(true);
  });

  it('allows different IPs independently', () => {
    const limiter = new RateLimiter();
    limiter.allow('1.2.3.4', 0);
    limiter.allow('1.2.3.4', 1000);
    // Third from same IP should fail
    expect(limiter.allow('1.2.3.4', 2000)).toBe(false);
    // Different IP should still be allowed
    expect(limiter.allow('5.6.7.8', 2000)).toBe(true);
  });
});
