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

/** Touch targets and text need to be much larger on phones; 1 on desktop. */
export const MOBILE_UI_SCALE = 1.6;

export function uiScale(): number {
  return isMobile() ? MOBILE_UI_SCALE : 1;
}

/** Titles are already huge; scale them less than buttons on phones so they fit the width. */
export const MOBILE_TITLE_SCALE = 1.15;

export function titleScale(): number {
  return isMobile() ? MOBILE_TITLE_SCALE : 1;
}
