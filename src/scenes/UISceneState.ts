import type { MenuCategory } from './menuConfig';

/** Cleared state for UIScene to prevent stale Phaser object refs on scene restart. */
export interface UIClearedState {
  speedButtons: { bg: unknown; label: unknown; speed: number }[];
  buttons: unknown[];
  nukeButtons: unknown[];
  categoryButtons: unknown[];
  backButtons: unknown[];
  researchButtons: unknown[];
  constructButtons: unknown[];
  placeButtons: unknown[];
  popups: unknown[];
  activeCategory: [MenuCategory | null, MenuCategory | null];
  categoryTitle: [null, null];
  placeholderText: [null, null];
  tooltipText: [null, null];
  selectedTowerIndex: [number, number];
}

export function getClearedUIState(): UIClearedState {
  return {
    speedButtons: [],
    buttons: [],
    nukeButtons: [],
    categoryButtons: [],
    backButtons: [],
    researchButtons: [],
    constructButtons: [],
    placeButtons: [],
    popups: [],
    activeCategory: [null, null],
    categoryTitle: [null, null],
    placeholderText: [null, null],
    tooltipText: [null, null],
    selectedTowerIndex: [0, 0],
  };
}
