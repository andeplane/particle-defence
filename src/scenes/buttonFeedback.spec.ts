import { describe, it, expect, vi } from 'vitest';
import {
  HOME_X_KEY,
  pulseButton,
  resetFeedbackTransform,
  shakeButton,
  type FeedbackTarget,
  type FeedbackTweenConfig,
  type FeedbackTweens,
} from './buttonFeedback';

describe('buttonFeedback', () => {
  describe(resetFeedbackTransform.name, () => {
    it('records the current x as home on first use', () => {
      const { tweens, target } = createTarget({ x: 100 });

      const homeX = resetFeedbackTransform(tweens, target);

      expect(homeX).toBe(100);
      expect(target.getData(HOME_X_KEY)).toBe(100);
    });

    it('restores the stored home x and scale, and kills running tweens', () => {
      const { tweens, target } = createTarget({ x: 100 });
      resetFeedbackTransform(tweens, target);
      target.x = 103;
      target.scaleX = 1.15;
      target.scaleY = 1.15;

      const homeX = resetFeedbackTransform(tweens, target);

      expect(homeX).toBe(100);
      expect(target.x).toBe(100);
      expect(target.scaleX).toBe(1);
      expect(target.scaleY).toBe(1);
      expect(tweens.killTweensOf).toHaveBeenCalledWith(target);
    });
  });

  describe(shakeButton.name, () => {
    it('shakes relative to home x so repeated shakes do not drift', () => {
      const { tweens, target, configs } = createTarget({ x: 100 });

      shakeButton(tweens, target);
      // Simulate the tween being interrupted mid-flight at its peak offset.
      target.x = configs[0].x!;
      shakeButton(tweens, target);

      expect(configs[1].x).toBe(103);
      configs[1].onComplete();
      expect(target.x).toBe(100);
    });
  });

  describe(pulseButton.name, () => {
    it('always settles back at scale 1 and home x', () => {
      const { tweens, target, configs } = createTarget({ x: 100 });

      pulseButton(tweens, target);
      // Simulate the tween being interrupted mid-flight.
      target.scaleX = 1.15;
      target.scaleY = 1.15;
      target.x = 102;
      pulseButton(tweens, target);

      expect(configs[1].scaleX).toBe(1.15);
      expect(target.scaleX).toBe(1);
      configs[1].onComplete();
      expect(target.x).toBe(100);
      expect(target.scaleX).toBe(1);
      expect(target.scaleY).toBe(1);
    });

    it('honours a custom pulse scale', () => {
      const { tweens, target, configs } = createTarget({ x: 0 });

      pulseButton(tweens, target, 1.08);

      expect(configs[0].scaleX).toBe(1.08);
      expect(configs[0].scaleY).toBe(1.08);
    });
  });
});

function createTarget(init: { x: number }): {
  tweens: FeedbackTweens & { killTweensOf: ReturnType<typeof vi.fn> };
  target: FeedbackTarget;
  configs: FeedbackTweenConfig[];
} {
  const data = new Map<string, unknown>();
  const target: FeedbackTarget = {
    x: init.x,
    scaleX: 1,
    scaleY: 1,
    getData: (key: string) => data.get(key),
    setData: (key: string, value: unknown) => data.set(key, value),
  };
  const configs: FeedbackTweenConfig[] = [];
  const tweens = {
    killTweensOf: vi.fn(),
    add: (config: FeedbackTweenConfig) => configs.push(config),
  };
  return { tweens, target, configs };
}
