import { TOWER_TYPE, type UpgradeType, type TowerType } from '../config';

export type MenuCategory = 'construction' | 'research' | 'upgrades' | 'abilities' | 'towers';
export type BuildSubmenu = 'towers' | 'particles';

export interface CategoryDef {
  id: MenuCategory;
  label: string;
  tooltip: string;
  p1Key: string;
  p2Key: string;
  items: MenuItemDef[];
}

/** Legacy: only used for nuke action now that tower research is dynamic. */
export type ResearchType = 'nuke';

export type MenuItemDef =
  | { kind: 'upgrade'; type: UpgradeType; label: string; tooltip: string; p1Key: string; p2Key: string }
  | { kind: 'action'; action: 'nuke'; label: string; tooltip: string; p1Key: string; p2Key: string }
  | { kind: 'research'; researchType: ResearchType; label: string; tooltip: string; p1Key: string; p2Key: string }
  | { kind: 'construct'; towerType: TowerType; label: string; tooltip: string; p1Key: string; p2Key: string }
  | { kind: 'buildSubmenu'; buildSubmenu: BuildSubmenu; label: string; tooltip: string; p1Key: string; p2Key: string }
  | { kind: 'action'; action: 'buildPrev'; label: string; tooltip: string; p1Key: string; p2Key: string }
  | { kind: 'action'; action: 'buildNext'; label: string; tooltip: string; p1Key: string; p2Key: string }
  | { kind: 'action'; action: 'buildSelected'; label: string; tooltip: string; p1Key: string; p2Key: string }
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
      { kind: 'buildSubmenu', buildSubmenu: 'towers', label: 'TOWERS', tooltip: 'Build and place towers', p1Key: 'Q', p2Key: 'I' },
      { kind: 'buildSubmenu', buildSubmenu: 'particles', label: 'PARTICLES', tooltip: 'Build combat particles (future)', p1Key: 'W', p2Key: 'O' },
    ],
  },
  {
    id: 'research',
    label: 'RESEARCH',
    tooltip: 'Research new technologies',
    p1Key: 'W',
    p2Key: 'O',
    // Items are computed dynamically in UIScene via getVisibleResearchNodes()
    items: [],
  },
  {
    id: 'upgrades',
    label: 'UPGRADES',
    tooltip: 'Upgrade your particle stats',
    p1Key: 'E',
    p2Key: 'P',
    items: [
      { kind: 'upgrade', type: 'health', label: 'HP', tooltip: 'Particle health', p1Key: 'Q', p2Key: 'U' },
      { kind: 'upgrade', type: 'attack', label: 'ATK', tooltip: 'Particle attack damage', p1Key: 'W', p2Key: 'I' },
      { kind: 'upgrade', type: 'radius', label: 'RAD', tooltip: 'Collision radius', p1Key: 'E', p2Key: 'O' },
      { kind: 'upgrade', type: 'spawnRate', label: 'SPWN', tooltip: 'Spawn rate (lower = faster)', p1Key: 'R', p2Key: 'P' },
      { kind: 'upgrade', type: 'speed', label: 'VEL', tooltip: 'Movement speed', p1Key: 'A', p2Key: 'H' },
      { kind: 'upgrade', type: 'maxParticles', label: 'MAX', tooltip: 'Max particle count', p1Key: 'S', p2Key: 'J' },
      { kind: 'upgrade', type: 'defense', label: 'DEF', tooltip: 'Defense in owned cells', p1Key: 'D', p2Key: 'K' },
      { kind: 'upgrade', type: 'interestRate', label: 'INT', tooltip: 'Gold interest rate (per 30s)', p1Key: 'F', p2Key: 'L' },
    ],
  },
  {
    id: 'abilities',
    label: 'ABILITIES',
    tooltip: 'Special abilities and weapons',
    p1Key: 'A',
    p2Key: 'K',
    items: [
      { kind: 'action', action: 'nuke', label: 'NUKE', tooltip: 'Kill all enemy particles (5min cooldown)', p1Key: 'Q', p2Key: 'I' },
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

const CONSTRUCTION_SUBMENU_ITEMS: Record<BuildSubmenu, MenuItemDef[]> = {
  towers: [
    { kind: 'construct', towerType: TOWER_TYPE.LASER, label: 'LASER', tooltip: 'Select laser tower for fixed-site construction', p1Key: 'Q', p2Key: 'I' },
    { kind: 'construct', towerType: TOWER_TYPE.WEAKNESS, label: 'WEAKNESS', tooltip: 'Select weakness tower for fixed-site construction', p1Key: 'W', p2Key: 'O' },
    { kind: 'action', action: 'buildPrev', label: '< SITE', tooltip: 'Select previous eligible tower site', p1Key: 'A', p2Key: 'K' },
    { kind: 'action', action: 'buildNext', label: 'SITE >', tooltip: 'Select next eligible tower site', p1Key: 'S', p2Key: 'L' },
    { kind: 'action', action: 'buildSelected', label: 'BUILD', tooltip: 'Build selected tower at selected eligible site', p1Key: 'E', p2Key: 'P' },
  ],
  particles: [],
};

export function getConstructionSubmenuItems(buildSubmenu: BuildSubmenu): ReadonlyArray<MenuItemDef> {
  return CONSTRUCTION_SUBMENU_ITEMS[buildSubmenu];
}

export type ActionType = 'nuke' | 'buildPrev' | 'buildNext' | 'buildSelected' | 'towerPrev' | 'towerNext' | 'towerUpgrade';

const RESEARCH_POSITIONAL_KEYS: Record<0 | 1, { top: readonly string[]; bottom: readonly string[] }> = {
  0: { top: ['Q', 'W', 'E', 'R'], bottom: ['A', 'S', 'D', 'F'] },
  1: { top: ['U', 'I', 'O', 'P'], bottom: ['H', 'J', 'K', 'L'] },
};

/** Returns the display key for a research button at the given render position. */
export function getResearchKey(playerId: 0 | 1, isTopRow: boolean, rowIndex: number): string {
  const row = isTopRow ? RESEARCH_POSITIONAL_KEYS[playerId].top : RESEARCH_POSITIONAL_KEYS[playerId].bottom;
  return row[rowIndex] ?? '?';
}

/** Maps a pressed key back to a node index in the visible research list, or null if not a research key. */
export function getResearchNodeIndex(key: string, playerId: 0 | 1, topRowCount: number): number | null {
  const { top, bottom } = RESEARCH_POSITIONAL_KEYS[playerId];
  const ti = top.indexOf(key);
  if (ti !== -1 && ti < topRowCount) return ti;
  const bi = bottom.indexOf(key);
  if (bi !== -1) return topRowCount + bi;
  return null;
}

export type KeyPressResult =
  | { type: 'back' }
  | { type: 'navigate'; category: MenuCategory }
  | { type: 'navigateBuildSubmenu'; buildSubmenu: BuildSubmenu }
  | { type: 'upgrade'; upgradeType: UpgradeType }
  | { type: 'action'; action: ActionType }
  | { type: 'research'; researchType: ResearchType }
  /** Dynamic research: UIScene maps the key to a visible research node. */
  | { type: 'researchKey'; key: string }
  | { type: 'construct'; towerType: TowerType }
  | null;

export function resolveKeyPress(
  key: string,
  playerId: 0 | 1,
  currentCategory: MenuCategory | null,
  currentBuildSubmenu: BuildSubmenu | null = null,
  constructionSiteSelectionActive: boolean = false,
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
    if (currentCategory === 'construction') {
      if (currentBuildSubmenu === null) {
        const catDef = MENU_CATEGORIES.find(c => c.id === currentCategory);
        if (!catDef) return null;
        const item = catDef.items.find(i => {
          const itemKey = playerId === 0 ? i.p1Key : i.p2Key;
          return itemKey === upperKey;
        });
        if (item?.kind === 'buildSubmenu') {
          return { type: 'navigateBuildSubmenu', buildSubmenu: item.buildSubmenu };
        }
        return null;
      }

      const submenuItems = currentBuildSubmenu === 'towers'
        ? getConstructionSubmenuItems(currentBuildSubmenu).filter((item) =>
          constructionSiteSelectionActive ? item.kind === 'action' : item.kind === 'construct'
        )
        : getConstructionSubmenuItems(currentBuildSubmenu);
      const item = submenuItems.find(i => {
        const itemKey = playerId === 0 ? i.p1Key : i.p2Key;
        return itemKey === upperKey;
      });
      if (item) {
        if (item.kind === 'upgrade') {
          return { type: 'upgrade', upgradeType: item.type };
        } else if (item.kind === 'research') {
          return { type: 'research', researchType: item.researchType };
        } else if (item.kind === 'construct') {
          return { type: 'construct', towerType: item.towerType };
        } else if (item.kind === 'action') {
          return { type: 'action', action: item.action };
        }
      }
      return null;
    }

    if (currentCategory === 'research') {
      return { type: 'researchKey', key: upperKey };
    }

    const catDef = MENU_CATEGORIES.find(c => c.id === currentCategory);
    if (catDef) {
      const items = catDef.items;
      const item = items.find(i => {
        const itemKey = playerId === 0 ? i.p1Key : i.p2Key;
        return itemKey === upperKey;
      });
      if (item) {
        if (item.kind === 'upgrade') {
          return { type: 'upgrade', upgradeType: item.type };
        } else if (item.kind === 'research') {
          return { type: 'research', researchType: item.researchType };
        } else if (item.kind === 'construct') {
          return { type: 'construct', towerType: item.towerType };
        } else if (item.kind === 'action') {
          return { type: 'action', action: item.action };
        }
      }
    }
  }

  return null;
}
