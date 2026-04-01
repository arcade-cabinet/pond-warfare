/**
 * Tech Tree Tests
 *
 * Validates canResearch with prerequisites, createInitialTechState,
 * 5-branch structure, and cross-branch dependencies.
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
    expect(canResearch('swiftPaws', state)).toBe(true);
    expect(canResearch('cartography', state)).toBe(true);
    expect(canResearch('herbalMedicine', state)).toBe(true);
    expect(canResearch('tidalHarvest', state)).toBe(true);
  });

  it('should block researching a tech whose prerequisite is not done', () => {
    const state = createInitialTechState();
    // cunningTraps requires swiftPaws
    expect(canResearch('cunningTraps', state)).toBe(false);
    // eagleEye requires sharpSticks
    expect(canResearch('eagleEye', state)).toBe(false);
    // regeneration requires aquaticTraining
    expect(canResearch('regeneration', state)).toBe(false);
  });

  it('should allow researching a tech after its prerequisite is done', () => {
    const state = createInitialTechState();
    state.swiftPaws = true;
    expect(canResearch('cunningTraps', state)).toBe(true);
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

  it('should handle cross-branch dependencies', () => {
    const state = createInitialTechState();
    // ironShell requires sharpSticks (warfare -> fortifications)
    expect(canResearch('ironShell', state)).toBe(false);
    state.sharpSticks = true;
    expect(canResearch('ironShell', state)).toBe(true);

    // tidalSurge requires deepDiving (lodge -> nature)
    expect(canResearch('tidalSurge', state)).toBe(false);
    state.tidalHarvest = true;
    state.deepDiving = true;
    expect(canResearch('tidalSurge', state)).toBe(true);
  });

  it('should allow regeneration after aquaticTraining', () => {
    const state = createInitialTechState();
    expect(canResearch('regeneration', state)).toBe(false);
    state.herbalMedicine = true;
    expect(canResearch('regeneration', state)).toBe(false);
    state.aquaticTraining = true;
    expect(canResearch('regeneration', state)).toBe(true);
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

  it('should define exactly 25 technologies (5 branches x 5)', () => {
    const techIds = Object.keys(TECH_UPGRADES);
    expect(techIds.length).toBe(25);
  });

  it('should have 5 techs per branch', () => {
    const branchCounts: Record<string, number> = {};
    for (const [, upgrade] of Object.entries(TECH_UPGRADES)) {
      branchCounts[upgrade.branch] = (branchCounts[upgrade.branch] ?? 0) + 1;
    }
    expect(branchCounts.lodge).toBe(5);
    expect(branchCounts.nature).toBe(5);
    expect(branchCounts.warfare).toBe(5);
    expect(branchCounts.fortifications).toBe(5);
    expect(branchCounts.shadow).toBe(5);
  });

  it('should include all expected techs', () => {
    const techIds = Object.keys(TECH_UPGRADES);
    // Lodge
    expect(techIds).toContain('cartography');
    expect(techIds).toContain('tidalHarvest');
    expect(techIds).toContain('tradeRoutes');
    expect(techIds).toContain('deepDiving');
    expect(techIds).toContain('rootNetwork');
    // Nature
    expect(techIds).toContain('herbalMedicine');
    expect(techIds).toContain('aquaticTraining');
    expect(techIds).toContain('pondBlessing');
    expect(techIds).toContain('tidalSurge');
    expect(techIds).toContain('regeneration');
    // Warfare
    expect(techIds).toContain('sharpSticks');
    expect(techIds).toContain('eagleEye');
    expect(techIds).toContain('battleRoar');
    expect(techIds).toContain('piercingShot');
    expect(techIds).toContain('warDrums');
    // Fortifications
    expect(techIds).toContain('sturdyMud');
    expect(techIds).toContain('ironShell');
    expect(techIds).toContain('fortifiedWalls');
    expect(techIds).toContain('siegeWorks');
    expect(techIds).toContain('hardenedShells');
    // Shadow
    expect(techIds).toContain('swiftPaws');
    expect(techIds).toContain('cunningTraps');
    expect(techIds).toContain('rallyCry');
    expect(techIds).toContain('camouflage');
    expect(techIds).toContain('venomCoating');
  });

  it('should NOT include removed siegeEngineering', () => {
    expect(Object.keys(TECH_UPGRADES)).not.toContain('siegeEngineering');
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

  it('pearl costs should only appear on late-game techs', () => {
    const pearlTechs = Object.entries(TECH_UPGRADES).filter(
      ([, u]) => 'pearlCost' in u && (u as any).pearlCost > 0,
    );
    const pearlTechIds = pearlTechs.map(([id]) => id);
    expect(pearlTechIds).toContain('hardenedShells');
    expect(pearlTechIds).toContain('siegeWorks');
    expect(pearlTechIds).toContain('pondBlessing');
    expect(pearlTechIds).toContain('tidalSurge');
    for (const [, u] of pearlTechs) {
      expect(u.clamCost + u.twigCost).toBeGreaterThanOrEqual(300);
    }
  });

  it('every branch has a valid branch field', () => {
    const validBranches = new Set(['lodge', 'nature', 'warfare', 'fortifications', 'shadow']);
    for (const [, upgrade] of Object.entries(TECH_UPGRADES)) {
      expect(validBranches.has(upgrade.branch)).toBe(true);
    }
  });
});
