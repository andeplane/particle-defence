let _isMobile: boolean | null = null;

export function isMobile(): boolean {
  if (_isMobile === null) {
    if (typeof window === 'undefined') {
      _isMobile = false;
    } else {
      const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
      _isMobile = hasTouch && coarsePointer;
    }
  }
  return _isMobile;
}
