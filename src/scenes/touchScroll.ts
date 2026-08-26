import Phaser from 'phaser';

/** Camera zoom limits for pinch gestures on scrollable screens. */
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
/** Ignore pinch distances below this (px) to avoid divide-by-tiny jitter. */
const MIN_PINCH_DISTANCE = 1;
/** Phaser starts with mouse + 1 touch pointer; pinch needs one more (3 total). */
const POINTERS_NEEDED_FOR_PINCH = 3;
/** A press that moves less than this (px) before release counts as a tap, not a drag. */
const TAP_MOVE_THRESHOLD = 12;

/** Anything that can be re-positioned and re-scaled to stay fixed on screen while the camera zooms. */
type HudObject = Phaser.GameObjects.Components.Transform & Phaser.GameObjects.Components.ScrollFactor;

export interface TouchScrollOptions {
  /**
   * Content height in world px; when given, camera bounds are set so scrolling
   * never leaves [0, contentHeight]. Omit if the scene manages its own bounds.
   */
  contentHeight?: number;
  /**
   * Fixed-on-screen objects (scrollFactor 0). Camera zoom would otherwise scale
   * them away from the screen centre and push them off-screen; they are
   * counter-transformed on every zoom change so they stay put.
   */
  hud?: readonly HudObject[];
  /**
   * How many fingers drag the view. 1 (default): one finger scrolls vertically.
   * 2: one finger is left free for the scene (e.g. placing a chart marker); two
   * fingers pan in both axes, and pinching still zooms.
   */
  panFingers?: 1 | 2;
}

/**
 * Touch navigation for tall, scrollable scenes (stats, how-to-play):
 * one finger drags to scroll, two fingers pinch to zoom the main camera.
 * Mouse wheel handling stays with the caller. Returns a cleanup function.
 */
export function enableTouchScroll(scene: Phaser.Scene, opts: TouchScrollOptions): () => void {
  const cam = scene.cameras.main;
  if (opts.contentHeight !== undefined) {
    cam.setBounds(0, 0, cam.width, Math.max(opts.contentHeight, cam.height));
  }
  // The InputManager is global and pointers are never removed, so only add once.
  const manager = scene.input.manager;
  if (manager.pointersTotal < POINTERS_NEEDED_FOR_PINCH) {
    scene.input.addPointer(POINTERS_NEEDED_FOR_PINCH - manager.pointersTotal);
  }

  const hud = (opts.hud ?? []).map(obj => ({ obj, x: obj.x, y: obj.y }));
  const applyZoom = (zoom: number) => {
    cam.setZoom(zoom);
    // scrollFactor-0 objects render at centre + (pos - centre) * zoom; invert that.
    const cx = cam.width / 2;
    const cy = cam.height / 2;
    for (const { obj, x, y } of hud) {
      obj.setScale(1 / zoom);
      obj.setPosition(cx + (x - cx) / zoom, cy + (y - cy) / zoom);
    }
  };

  const panFingers = opts.panFingers ?? 1;
  let pinchStartDistance = 0;
  let pinchStartZoom = cam.zoom;

  /** Move the camera opposite to finger motion (screen px), in world units. */
  const pan = (dx: number, dy: number) => {
    cam.scrollX -= dx / cam.zoom;
    cam.scrollY -= dy / cam.zoom;
  };

  const activeTouches = () => manager.pointers.filter(p => p.isDown && p.wasTouch);

  const onMove = (pointer: Phaser.Input.Pointer) => {
    if (!pointer.wasTouch) return;
    const touches = activeTouches();

    if (touches.length >= 2) {
      const [a, b] = touches;
      const distance = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      if (pinchStartDistance < MIN_PINCH_DISTANCE) {
        pinchStartDistance = distance;
        pinchStartZoom = cam.zoom;
        return;
      }
      applyZoom(Phaser.Math.Clamp(pinchStartZoom * (distance / pinchStartDistance), MIN_ZOOM, MAX_ZOOM));
      if (panFingers === 2) {
        // Two-finger pan: follow the midpoint of the two touches. Only the moving
        // pointer has a fresh prevPosition, so use its delta alone (halved: the
        // midpoint moves half as far as one finger).
        pan((pointer.x - pointer.prevPosition.x) / 2, (pointer.y - pointer.prevPosition.y) / 2);
      }
      return;
    }

    pinchStartDistance = 0;
    if (!pointer.isDown || panFingers !== 1) return;
    pan(pointer.x - pointer.prevPosition.x, pointer.y - pointer.prevPosition.y);
  };

  const onUp = () => {
    if (activeTouches().length < 2) pinchStartDistance = 0;
  };

  scene.input.on(Phaser.Input.Events.POINTER_MOVE, onMove);
  scene.input.on(Phaser.Input.Events.POINTER_UP, onUp);

  return () => {
    scene.input.off(Phaser.Input.Events.POINTER_MOVE, onMove);
    scene.input.off(Phaser.Input.Events.POINTER_UP, onUp);
  };
}

/**
 * Fires `onTap` when the pointer is released over `obj` without having dragged.
 * Use instead of `pointerdown` on buttons in scrollable scenes, so a swipe that
 * happens to start on a button scrolls instead of activating it.
 */
export function onTap(obj: Phaser.GameObjects.GameObject, handler: () => void): void {
  obj.on(Phaser.Input.Events.GAMEOBJECT_POINTER_UP, (pointer: Phaser.Input.Pointer) => {
    if (pointer.getDistance() <= TAP_MOVE_THRESHOLD) handler();
  });
}
