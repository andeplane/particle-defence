import { TOWER_TYPE, type TowerType } from '../config';
import type { MenuItemDef } from './menuConfig';

export interface ConstructionMenuState {
  readonly selectedTowerType: TowerType;
  readonly siteSelectionActive: boolean;
}

export function createDefaultConstructionMenuState(): ConstructionMenuState {
  return {
    selectedTowerType: TOWER_TYPE.LASER,
    siteSelectionActive: false,
  };
}

export function selectConstructionTower(
  state: ConstructionMenuState,
  towerType: TowerType,
): ConstructionMenuState {
  return {
    ...state,
    selectedTowerType: towerType,
    siteSelectionActive: true,
  };
}

export function backFromConstructionState(state: ConstructionMenuState): ConstructionMenuState {
  if (!state.siteSelectionActive) return state;
  return {
    ...state,
    siteSelectionActive: false,
  };
}

export function getVisibleConstructionItems(
  items: readonly MenuItemDef[],
  state: ConstructionMenuState,
): MenuItemDef[] {
  return items.filter((item) => state.siteSelectionActive ? item.kind === 'action' : item.kind === 'construct');
}
