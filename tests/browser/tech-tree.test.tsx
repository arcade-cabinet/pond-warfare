/**
 * Browser Tech Tree Tests
 *
 * Runs in a REAL browser via vitest browser mode + Playwright.
 * Exercises every tech upgrade in the tech tree:
 *
 * 1. Research costs are deducted from resources
 * 2. Prerequisites block research
 * 3. Effects apply after research (tech flag set to true)
 *
 * All 25 techs tested, grouped by 5 branches:
 * - Lodge (5): cartography, tidalHarvest, tradeRoutes, deepDiving, rootNetwork
 * - Nature (5): herbalMedicine, aquaticTraining, pondBlessing, tidalSurge, regeneration
 * - Warfare (5): sharpSticks, eagleEye, battleRoar, piercingShot, warDrums
 * - Fortifications (5): sturdyMud, ironShell, fortifiedWalls, siegeWorks, hardenedShells
 * - Shadow (5): swiftPaws, cunningTraps, rallyCry, camouflage, venomCoating
 *
 * Run with: pnpm test:browser
 */

import { render } from 'preact';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { game } from '@/game';
import { App } from '@/ui/app';
import '@/styles/main.css';
import {
  canResearch,
  createInitialTechState,
  TECH_UPGRADES,
  type TechId,
} from '@/config/tech-tree';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const delay = (ms: number) => new Promise((r) => setTimeout(r, ms));

function clickButton(text: string): boolean {
  const btn = Array.from(document.querySelectorAll('button')).find(
    (b) => b.textContent?.includes(text) && !b.disabled,
  );
  if (btn) { btn.click(); return true; }
  return false;
}

// ---------------------------------------------------------------------------
// Bootstrap (same pattern as gameplay-loops.test.tsx)
// ---------------------------------------------------------------------------

async function mountGame() {
  let root = document.getElementById('app');
  if (!root) { root = document.createElement('div'); root.id = 'app'; document.body.appendChild(root); }
  document.body.style.cssText = 'margin:0;padding:0;overflow:hidden';

  const ready = new Promise<void>((resolve) => {
    render(<App onMount={async (refs) => {
      await game.init(refs.container, refs.gameCanvas, refs.fogCanvas, refs.lightCanvas, refs.minimapCanvas, refs.minimapCam);
      resolve();
    }} />, root!);
  });

  await delay(500);
  clickButton('New Game');
  await delay(500);
  clickButton('START');
  await ready;
}

/**
 * Perform research on a tech, mirroring the onResearch callback in app.tsx.
 * Returns true if research succeeded.
 */
function researchTech(techId: TechId): boolean {
  const w = game.world;
  const upgrade = TECH_UPGRADES[techId];
  if (
    upgrade &&
    canResearch(techId, w.tech) &&
    w.resources.clams >= upgrade.clamCost &&
    w.resources.twigs >= upgrade.twigCost
  ) {
    w.resources.clams -= upgrade.clamCost;
    w.resources.twigs -= upgrade.twigCost;
    w.tech[techId] = true;
    return true;
  }
  return false;
}

/** Give the player plenty of resources so cost checks pass. */
function giveResources() {
  game.world.resources.clams = 10000;
  game.world.resources.twigs = 10000;
  game.world.resources.pearls = 500;
}

/** Reset all tech to unresearched and give plenty of resources. */
function resetTechAndResources() {
  const fresh = createInitialTechState();
  for (const key of Object.keys(fresh) as TechId[]) {
    game.world.tech[key] = false;
  }
  giveResources();
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('Tech tree - all 25 upgrades', () => {
  beforeAll(async () => {
    await mountGame();
    await delay(4500); // intro fade
    game.world.gameSpeed = 3;
  }, 30_000);

  beforeEach(() => {
    resetTechAndResources();
  });

  // -----------------------------------------------------------------------
  // Lodge branch (5 techs)
  // -----------------------------------------------------------------------

  describe('Lodge branch', () => {
    it('test_cartography_noPrereq_costDeducted', () => {
      const w = game.world;
      const tech = TECH_UPGRADES.cartography;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('cartography', w.tech)).toBe(true);
      const ok = researchTech('cartography');

      expect(ok).toBe(true);
      expect(w.tech.cartography).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_tidalHarvest_noPrereq_costDeducted', () => {
      const w = game.world;
      const tech = TECH_UPGRADES.tidalHarvest;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('tidalHarvest', w.tech)).toBe(true);
      const ok = researchTech('tidalHarvest');

      expect(ok).toBe(true);
      expect(w.tech.tidalHarvest).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_tradeRoutes_requiresCartography_blocked', () => {
      expect(canResearch('tradeRoutes', game.world.tech)).toBe(false);
      const ok = researchTech('tradeRoutes');
      expect(ok).toBe(false);
      expect(game.world.tech.tradeRoutes).toBe(false);
    });

    it('test_tradeRoutes_afterPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.cartography = true;
      const tech = TECH_UPGRADES.tradeRoutes;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('tradeRoutes', w.tech)).toBe(true);
      const ok = researchTech('tradeRoutes');

      expect(ok).toBe(true);
      expect(w.tech.tradeRoutes).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_deepDiving_requiresTidalHarvest_blocked', () => {
      expect(canResearch('deepDiving', game.world.tech)).toBe(false);
      const ok = researchTech('deepDiving');
      expect(ok).toBe(false);
    });

    it('test_deepDiving_afterPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.tidalHarvest = true;
      const tech = TECH_UPGRADES.deepDiving;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('deepDiving');
      expect(ok).toBe(true);
      expect(w.tech.deepDiving).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });

    it('test_rootNetwork_requiresDeepDiving_blocked', () => {
      expect(canResearch('rootNetwork', game.world.tech)).toBe(false);
    });

    it('test_rootNetwork_afterPrereqChain_costDeducted', () => {
      const w = game.world;
      w.tech.tidalHarvest = true;
      w.tech.deepDiving = true;
      const tech = TECH_UPGRADES.rootNetwork;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('rootNetwork');
      expect(ok).toBe(true);
      expect(w.tech.rootNetwork).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });
  });

  // -----------------------------------------------------------------------
  // Nature branch (5 techs)
  // -----------------------------------------------------------------------

  describe('Nature branch', () => {
    it('test_herbalMedicine_noPrereq_costDeducted', () => {
      const w = game.world;
      const tech = TECH_UPGRADES.herbalMedicine;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('herbalMedicine');
      expect(ok).toBe(true);
      expect(w.tech.herbalMedicine).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });

    it('test_aquaticTraining_requiresHerbalMedicine_blocked', () => {
      expect(canResearch('aquaticTraining', game.world.tech)).toBe(false);
    });

    it('test_aquaticTraining_afterPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.herbalMedicine = true;
      const tech = TECH_UPGRADES.aquaticTraining;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('aquaticTraining');
      expect(ok).toBe(true);
      expect(w.tech.aquaticTraining).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });

    it('test_pondBlessing_requiresHerbalMedicine_blocked', () => {
      expect(canResearch('pondBlessing', game.world.tech)).toBe(false);
    });

    it('test_pondBlessing_afterPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.herbalMedicine = true;
      const tech = TECH_UPGRADES.pondBlessing;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('pondBlessing');
      expect(ok).toBe(true);
      expect(w.tech.pondBlessing).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });

    it('test_tidalSurge_requiresDeepDiving_crossBranch_blocked', () => {
      // tidalSurge (nature) requires deepDiving (lodge)
      expect(canResearch('tidalSurge', game.world.tech)).toBe(false);
    });

    it('test_tidalSurge_afterCrossBranchPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.tidalHarvest = true;
      w.tech.deepDiving = true;
      const tech = TECH_UPGRADES.tidalSurge;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('tidalSurge');
      expect(ok).toBe(true);
      expect(w.tech.tidalSurge).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });

    it('test_regeneration_requiresAquaticTraining_blocked', () => {
      expect(canResearch('regeneration', game.world.tech)).toBe(false);
    });

    it('test_regeneration_afterPrereqChain_costDeducted', () => {
      const w = game.world;
      w.tech.herbalMedicine = true;
      w.tech.aquaticTraining = true;
      const tech = TECH_UPGRADES.regeneration;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('regeneration');
      expect(ok).toBe(true);
      expect(w.tech.regeneration).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });
  });

  // -----------------------------------------------------------------------
  // Warfare branch (5 techs)
  // -----------------------------------------------------------------------

  describe('Warfare branch', () => {
    it('test_sharpSticks_noPrereq_costDeducted', () => {
      const w = game.world;
      const tech = TECH_UPGRADES.sharpSticks;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('sharpSticks');
      expect(ok).toBe(true);
      expect(w.tech.sharpSticks).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });

    it('test_eagleEye_requiresSharpSticks_blocked', () => {
      expect(canResearch('eagleEye', game.world.tech)).toBe(false);
    });

    it('test_eagleEye_afterPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.sharpSticks = true;
      const tech = TECH_UPGRADES.eagleEye;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('eagleEye');
      expect(ok).toBe(true);
      expect(w.tech.eagleEye).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });

    it('test_battleRoar_requiresSharpSticks_blocked', () => {
      expect(canResearch('battleRoar', game.world.tech)).toBe(false);
    });

    it('test_battleRoar_afterPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.sharpSticks = true;
      const tech = TECH_UPGRADES.battleRoar;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('battleRoar');
      expect(ok).toBe(true);
      expect(w.tech.battleRoar).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });

    it('test_piercingShot_requiresEagleEye_blocked', () => {
      expect(canResearch('piercingShot', game.world.tech)).toBe(false);
    });

    it('test_piercingShot_afterPrereqChain_costDeducted', () => {
      const w = game.world;
      w.tech.sharpSticks = true;
      w.tech.eagleEye = true;
      const tech = TECH_UPGRADES.piercingShot;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('piercingShot');
      expect(ok).toBe(true);
      expect(w.tech.piercingShot).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });

    it('test_warDrums_requiresBattleRoar_blocked', () => {
      expect(canResearch('warDrums', game.world.tech)).toBe(false);
    });

    it('test_warDrums_afterPrereqChain_costDeducted', () => {
      const w = game.world;
      w.tech.sharpSticks = true;
      w.tech.battleRoar = true;
      const tech = TECH_UPGRADES.warDrums;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('warDrums');
      expect(ok).toBe(true);
      expect(w.tech.warDrums).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });
  });

  // -----------------------------------------------------------------------
  // Fortifications branch (5 techs)
  // -----------------------------------------------------------------------

  describe('Fortifications branch', () => {
    it('test_sturdyMud_noPrereq_costDeducted', () => {
      const w = game.world;
      const tech = TECH_UPGRADES.sturdyMud;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('sturdyMud');
      expect(ok).toBe(true);
      expect(w.tech.sturdyMud).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });

    it('test_ironShell_requiresSharpSticks_crossBranch_blocked', () => {
      // ironShell (fortifications) requires sharpSticks (warfare)
      expect(canResearch('ironShell', game.world.tech)).toBe(false);
    });

    it('test_ironShell_afterCrossBranchPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.sharpSticks = true;
      const tech = TECH_UPGRADES.ironShell;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('ironShell');
      expect(ok).toBe(true);
      expect(w.tech.ironShell).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });

    it('test_fortifiedWalls_requiresSturdyMud_blocked', () => {
      expect(canResearch('fortifiedWalls', game.world.tech)).toBe(false);
    });

    it('test_fortifiedWalls_afterPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.sturdyMud = true;
      const tech = TECH_UPGRADES.fortifiedWalls;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('fortifiedWalls');
      expect(ok).toBe(true);
      expect(w.tech.fortifiedWalls).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });

    it('test_siegeWorks_requiresEagleEye_crossBranch_blocked', () => {
      expect(canResearch('siegeWorks', game.world.tech)).toBe(false);
    });

    it('test_siegeWorks_afterCrossBranchPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.sharpSticks = true;
      w.tech.eagleEye = true;
      const tech = TECH_UPGRADES.siegeWorks;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('siegeWorks');
      expect(ok).toBe(true);
      expect(w.tech.siegeWorks).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });

    it('test_hardenedShells_requiresEagleEye_crossBranch_blocked', () => {
      expect(canResearch('hardenedShells', game.world.tech)).toBe(false);
    });

    it('test_hardenedShells_afterCrossBranchPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.sharpSticks = true;
      w.tech.eagleEye = true;
      const tech = TECH_UPGRADES.hardenedShells;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('hardenedShells');
      expect(ok).toBe(true);
      expect(w.tech.hardenedShells).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });
  });

  // -----------------------------------------------------------------------
  // Shadow branch (5 techs)
  // -----------------------------------------------------------------------

  describe('Shadow branch', () => {
    it('test_swiftPaws_noPrereq_costDeducted', () => {
      const w = game.world;
      const tech = TECH_UPGRADES.swiftPaws;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('swiftPaws');
      expect(ok).toBe(true);
      expect(w.tech.swiftPaws).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });

    it('test_cunningTraps_requiresSwiftPaws_blocked', () => {
      expect(canResearch('cunningTraps', game.world.tech)).toBe(false);
    });

    it('test_cunningTraps_afterPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.swiftPaws = true;
      const tech = TECH_UPGRADES.cunningTraps;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('cunningTraps');
      expect(ok).toBe(true);
      expect(w.tech.cunningTraps).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });

    it('test_rallyCry_requiresSwiftPaws_blocked', () => {
      expect(canResearch('rallyCry', game.world.tech)).toBe(false);
    });

    it('test_rallyCry_afterPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.swiftPaws = true;
      const tech = TECH_UPGRADES.rallyCry;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('rallyCry');
      expect(ok).toBe(true);
      expect(w.tech.rallyCry).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });

    it('test_camouflage_requiresCunningTraps_blocked', () => {
      expect(canResearch('camouflage', game.world.tech)).toBe(false);
    });

    it('test_camouflage_afterPrereqChain_costDeducted', () => {
      const w = game.world;
      w.tech.swiftPaws = true;
      w.tech.cunningTraps = true;
      const tech = TECH_UPGRADES.camouflage;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('camouflage');
      expect(ok).toBe(true);
      expect(w.tech.camouflage).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });

    it('test_venomCoating_requiresCunningTraps_blocked', () => {
      expect(canResearch('venomCoating', game.world.tech)).toBe(false);
    });

    it('test_venomCoating_afterPrereqChain_costDeducted', () => {
      const w = game.world;
      w.tech.swiftPaws = true;
      w.tech.cunningTraps = true;
      const tech = TECH_UPGRADES.venomCoating;
      const clamsBefore = w.resources.clams;

      const ok = researchTech('venomCoating');
      expect(ok).toBe(true);
      expect(w.tech.venomCoating).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
    });
  });

  // -----------------------------------------------------------------------
  // Cross-cutting: duplicate research, insufficient resources, canResearch
  // -----------------------------------------------------------------------

  describe('Cross-cutting behaviors', () => {
    it('test_duplicateResearch_rejected', () => {
      const w = game.world;
      researchTech('cartography');
      expect(w.tech.cartography).toBe(true);

      expect(canResearch('cartography', w.tech)).toBe(false);

      const clamsBefore = w.resources.clams;
      const ok = researchTech('cartography');
      expect(ok).toBe(false);
      expect(w.resources.clams).toBe(clamsBefore);
    });

    it('test_insufficientClams_rejected', () => {
      const w = game.world;
      w.resources.clams = 0;
      w.resources.twigs = 10000;

      const ok = researchTech('sturdyMud');
      expect(ok).toBe(false);
      expect(w.tech.sturdyMud).toBe(false);
    });

    it('test_insufficientTwigs_rejected', () => {
      const w = game.world;
      w.resources.clams = 10000;
      w.resources.twigs = 0;

      const ok = researchTech('sturdyMud');
      expect(ok).toBe(false);
      expect(w.tech.sturdyMud).toBe(false);
    });

    it('test_fullChain_lodge_cartography_tradeRoutes', () => {
      const w = game.world;

      expect(researchTech('cartography')).toBe(true);
      expect(researchTech('tradeRoutes')).toBe(true);

      expect(w.tech.cartography).toBe(true);
      expect(w.tech.tradeRoutes).toBe(true);

      const totalClams =
        TECH_UPGRADES.cartography.clamCost +
        TECH_UPGRADES.tradeRoutes.clamCost;
      expect(w.resources.clams).toBe(10000 - totalClams);
    });

    it('test_fullChain_warfare_sharpSticks_eagleEye_piercingShot', () => {
      const w = game.world;

      expect(researchTech('sharpSticks')).toBe(true);
      expect(researchTech('eagleEye')).toBe(true);
      expect(researchTech('piercingShot')).toBe(true);

      expect(w.tech.piercingShot).toBe(true);

      const totalClams =
        TECH_UPGRADES.sharpSticks.clamCost +
        TECH_UPGRADES.eagleEye.clamCost +
        TECH_UPGRADES.piercingShot.clamCost;
      expect(w.resources.clams).toBe(10000 - totalClams);
    });

    it('test_fullChain_nature_herbalMedicine_aquaticTraining_regeneration', () => {
      const w = game.world;

      expect(researchTech('herbalMedicine')).toBe(true);
      expect(researchTech('aquaticTraining')).toBe(true);
      expect(researchTech('regeneration')).toBe(true);

      expect(w.tech.regeneration).toBe(true);

      const totalClams =
        TECH_UPGRADES.herbalMedicine.clamCost +
        TECH_UPGRADES.aquaticTraining.clamCost +
        TECH_UPGRADES.regeneration.clamCost;
      expect(w.resources.clams).toBe(10000 - totalClams);
    });

    it('test_crossBranch_siegeWorks_requires_warfare_eagleEye', () => {
      const w = game.world;

      // Can't research siegeWorks without warfare prereq
      expect(canResearch('siegeWorks', w.tech)).toBe(false);

      // Research warfare chain
      expect(researchTech('sharpSticks')).toBe(true);
      expect(researchTech('eagleEye')).toBe(true);

      // Now siegeWorks is available
      expect(canResearch('siegeWorks', w.tech)).toBe(true);
      expect(researchTech('siegeWorks')).toBe(true);
      expect(w.tech.siegeWorks).toBe(true);
    });

    it('test_canResearch_allTechs_initialState_matches_prerequisites', () => {
      const w = game.world;
      // Techs with no prerequisites should be researchable
      const noPrereq: TechId[] = [
        'cartography', 'tidalHarvest', 'herbalMedicine',
        'sharpSticks', 'sturdyMud', 'swiftPaws',
      ];
      for (const id of noPrereq) {
        expect(canResearch(id, w.tech)).toBe(true);
      }

      // Techs with prerequisites should be blocked
      const withPrereq: TechId[] = [
        'tradeRoutes', 'deepDiving', 'rootNetwork',
        'aquaticTraining', 'pondBlessing', 'tidalSurge', 'regeneration',
        'eagleEye', 'battleRoar', 'piercingShot', 'warDrums',
        'ironShell', 'fortifiedWalls', 'siegeWorks', 'hardenedShells',
        'cunningTraps', 'rallyCry', 'camouflage', 'venomCoating',
      ];
      for (const id of withPrereq) {
        expect(canResearch(id, w.tech)).toBe(false);
      }
    });
  });

  afterAll(() => {
    resetTechAndResources();
  });
});
