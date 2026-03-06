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
      expect(categoryIds).toHaveLength(4);
    });

    it('should have unique category p1Keys', () => {
      const p1Keys = MENU_CATEGORIES.map(c => c.p1Key);
      const uniqueKeys = new Set(p1Keys);
      expect(uniqueKeys.size).toBe(p1Keys.length);
    });

    it('should have unique category p2Keys', () => {
      const p2Keys = MENU_CATEGORIES.map(c => c.p2Key);
      const uniqueKeys = new Set(p2Keys);
      expect(uniqueKeys.size).toBe(p2Keys.length);
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
      if (abilitiesCategory!.items[0].kind === 'action') {
        expect(abilitiesCategory!.items[0].action).toBe('nuke');
      }
    });

    it('should have tooltip on all categories and items', () => {
      for (const cat of MENU_CATEGORIES) {
        expect(cat.tooltip).toBeDefined();
        expect(cat.tooltip.length).toBeGreaterThan(0);
        for (const item of cat.items) {
          expect(item.tooltip).toBeDefined();
          expect(item.tooltip.length).toBeGreaterThan(0);
        }
      }
    });
  });

  describe('resolveKeyPress', () => {
    describe('back key handling', () => {
      it.each([
        ['Tab', 0, 'upgrades', { type: 'back' }],
        ['Tab', 0, 'abilities', { type: 'back' }],
        ['Backspace', 1, 'upgrades', { type: 'back' }],
        ['Backspace', 1, 'abilities', { type: 'back' }],
      ])('should return back for %s when P%d is in category %s', (key, playerId, category, expected) => {
        const result = resolveKeyPress(key, playerId as 0 | 1, category as MenuCategory);
        expect(result).toEqual(expected);
      });

      it('should not return back when P1 presses Tab at top level', () => {
        const result = resolveKeyPress('Tab', 0, null);
        expect(result).toBeNull();
      });

      it('should not return back when P2 presses Backspace at top level', () => {
        const result = resolveKeyPress('Backspace', 1, null);
        expect(result).toBeNull();
      });

      it('should not return back when P2 presses Tab', () => {
        const result = resolveKeyPress('Tab', 1, 'upgrades');
        expect(result).toBeNull();
      });

      it('should not return back when P1 presses Backspace', () => {
        const result = resolveKeyPress('Backspace', 0, 'upgrades');
        expect(result).toBeNull();
      });
    });

    describe('category navigation', () => {
      it.each([
        ['Q', 0, null, { type: 'navigate', category: 'construction' }],
        ['W', 0, null, { type: 'navigate', category: 'research' }],
        ['E', 0, null, { type: 'navigate', category: 'upgrades' }],
        ['R', 0, null, { type: 'navigate', category: 'abilities' }],
        ['U', 1, null, { type: 'navigate', category: 'construction' }],
        ['I', 1, null, { type: 'navigate', category: 'research' }],
        ['O', 1, null, { type: 'navigate', category: 'upgrades' }],
        ['P', 1, null, { type: 'navigate', category: 'abilities' }],
      ])('should navigate to category when P%d presses %s at top level', (key, playerId, currentCategory, expected) => {
        const result = resolveKeyPress(key, playerId as 0 | 1, currentCategory as MenuCategory | null);
        expect(result).toEqual(expected);
      });

      it('should not navigate when already in a category', () => {
        const result = resolveKeyPress('Q', 0, 'upgrades');
        expect(result).not.toEqual({ type: 'navigate', category: 'construction' });
      });

      it('should handle lowercase keys', () => {
        const result = resolveKeyPress('q', 0, null);
        expect(result).toEqual({ type: 'navigate', category: 'construction' });
      });
    });

    describe('submenu item dispatch', () => {
      it.each([
        ['Q', 0, 'upgrades', { type: 'upgrade', upgradeType: 'health' }],
        ['W', 0, 'upgrades', { type: 'upgrade', upgradeType: 'attack' }],
        ['E', 0, 'upgrades', { type: 'upgrade', upgradeType: 'radius' }],
        ['R', 0, 'upgrades', { type: 'upgrade', upgradeType: 'spawnRate' }],
        ['T', 0, 'upgrades', { type: 'upgrade', upgradeType: 'speed' }],
        ['A', 0, 'upgrades', { type: 'upgrade', upgradeType: 'maxParticles' }],
        ['G', 0, 'upgrades', { type: 'upgrade', upgradeType: 'defense' }],
        ['B', 0, 'upgrades', { type: 'upgrade', upgradeType: 'interestRate' }],
        ['U', 1, 'upgrades', { type: 'upgrade', upgradeType: 'health' }],
        ['I', 1, 'upgrades', { type: 'upgrade', upgradeType: 'attack' }],
        ['O', 1, 'upgrades', { type: 'upgrade', upgradeType: 'radius' }],
        ['P', 1, 'upgrades', { type: 'upgrade', upgradeType: 'spawnRate' }],
        ['Y', 1, 'upgrades', { type: 'upgrade', upgradeType: 'speed' }],
        ['L', 1, 'upgrades', { type: 'upgrade', upgradeType: 'maxParticles' }],
        ['K', 1, 'upgrades', { type: 'upgrade', upgradeType: 'defense' }],
        ['N', 1, 'upgrades', { type: 'upgrade', upgradeType: 'interestRate' }],
      ])('should dispatch upgrade when P%d presses %s in upgrades submenu', (key, playerId, category, expected) => {
        const result = resolveKeyPress(key, playerId as 0 | 1, category as MenuCategory);
        expect(result).toEqual(expected);
      });

      it.each([
        ['Q', 0, 'abilities', { type: 'action', action: 'nuke' }],
        ['U', 1, 'abilities', { type: 'action', action: 'nuke' }],
      ])('should dispatch action when P%d presses %s in abilities submenu', (key, playerId, category, expected) => {
        const result = resolveKeyPress(key, playerId as 0 | 1, category as MenuCategory);
        expect(result).toEqual(expected);
      });

      it('should return null for invalid key in submenu', () => {
        const result = resolveKeyPress('X', 0, 'upgrades');
        expect(result).toBeNull();
      });

      it('should return null when pressing category key in wrong submenu', () => {
        const result = resolveKeyPress('E', 0, 'upgrades');
        expect(result).toEqual({ type: 'upgrade', upgradeType: 'radius' });
      });
    });

    describe('key case handling', () => {
      it('should handle uppercase keys', () => {
        const result = resolveKeyPress('Q', 0, null);
        expect(result).toEqual({ type: 'navigate', category: 'construction' });
      });

      it('should handle lowercase keys', () => {
        const result = resolveKeyPress('q', 0, null);
        expect(result).toEqual({ type: 'navigate', category: 'construction' });
      });

      it('should handle mixed case keys', () => {
        const result = resolveKeyPress('Q', 0, 'upgrades');
        expect(result).toEqual({ type: 'upgrade', upgradeType: 'health' });
      });
    });

    describe('edge cases', () => {
      it('should return null for unknown key at top level', () => {
        const result = resolveKeyPress('X', 0, null);
        expect(result).toBeNull();
      });

      it('should return null for empty category items', () => {
        const result = resolveKeyPress('Q', 0, 'construction');
        expect(result).toBeNull();
      });

      it('should return null for invalid category', () => {
        const result = resolveKeyPress('Q', 0, 'invalid' as MenuCategory);
        expect(result).toBeNull();
      });
    });
  });
});
