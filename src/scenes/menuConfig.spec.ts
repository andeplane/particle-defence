import { describe, it, expect } from 'vitest';
import { MENU_CATEGORIES, resolveKeyPress, type MenuCategory } from './menuConfig';

describe('menuConfig', () => {
  describe('MENU_CATEGORIES', () => {
    it('should have all required categories', () => {
      const categoryIds = MENU_CATEGORIES.map(c => c.id);
      expect(categoryIds).toContain('construction');
      expect(categoryIds).toContain('research');
      expect(categoryIds).toContain('upgrades');
      expect(categoryIds).toContain('abilities');
      expect(categoryIds).toContain('towers');
      expect(categoryIds).toHaveLength(5);
    });

    it('should have unique category p1Keys', () => {
      const p1Keys = MENU_CATEGORIES.map(c => c.p1Key);
      expect(new Set(p1Keys).size).toBe(p1Keys.length);
    });

    it('should have unique category p2Keys', () => {
      const p2Keys = MENU_CATEGORIES.map(c => c.p2Key);
      expect(new Set(p2Keys).size).toBe(p2Keys.length);
    });

    it('should not have overlapping P1 and P2 category keys', () => {
      const p1Keys = new Set(MENU_CATEGORIES.map(c => c.p1Key));
      const p2Keys = new Set(MENU_CATEGORIES.map(c => c.p2Key));
      const overlap = [...p1Keys].filter(k => p2Keys.has(k));
      expect(overlap).toHaveLength(0);
    });

    it('should have unique item keys within each category', () => {
      for (const category of MENU_CATEGORIES) {
        const p1Keys = category.items.map(i => i.p1Key);
        const p2Keys = category.items.map(i => i.p2Key);
        expect(new Set(p1Keys).size).toBe(p1Keys.length);
        expect(new Set(p2Keys).size).toBe(p2Keys.length);
      }
    });

    it('should have upgrades category with all upgrade types', () => {
      const upgradesCategory = MENU_CATEGORIES.find(c => c.id === 'upgrades');
      expect(upgradesCategory).toBeDefined();
      expect(upgradesCategory!.items).toHaveLength(8);
      expect(upgradesCategory!.items.every(i => i.kind === 'upgrade')).toBe(true);
    });

    it('should have abilities category with nuke action', () => {
      const abilitiesCategory = MENU_CATEGORIES.find(c => c.id === 'abilities');
      expect(abilitiesCategory).toBeDefined();
      expect(abilitiesCategory!.items).toHaveLength(1);
      expect(abilitiesCategory!.items[0].kind).toBe('action');
    });

    it('should have tooltip on all categories and items', () => {
      for (const cat of MENU_CATEGORIES) {
        expect(cat.tooltip.length).toBeGreaterThan(0);
        for (const item of cat.items) {
          expect(item.tooltip.length).toBeGreaterThan(0);
        }
      }
    });

    it('should have construction category with tower build items and place action', () => {
      const cat = MENU_CATEGORIES.find(c => c.id === 'construction')!;
      expect(cat.items.some(i => i.kind === 'construct')).toBe(true);
      expect(cat.items.some(i => i.kind === 'action' && i.action === 'place')).toBe(true);
    });

    it('should have research category with research items', () => {
      const cat = MENU_CATEGORIES.find(c => c.id === 'research')!;
      expect(cat.items.every(i => i.kind === 'research')).toBe(true);
      expect(cat.items.length).toBeGreaterThanOrEqual(2);
    });

    it('should have towers category with prev/next/upgrade items', () => {
      const cat = MENU_CATEGORIES.find(c => c.id === 'towers')!;
      const actions = cat.items.filter(i => i.kind === 'action').map(i => (i as { action: string }).action);
      expect(actions).toContain('towerPrev');
      expect(actions).toContain('towerNext');
      expect(actions).toContain('towerUpgrade');
    });
  });

  describe('resolveKeyPress', () => {
    describe('back key handling', () => {
      it.each([
        ['Tab', 0, 'upgrades', { type: 'back' }],
        ['Tab', 0, 'abilities', { type: 'back' }],
        ['Backspace', 1, 'upgrades', { type: 'back' }],
        ['Backspace', 1, 'abilities', { type: 'back' }],
      ] as const)('should return back for %s when P%d is in category %s', (key, playerId, category, expected) => {
        const result = resolveKeyPress(key, playerId, category);
        expect(result).toEqual(expected);
      });

      it('should not return back when P1 presses Tab at top level', () => {
        expect(resolveKeyPress('Tab', 0, null)).toBeNull();
      });

      it('should not return back when P2 presses Backspace at top level', () => {
        expect(resolveKeyPress('Backspace', 1, null)).toBeNull();
      });
    });

    describe('category navigation (new 3+2 layout)', () => {
      it.each([
        ['Q', 0, 'construction'],
        ['W', 0, 'research'],
        ['E', 0, 'upgrades'],
        ['A', 0, 'abilities'],
        ['S', 0, 'towers'],
        ['I', 1, 'construction'],
        ['O', 1, 'research'],
        ['P', 1, 'upgrades'],
        ['K', 1, 'abilities'],
        ['L', 1, 'towers'],
      ] as const)('P%d presses %s -> navigates to %s', (key, playerId, category) => {
        const result = resolveKeyPress(key, playerId, null);
        expect(result).toEqual({ type: 'navigate', category });
      });

      it('handles lowercase keys', () => {
        expect(resolveKeyPress('q', 0, null)).toEqual({ type: 'navigate', category: 'construction' });
      });
    });

    describe('upgrades submenu dispatch', () => {
      it.each([
        ['Q', 0, 'health'],
        ['W', 0, 'attack'],
        ['E', 0, 'radius'],
        ['R', 0, 'spawnRate'],
        ['A', 0, 'speed'],
        ['S', 0, 'maxParticles'],
        ['D', 0, 'defense'],
        ['F', 0, 'interestRate'],
        ['U', 1, 'health'],
        ['I', 1, 'attack'],
        ['O', 1, 'radius'],
        ['P', 1, 'spawnRate'],
        ['H', 1, 'speed'],
        ['J', 1, 'maxParticles'],
        ['K', 1, 'defense'],
        ['L', 1, 'interestRate'],
      ] as const)('P%d presses %s -> upgrade %s', (key, playerId, upgradeType) => {
        const result = resolveKeyPress(key, playerId, 'upgrades');
        expect(result).toEqual({ type: 'upgrade', upgradeType });
      });
    });

    describe('abilities submenu dispatch', () => {
      it.each([
        ['Q', 0, { type: 'action', action: 'nuke' }],
        ['I', 1, { type: 'action', action: 'nuke' }],
      ] as const)('P%d presses %s -> nuke', (key, playerId, expected) => {
        const result = resolveKeyPress(key, playerId, 'abilities');
        expect(result).toEqual(expected);
      });
    });

    describe('research submenu dispatch', () => {
      it.each([
        ['Q', 0, 'laser'],
        ['W', 0, 'slow'],
        ['I', 1, 'laser'],
        ['O', 1, 'slow'],
      ] as const)('P%d presses %s -> research %s', (key, playerId, towerType) => {
        const result = resolveKeyPress(key, playerId, 'research');
        expect(result).toEqual({ type: 'research', towerType });
      });
    });

    describe('construction submenu dispatch', () => {
      it.each([
        ['Q', 0, { type: 'construct', towerType: 'laser' }],
        ['W', 0, { type: 'construct', towerType: 'slow' }],
        ['E', 0, { type: 'action', action: 'place' }],
        ['I', 1, { type: 'construct', towerType: 'laser' }],
        ['O', 1, { type: 'construct', towerType: 'slow' }],
        ['P', 1, { type: 'action', action: 'place' }],
      ] as const)('P%d presses %s -> %o', (key, playerId, expected) => {
        const result = resolveKeyPress(key, playerId, 'construction');
        expect(result).toEqual(expected);
      });
    });

    describe('towers submenu dispatch', () => {
      it.each([
        ['Q', 0, { type: 'action', action: 'towerPrev' }],
        ['W', 0, { type: 'action', action: 'towerNext' }],
        ['E', 0, { type: 'action', action: 'towerUpgrade' }],
        ['I', 1, { type: 'action', action: 'towerPrev' }],
        ['O', 1, { type: 'action', action: 'towerNext' }],
        ['P', 1, { type: 'action', action: 'towerUpgrade' }],
      ] as const)('P%d presses %s -> %o', (key, playerId, expected) => {
        const result = resolveKeyPress(key, playerId, 'towers');
        expect(result).toEqual(expected);
      });
    });

    describe('edge cases', () => {
      it('returns null for unknown key at top level', () => {
        expect(resolveKeyPress('X', 0, null)).toBeNull();
      });

      it('returns null for unknown key in submenu', () => {
        expect(resolveKeyPress('X', 0, 'upgrades')).toBeNull();
      });

      it('returns null for invalid category', () => {
        expect(resolveKeyPress('Q', 0, 'invalid' as MenuCategory)).toBeNull();
      });
    });
  });
});
