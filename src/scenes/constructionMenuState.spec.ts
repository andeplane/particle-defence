import { describe, expect, it } from 'vitest';
import type { TowerType } from '../config';
import {
  backFromConstructionState,
  createDefaultConstructionMenuState,
  getVisibleConstructionItems,
  selectConstructionTower,
} from './constructionMenuState';
import { MENU_CATEGORIES } from './menuConfig';

const constructionItems = MENU_CATEGORIES.find((category) => category.id === 'construction')!.items;

describe('construction menu state', () => {
  it('starts with tower type selection visible and no site selection', () => {
    const state = createDefaultConstructionMenuState();
    const visibleItems = getVisibleConstructionItems(constructionItems, state);

    expect(state).toEqual({ selectedTowerType: 'laser', siteSelectionActive: false });
    expect(visibleItems.map((item) => item.kind)).toEqual(['construct', 'construct']);
  });

  it.each<TowerType>(['laser', 'slow'])('selecting %s switches to site-selection controls', (towerType) => {
    const state = selectConstructionTower(createDefaultConstructionMenuState(), towerType);
    const visibleItems = getVisibleConstructionItems(constructionItems, state);

    expect(state).toEqual({ selectedTowerType: towerType, siteSelectionActive: true });
    expect(visibleItems.map((item) => item.kind)).toEqual(['action', 'action', 'action']);
    expect(visibleItems.map((item) => item.kind === 'action' ? item.action : '')).toEqual([
      'buildPrev',
      'buildNext',
      'buildSelected',
    ]);
  });

  it('back returns from site selection to tower type selection', () => {
    const activeState = selectConstructionTower(createDefaultConstructionMenuState(), 'slow');
    const state = backFromConstructionState(activeState);
    const visibleItems = getVisibleConstructionItems(constructionItems, state);

    expect(state).toEqual({ selectedTowerType: 'slow', siteSelectionActive: false });
    expect(visibleItems.map((item) => item.kind)).toEqual(['construct', 'construct']);
  });
});
