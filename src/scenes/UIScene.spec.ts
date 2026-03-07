import { describe, it, expect } from 'vitest';
import { getClearedUIState } from './UISceneState';

describe('UIScene state cleanup', () => {
  it('getClearedUIState returns empty arrays to prevent stale speed-button refs on scene restart', () => {
    const cleared = getClearedUIState();

    expect(cleared.speedButtons).toEqual([]);
    expect(cleared.buttons).toEqual([]);
    expect(cleared.nukeButtons).toEqual([]);
    expect(cleared.categoryButtons).toEqual([]);
    expect(cleared.backButtons).toEqual([]);
    expect(cleared.researchButtons).toEqual([]);
    expect(cleared.constructButtons).toEqual([]);
    expect(cleared.placeButtons).toEqual([]);
    expect(cleared.popups).toEqual([]);
  });
});
