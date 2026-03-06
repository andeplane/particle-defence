import type { UpgradeType } from '../config';

export type MenuCategory = 'construction' | 'research' | 'upgrades' | 'abilities';

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
  | { kind: 'action'; action: 'nuke'; label: string; tooltip: string; p1Key: string; p2Key: string };

export const MENU_CATEGORIES: CategoryDef[] = [
  { id: 'construction', label: 'BUILD', tooltip: 'Construct buildings and defenses', p1Key: 'Q', p2Key: 'U', items: [] },
  { id: 'research', label: 'RESEARCH', tooltip: 'Research new technologies', p1Key: 'W', p2Key: 'I', items: [] },
  {
    id: 'upgrades',
    label: 'UPGRADES',
    tooltip: 'Upgrade your particle stats',
    p1Key: 'E',
    p2Key: 'O',
    items: [
      { kind: 'upgrade', type: 'health', label: 'HP', tooltip: 'Particle health', p1Key: 'Q', p2Key: 'U' },
      { kind: 'upgrade', type: 'attack', label: 'ATK', tooltip: 'Particle attack damage', p1Key: 'W', p2Key: 'I' },
      { kind: 'upgrade', type: 'radius', label: 'RAD', tooltip: 'Collision radius', p1Key: 'E', p2Key: 'O' },
      { kind: 'upgrade', type: 'spawnRate', label: 'SPWN', tooltip: 'Spawn rate (lower = faster)', p1Key: 'R', p2Key: 'P' },
      { kind: 'upgrade', type: 'speed', label: 'VEL', tooltip: 'Movement speed', p1Key: 'T', p2Key: 'Y' },
      { kind: 'upgrade', type: 'maxParticles', label: 'MAX', tooltip: 'Max particle count', p1Key: 'A', p2Key: 'L' },
      { kind: 'upgrade', type: 'defense', label: 'DEF', tooltip: 'Defense in owned cells', p1Key: 'G', p2Key: 'K' },
      { kind: 'upgrade', type: 'interestRate', label: 'INT', tooltip: 'Gold interest rate (per 30s)', p1Key: 'B', p2Key: 'N' },
    ],
  },
  {
    id: 'abilities',
    label: 'ABILITIES',
    tooltip: 'Special abilities and weapons',
    p1Key: 'R',
    p2Key: 'P',
    items: [{ kind: 'action', action: 'nuke', label: 'NUKE', tooltip: 'Kill all enemy particles (10min cooldown)', p1Key: 'Q', p2Key: 'U' }],
  },
];

export type KeyPressResult =
  | { type: 'back' }
  | { type: 'navigate'; category: MenuCategory }
  | { type: 'upgrade'; upgradeType: UpgradeType }
  | { type: 'action'; action: 'nuke' }
  | null;

export function resolveKeyPress(
  key: string,
  playerId: 0 | 1,
  currentCategory: MenuCategory | null
): KeyPressResult {
  const upperKey = key.toUpperCase();
  const isBackspace = key === 'Backspace';

  // Back key handling
  if (playerId === 0 && upperKey === 'TAB' && currentCategory !== null) {
    return { type: 'back' };
  }
  if (playerId === 1 && isBackspace && currentCategory !== null) {
    return { type: 'back' };
  }

  // Category navigation (only when at top level)
  if (currentCategory === null) {
    const categoryKey = playerId === 0 ? upperKey : upperKey;
    const category = MENU_CATEGORIES.find(cat => {
      const catKey = playerId === 0 ? cat.p1Key : cat.p2Key;
      return catKey === categoryKey;
    });
    if (category) {
      return { type: 'navigate', category: category.id };
    }
  }

  // Submenu item dispatch (only when in a category)
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
        } else {
          return { type: 'action', action: item.action };
        }
      }
    }
  }

  return null;
}
