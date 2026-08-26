import Phaser from 'phaser';

/** Camera zoom limits for pinch gestures on scrollable screens. */
const MIN_ZOOM = 1;
const MAX_ZOOM = 3;
/** Ignore pinch distances below this (px) to avoid divide-by-tiny jitter. */
const MIN_PINCH_DISTANCE = 1;
/** Phaser starts with mouse + 1 touch pointer; pinch needs one more. */
const EXTRA_TOUCH_POINTERS = 1;

export interface TouchScrollOptions {
  /**
   * Content height in world px; when given, camera bounds are set so scrolling
   * never leaves [0, contentHeight]. Omit if the scene manages its own bounds.
   */
  contentHeight?: number;
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
  scene.input.addPointer(EXTRA_TOUCH_POINTERS);

  let pinchStartDistance = 0;
  let pinchStartZoom = cam.zoom;

  const activeTouches = () => scene.input.manager.pointers.filter(p => p.isDown && p.wasTouch);

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
      const zoom = Phaser.Math.Clamp(pinchStartZoom * (distance / pinchStartDistance), MIN_ZOOM, MAX_ZOOM);
      cam.setZoom(zoom);
      return;
    }

    pinchStartDistance = 0;
    if (!pointer.isDown) return;
    // Drag: move the camera opposite to finger motion, in world units.
    cam.scrollX -= (pointer.x - pointer.prevPosition.x) / cam.zoom;
    cam.scrollY -= (pointer.y - pointer.prevPosition.y) / cam.zoom;
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
