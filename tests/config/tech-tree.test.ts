/**
 * Tech Tree Tests
 *
 * Validates canResearch with prerequisites and createInitialTechState.
 */

import { describe, expect, it } from 'vitest';
import {
  canResearch,
  createInitialTechState,
  TECH_UPGRADES,
  type TechId,
} from '@/config/tech-tree';

describe('createInitialTechState', () => {
  it('should produce an object with all tech IDs set to false', () => {
    const state = createInitialTechState();
    const techIds = Object.keys(TECH_UPGRADES) as TechId[];
    expect(techIds.length).toBeGreaterThan(0);
    for (const id of techIds) {
      expect(state[id]).toBe(false);
    }
  });

  it('should have entries for every tech in TECH_UPGRADES', () => {
    const state = createInitialTechState();
    const stateKeys = Object.keys(state).sort();
    const upgradeKeys = Object.keys(TECH_UPGRADES).sort();
    expect(stateKeys).toEqual(upgradeKeys);
  });

  it('should return a new object each call', () => {
    const a = createInitialTechState();
    const b = createInitialTechState();
    expect(a).not.toBe(b);
    expect(a).toEqual(b);
  });
});

describe('canResearch', () => {
  it('should allow researching a tech with no prerequisites', () => {
    const state = createInitialTechState();
    expect(canResearch('sturdyMud', state)).toBe(true);
    expect(canResearch('sharpSticks', state)).toBe(true);
  });

  it('should block researching a tech whose prerequisite is not done', () => {
    const state = createInitialTechState();
    // swiftPaws requires sturdyMud
    expect(canResearch('swiftPaws', state)).toBe(false);
    // eagleEye requires sharpSticks
    expect(canResearch('eagleEye', state)).toBe(false);
  });

  it('should allow researching a tech after its prerequisite is done', () => {
    const state = createInitialTechState();
    state.sturdyMud = true;
    expect(canResearch('swiftPaws', state)).toBe(true);
  });

  it('should block researching an already-researched tech', () => {
    const state = createInitialTechState();
    state.sturdyMud = true;
    expect(canResearch('sturdyMud', state)).toBe(false);
  });

  it('should allow eagleEye after sharpSticks is researched', () => {
    const state = createInitialTechState();
    state.sharpSticks = true;
    expect(canResearch('eagleEye', state)).toBe(true);
  });

  it('should block eagleEye when sharpSticks is not researched', () => {
    const state = createInitialTechState();
    expect(canResearch('eagleEye', state)).toBe(false);
  });
});

describe('TECH_UPGRADES', () => {
  it('should have valid costs for all upgrades', () => {
    for (const [, upgrade] of Object.entries(TECH_UPGRADES)) {
      expect(upgrade.clamCost).toBeGreaterThan(0);
      expect(upgrade.twigCost).toBeGreaterThan(0);
    }
  });

  it('should have non-empty name and description for all upgrades', () => {
    for (const [, upgrade] of Object.entries(TECH_UPGRADES)) {
      expect(upgrade.name.length).toBeGreaterThan(0);
      expect(upgrade.description.length).toBeGreaterThan(0);
    }
  });

  it('prerequisites should reference valid tech IDs', () => {
    const validIds = new Set(Object.keys(TECH_UPGRADES));
    for (const [, upgrade] of Object.entries(TECH_UPGRADES)) {
      if ('requires' in upgrade && upgrade.requires) {
        expect(validIds.has(upgrade.requires)).toBe(true);
      }
    }
  });

  it('should define exactly 15 technologies', () => {
    const techIds = Object.keys(TECH_UPGRADES);
    expect(techIds.length).toBe(15);
  });

  it('should include all new techs', () => {
    const techIds = Object.keys(TECH_UPGRADES);
    // Nature branch
    expect(techIds).toContain('herbalMedicine');
    expect(techIds).toContain('aquaticTraining');
    expect(techIds).toContain('deepDiving');
    // Armory branch additions
    expect(techIds).toContain('ironShell');
    expect(techIds).toContain('siegeWorks');
    expect(techIds).toContain('battleRoar');
    expect(techIds).toContain('cunningTraps');
    expect(techIds).toContain('camouflage');
    // Lodge branch additions
    expect(techIds).toContain('cartography');
    expect(techIds).toContain('tidalHarvest');
  });

  it('should have no circular prerequisite chains', () => {
    const visited = new Set<string>();
    const techIds = Object.keys(TECH_UPGRADES) as TechId[];

    for (const id of techIds) {
      visited.clear();
      let current: TechId | undefined = id;
      while (current) {
        expect(visited.has(current)).toBe(false);
        visited.add(current);
        const upgrade = TECH_UPGRADES[current];
        current = ('requires' in upgrade ? upgrade.requires : undefined) as TechId | undefined;
      }
    }
  });

  it('pearl costs should only appear on elite techs', () => {
    const pearlTechs = Object.entries(TECH_UPGRADES).filter(
      ([, u]) => 'pearlCost' in u && (u as any).pearlCost > 0,
    );
    // Exactly these techs should require pearls
    const pearlTechIds = pearlTechs.map(([id]) => id).sort();
    expect(pearlTechIds).toEqual(['hardenedShells', 'siegeWorks']);
  });
});
