/**
 * Click feedback (pulse / shake) for menu buttons.
 *
 * Each helper first restores the button to its home transform and kills any
 * in-flight tween. Without that, rapidly re-triggering feedback starts a new
 * tween whose "from" value is the mid-tween position/scale, so the yoyo settles
 * on the wrong value and the background rectangle permanently drifts away from
 * its (untweened) label text.
 */

/** Data key holding a button's untweened x position. */
export const HOME_X_KEY = 'feedbackHomeX';

export interface FeedbackTarget {
  x: number;
  scaleX: number;
  scaleY: number;
  getData(key: string): unknown;
  setData(key: string, value: unknown): unknown;
}

export interface FeedbackTweenConfig {
  targets: object;
  duration: number;
  ease: string;
  yoyo: boolean;
  repeat?: number;
  x?: number;
  scaleX?: number;
  scaleY?: number;
  onComplete: () => void;
}

export interface FeedbackTweens {
  killTweensOf(target: object): unknown;
  add(config: FeedbackTweenConfig): unknown;
}

const PULSE_SCALE = 1.15;
const PULSE_DURATION_MS = 80;
const SHAKE_OFFSET_PX = 3;
const SHAKE_DURATION_MS = 40;

/** Kills running feedback tweens and restores the home transform. Returns home x. */
export function resetFeedbackTransform(tweens: FeedbackTweens, target: FeedbackTarget): number {
  const stored = target.getData(HOME_X_KEY);
  const homeX = typeof stored === 'number' ? stored : target.x;
  target.setData(HOME_X_KEY, homeX);
  tweens.killTweensOf(target);
  target.x = homeX;
  target.scaleX = 1;
  target.scaleY = 1;
  return homeX;
}

/** Success feedback: a short scale pulse that always settles back at scale 1. */
export function pulseButton(tweens: FeedbackTweens, target: FeedbackTarget, scale: number = PULSE_SCALE): void {
  const homeX = resetFeedbackTransform(tweens, target);
  tweens.add({
    targets: target,
    scaleX: scale,
    scaleY: scale,
    duration: PULSE_DURATION_MS,
    yoyo: true,
    ease: 'Quad.easeOut',
    onComplete: () => {
      target.x = homeX;
      target.scaleX = 1;
      target.scaleY = 1;
    },
  });
}

/** Rejection feedback: a horizontal shake that always settles back at home x. */
export function shakeButton(tweens: FeedbackTweens, target: FeedbackTarget): void {
  const homeX = resetFeedbackTransform(tweens, target);
  tweens.add({
    targets: target,
    x: homeX + SHAKE_OFFSET_PX,
    duration: SHAKE_DURATION_MS,
    yoyo: true,
    repeat: 2,
    ease: 'Sine.inOut',
    onComplete: () => {
      target.x = homeX;
    },
  });
}
