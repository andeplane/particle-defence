import type { UpgradeType, TowerType } from '../config';

export type MenuCategory = 'construction' | 'research' | 'upgrades' | 'abilities' | 'towers';

export interface CategoryDef {
  id: MenuCategory;
  label: string;
  tooltip: string;
  p1Key: string;
  p2Key: string;
  items: MenuItemDef[];
}

export type MenuItemDef =
  | { kind: 'upgrade'; type: UpgradeType; label: string; tooltip: string; p1Key: string; p2Key: string }
  | { kind: 'action'; action: 'nuke'; label: string; tooltip: string; p1Key: string; p2Key: string }
  | { kind: 'research'; towerType: TowerType; label: string; tooltip: string; p1Key: string; p2Key: string }
  | { kind: 'construct'; towerType: TowerType; label: string; tooltip: string; p1Key: string; p2Key: string }
  | { kind: 'action'; action: 'place'; label: string; tooltip: string; p1Key: string; p2Key: string }
  | { kind: 'action'; action: 'towerPrev'; label: string; tooltip: string; p1Key: string; p2Key: string }
  | { kind: 'action'; action: 'towerNext'; label: string; tooltip: string; p1Key: string; p2Key: string }
  | { kind: 'action'; action: 'towerUpgrade'; label: string; tooltip: string; p1Key: string; p2Key: string };

export const MENU_CATEGORIES: CategoryDef[] = [
  {
    id: 'construction',
    label: 'BUILD',
    tooltip: 'Construct towers',
    p1Key: 'Q',
    p2Key: 'I',
    items: [
      { kind: 'construct', towerType: 'laser', label: 'LASER', tooltip: 'Build a laser tower', p1Key: 'Q', p2Key: 'I' },
      { kind: 'construct', towerType: 'slow', label: 'SLOW', tooltip: 'Build a slow tower', p1Key: 'W', p2Key: 'O' },
      { kind: 'action', action: 'place', label: 'PLACE', tooltip: 'Place tower at carrier position', p1Key: 'E', p2Key: 'P' },
    ],
  },
  {
    id: 'research',
    label: 'RESEARCH',
    tooltip: 'Research new technologies',
    p1Key: 'W',
    p2Key: 'O',
    items: [
      { kind: 'research', towerType: 'laser', label: 'LASER', tooltip: 'Unlock laser tower construction', p1Key: 'Q', p2Key: 'I' },
      { kind: 'research', towerType: 'slow', label: 'SLOW', tooltip: 'Unlock slow tower construction', p1Key: 'W', p2Key: 'O' },
    ],
  },
  {
    id: 'upgrades',
    label: 'UPGRADES',
    tooltip: 'Upgrade your particle stats',
    p1Key: 'E',
    p2Key: 'P',
    items: [
      { kind: 'upgrade', type: 'health', label: 'HP', tooltip: 'Particle health', p1Key: 'Q', p2Key: 'I' },
      { kind: 'upgrade', type: 'attack', label: 'ATK', tooltip: 'Particle attack damage', p1Key: 'W', p2Key: 'O' },
      { kind: 'upgrade', type: 'radius', label: 'RAD', tooltip: 'Collision radius', p1Key: 'E', p2Key: 'P' },
      { kind: 'upgrade', type: 'spawnRate', label: 'SPWN', tooltip: 'Spawn rate (lower = faster)', p1Key: 'R', p2Key: 'U' },
      { kind: 'upgrade', type: 'speed', label: 'VEL', tooltip: 'Movement speed', p1Key: 'A', p2Key: 'K' },
      { kind: 'upgrade', type: 'maxParticles', label: 'MAX', tooltip: 'Max particle count', p1Key: 'S', p2Key: 'L' },
      { kind: 'upgrade', type: 'defense', label: 'DEF', tooltip: 'Defense in owned cells', p1Key: 'D', p2Key: 'J' },
      { kind: 'upgrade', type: 'interestRate', label: 'INT', tooltip: 'Gold interest rate (per 30s)', p1Key: 'F', p2Key: 'H' },
    ],
  },
  {
    id: 'abilities',
    label: 'ABILITIES',
    tooltip: 'Special abilities and weapons',
    p1Key: 'A',
    p2Key: 'K',
    items: [
      { kind: 'action', action: 'nuke', label: 'NUKE', tooltip: 'Kill all enemy particles (10min cooldown)', p1Key: 'Q', p2Key: 'I' },
    ],
  },
  {
    id: 'towers',
    label: 'TOWERS',
    tooltip: 'Manage and upgrade placed towers',
    p1Key: 'S',
    p2Key: 'L',
    items: [
      { kind: 'action', action: 'towerPrev', label: '< PREV', tooltip: 'Select previous tower', p1Key: 'Q', p2Key: 'I' },
      { kind: 'action', action: 'towerNext', label: 'NEXT >', tooltip: 'Select next tower', p1Key: 'W', p2Key: 'O' },
      { kind: 'action', action: 'towerUpgrade', label: 'UPGRADE', tooltip: 'Upgrade selected tower', p1Key: 'E', p2Key: 'P' },
    ],
  },
];

export type ActionType = 'nuke' | 'place' | 'towerPrev' | 'towerNext' | 'towerUpgrade';

export type KeyPressResult =
  | { type: 'back' }
  | { type: 'navigate'; category: MenuCategory }
  | { type: 'upgrade'; upgradeType: UpgradeType }
  | { type: 'action'; action: ActionType }
  | { type: 'research'; towerType: TowerType }
  | { type: 'construct'; towerType: TowerType }
  | null;

export function resolveKeyPress(
  key: string,
  playerId: 0 | 1,
  currentCategory: MenuCategory | null
): KeyPressResult {
  const upperKey = key.toUpperCase();
  const isBackspace = key === 'Backspace';

  if (playerId === 0 && upperKey === 'TAB' && currentCategory !== null) {
    return { type: 'back' };
  }
  if (playerId === 1 && isBackspace && currentCategory !== null) {
    return { type: 'back' };
  }

  if (currentCategory === null) {
    const category = MENU_CATEGORIES.find(cat => {
      const catKey = playerId === 0 ? cat.p1Key : cat.p2Key;
      return catKey === upperKey;
    });
    if (category) {
      return { type: 'navigate', category: category.id };
    }
  }

  if (currentCategory !== null) {
    const catDef = MENU_CATEGORIES.find(c => c.id === currentCategory);
    if (catDef) {
      const item = catDef.items.find(i => {
        const itemKey = playerId === 0 ? i.p1Key : i.p2Key;
        return itemKey === upperKey;
      });
      if (item) {
        if (item.kind === 'upgrade') {
          return { type: 'upgrade', upgradeType: item.type };
        } else if (item.kind === 'research') {
          return { type: 'research', towerType: item.towerType };
        } else if (item.kind === 'construct') {
          return { type: 'construct', towerType: item.towerType };
        } else {
          return { type: 'action', action: item.action };
        }
      }
    }
  }

  return null;
}
