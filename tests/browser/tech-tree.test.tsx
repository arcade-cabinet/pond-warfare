/**
 * Browser Tech Tree Tests
 *
 * Runs in a REAL browser via vitest browser mode + Playwright.
 * Exercises every tech upgrade in the tech tree:
 *
 * 1. Research costs are deducted from resources
 * 2. Prerequisites block research (can't research Eagle Eye without Sharp Sticks)
 * 3. Effects apply after research (tech flag set to true)
 *
 * All 26 techs tested, grouped by branch:
 * - Lodge branch (7): sturdyMud, swiftPaws, fortifiedWalls, rallyCry, cartography, tradeRoutes, tidalHarvest
 * - Armory branch (12): sharpSticks, eagleEye, hardenedShells, piercingShot, ironShell, siegeWorks,
 *   siegeEngineering, battleRoar, warDrums, cunningTraps, venomCoating, camouflage
 * - Nature branch (6): herbalMedicine, pondBlessing, aquaticTraining, deepDiving, rootNetwork, tidalSurge
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

/**
 * Give the player plenty of resources so cost checks pass.
 */
function giveResources() {
  game.world.resources.clams = 10000;
  game.world.resources.twigs = 10000;
  game.world.resources.pearls = 500;
}

/**
 * Reset all tech to unresearched and give plenty of resources.
 */
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

describe('Tech tree - all 26 upgrades', () => {
  beforeAll(async () => {
    await mountGame();
    await delay(4500); // intro fade
    game.world.gameSpeed = 3;
  }, 30_000);

  beforeEach(() => {
    resetTechAndResources();
  });

  // -----------------------------------------------------------------------
  // Lodge branch (7 techs)
  // -----------------------------------------------------------------------

  describe('Lodge branch', () => {
    it('test_sturdyMud_research_costDeducted', () => {
      const w = game.world;
      const tech = TECH_UPGRADES.sturdyMud;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('sturdyMud', w.tech)).toBe(true);
      const ok = researchTech('sturdyMud');

      expect(ok).toBe(true);
      expect(w.tech.sturdyMud).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_swiftPaws_requiresSturdyMud_blocked', () => {
      const w = game.world;
      // sturdyMud not researched
      expect(canResearch('swiftPaws', w.tech)).toBe(false);
      const ok = researchTech('swiftPaws');
      expect(ok).toBe(false);
      expect(w.tech.swiftPaws).toBe(false);
    });

    it('test_swiftPaws_afterPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.sturdyMud = true;
      const tech = TECH_UPGRADES.swiftPaws;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('swiftPaws', w.tech)).toBe(true);
      const ok = researchTech('swiftPaws');

      expect(ok).toBe(true);
      expect(w.tech.swiftPaws).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_fortifiedWalls_requiresSturdyMud_blocked', () => {
      expect(canResearch('fortifiedWalls', game.world.tech)).toBe(false);
      const ok = researchTech('fortifiedWalls');
      expect(ok).toBe(false);
      expect(game.world.tech.fortifiedWalls).toBe(false);
    });

    it('test_fortifiedWalls_afterPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.sturdyMud = true;
      const tech = TECH_UPGRADES.fortifiedWalls;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('fortifiedWalls', w.tech)).toBe(true);
      const ok = researchTech('fortifiedWalls');

      expect(ok).toBe(true);
      expect(w.tech.fortifiedWalls).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_rallyCry_requiresSwiftPaws_blocked', () => {
      expect(canResearch('rallyCry', game.world.tech)).toBe(false);
      const ok = researchTech('rallyCry');
      expect(ok).toBe(false);
      expect(game.world.tech.rallyCry).toBe(false);
    });

    it('test_rallyCry_afterPrereqChain_costDeducted', () => {
      const w = game.world;
      w.tech.sturdyMud = true;
      w.tech.swiftPaws = true;
      const tech = TECH_UPGRADES.rallyCry;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('rallyCry', w.tech)).toBe(true);
      const ok = researchTech('rallyCry');

      expect(ok).toBe(true);
      expect(w.tech.rallyCry).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

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
  });

  // -----------------------------------------------------------------------
  // Armory branch (12 techs)
  // -----------------------------------------------------------------------

  describe('Armory branch', () => {
    it('test_sharpSticks_noPrereq_costDeducted', () => {
      const w = game.world;
      const tech = TECH_UPGRADES.sharpSticks;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('sharpSticks', w.tech)).toBe(true);
      const ok = researchTech('sharpSticks');

      expect(ok).toBe(true);
      expect(w.tech.sharpSticks).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_eagleEye_requiresSharpSticks_blocked', () => {
      expect(canResearch('eagleEye', game.world.tech)).toBe(false);
      const ok = researchTech('eagleEye');
      expect(ok).toBe(false);
      expect(game.world.tech.eagleEye).toBe(false);
    });

    it('test_eagleEye_afterPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.sharpSticks = true;
      const tech = TECH_UPGRADES.eagleEye;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('eagleEye', w.tech)).toBe(true);
      const ok = researchTech('eagleEye');

      expect(ok).toBe(true);
      expect(w.tech.eagleEye).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_hardenedShells_requiresEagleEye_blocked', () => {
      expect(canResearch('hardenedShells', game.world.tech)).toBe(false);
      const ok = researchTech('hardenedShells');
      expect(ok).toBe(false);
      expect(game.world.tech.hardenedShells).toBe(false);
    });

    it('test_hardenedShells_afterPrereqChain_costDeducted', () => {
      const w = game.world;
      w.tech.sharpSticks = true;
      w.tech.eagleEye = true;
      const tech = TECH_UPGRADES.hardenedShells;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('hardenedShells', w.tech)).toBe(true);
      const ok = researchTech('hardenedShells');

      expect(ok).toBe(true);
      expect(w.tech.hardenedShells).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_piercingShot_requiresEagleEye_blocked', () => {
      expect(canResearch('piercingShot', game.world.tech)).toBe(false);
      const ok = researchTech('piercingShot');
      expect(ok).toBe(false);
      expect(game.world.tech.piercingShot).toBe(false);
    });

    it('test_piercingShot_afterPrereqChain_costDeducted', () => {
      const w = game.world;
      w.tech.sharpSticks = true;
      w.tech.eagleEye = true;
      const tech = TECH_UPGRADES.piercingShot;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('piercingShot', w.tech)).toBe(true);
      const ok = researchTech('piercingShot');

      expect(ok).toBe(true);
      expect(w.tech.piercingShot).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_ironShell_requiresSharpSticks_blocked', () => {
      expect(canResearch('ironShell', game.world.tech)).toBe(false);
      const ok = researchTech('ironShell');
      expect(ok).toBe(false);
      expect(game.world.tech.ironShell).toBe(false);
    });

    it('test_ironShell_afterPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.sharpSticks = true;
      const tech = TECH_UPGRADES.ironShell;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('ironShell', w.tech)).toBe(true);
      const ok = researchTech('ironShell');

      expect(ok).toBe(true);
      expect(w.tech.ironShell).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_siegeWorks_requiresEagleEye_blocked', () => {
      expect(canResearch('siegeWorks', game.world.tech)).toBe(false);
      const ok = researchTech('siegeWorks');
      expect(ok).toBe(false);
      expect(game.world.tech.siegeWorks).toBe(false);
    });

    it('test_siegeWorks_afterPrereqChain_costDeducted', () => {
      const w = game.world;
      w.tech.sharpSticks = true;
      w.tech.eagleEye = true;
      const tech = TECH_UPGRADES.siegeWorks;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('siegeWorks', w.tech)).toBe(true);
      const ok = researchTech('siegeWorks');

      expect(ok).toBe(true);
      expect(w.tech.siegeWorks).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_siegeEngineering_requiresSiegeWorks_blocked', () => {
      expect(canResearch('siegeEngineering', game.world.tech)).toBe(false);
      const ok = researchTech('siegeEngineering');
      expect(ok).toBe(false);
      expect(game.world.tech.siegeEngineering).toBe(false);
    });

    it('test_siegeEngineering_afterPrereqChain_costDeducted', () => {
      const w = game.world;
      w.tech.sharpSticks = true;
      w.tech.eagleEye = true;
      w.tech.siegeWorks = true;
      const tech = TECH_UPGRADES.siegeEngineering;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('siegeEngineering', w.tech)).toBe(true);
      const ok = researchTech('siegeEngineering');

      expect(ok).toBe(true);
      expect(w.tech.siegeEngineering).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_battleRoar_requiresSharpSticks_blocked', () => {
      expect(canResearch('battleRoar', game.world.tech)).toBe(false);
      const ok = researchTech('battleRoar');
      expect(ok).toBe(false);
      expect(game.world.tech.battleRoar).toBe(false);
    });

    it('test_battleRoar_afterPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.sharpSticks = true;
      const tech = TECH_UPGRADES.battleRoar;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('battleRoar', w.tech)).toBe(true);
      const ok = researchTech('battleRoar');

      expect(ok).toBe(true);
      expect(w.tech.battleRoar).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_warDrums_requiresBattleRoar_blocked', () => {
      expect(canResearch('warDrums', game.world.tech)).toBe(false);
      const ok = researchTech('warDrums');
      expect(ok).toBe(false);
      expect(game.world.tech.warDrums).toBe(false);
    });

    it('test_warDrums_afterPrereqChain_costDeducted', () => {
      const w = game.world;
      w.tech.sharpSticks = true;
      w.tech.battleRoar = true;
      const tech = TECH_UPGRADES.warDrums;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('warDrums', w.tech)).toBe(true);
      const ok = researchTech('warDrums');

      expect(ok).toBe(true);
      expect(w.tech.warDrums).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_cunningTraps_requiresSharpSticks_blocked', () => {
      expect(canResearch('cunningTraps', game.world.tech)).toBe(false);
      const ok = researchTech('cunningTraps');
      expect(ok).toBe(false);
      expect(game.world.tech.cunningTraps).toBe(false);
    });

    it('test_cunningTraps_afterPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.sharpSticks = true;
      const tech = TECH_UPGRADES.cunningTraps;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('cunningTraps', w.tech)).toBe(true);
      const ok = researchTech('cunningTraps');

      expect(ok).toBe(true);
      expect(w.tech.cunningTraps).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_venomCoating_requiresCunningTraps_blocked', () => {
      expect(canResearch('venomCoating', game.world.tech)).toBe(false);
      const ok = researchTech('venomCoating');
      expect(ok).toBe(false);
      expect(game.world.tech.venomCoating).toBe(false);
    });

    it('test_venomCoating_afterPrereqChain_costDeducted', () => {
      const w = game.world;
      w.tech.sharpSticks = true;
      w.tech.cunningTraps = true;
      const tech = TECH_UPGRADES.venomCoating;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('venomCoating', w.tech)).toBe(true);
      const ok = researchTech('venomCoating');

      expect(ok).toBe(true);
      expect(w.tech.venomCoating).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_camouflage_requiresCunningTraps_blocked', () => {
      expect(canResearch('camouflage', game.world.tech)).toBe(false);
      const ok = researchTech('camouflage');
      expect(ok).toBe(false);
      expect(game.world.tech.camouflage).toBe(false);
    });

    it('test_camouflage_afterPrereqChain_costDeducted', () => {
      const w = game.world;
      w.tech.sharpSticks = true;
      w.tech.cunningTraps = true;
      const tech = TECH_UPGRADES.camouflage;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('camouflage', w.tech)).toBe(true);
      const ok = researchTech('camouflage');

      expect(ok).toBe(true);
      expect(w.tech.camouflage).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });
  });

  // -----------------------------------------------------------------------
  // Nature branch (6 techs)
  // -----------------------------------------------------------------------

  describe('Nature branch', () => {
    it('test_herbalMedicine_noPrereq_costDeducted', () => {
      const w = game.world;
      const tech = TECH_UPGRADES.herbalMedicine;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('herbalMedicine', w.tech)).toBe(true);
      const ok = researchTech('herbalMedicine');

      expect(ok).toBe(true);
      expect(w.tech.herbalMedicine).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_pondBlessing_requiresHerbalMedicine_blocked', () => {
      expect(canResearch('pondBlessing', game.world.tech)).toBe(false);
      const ok = researchTech('pondBlessing');
      expect(ok).toBe(false);
      expect(game.world.tech.pondBlessing).toBe(false);
    });

    it('test_pondBlessing_afterPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.herbalMedicine = true;
      const tech = TECH_UPGRADES.pondBlessing;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('pondBlessing', w.tech)).toBe(true);
      const ok = researchTech('pondBlessing');

      expect(ok).toBe(true);
      expect(w.tech.pondBlessing).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_aquaticTraining_requiresHerbalMedicine_blocked', () => {
      expect(canResearch('aquaticTraining', game.world.tech)).toBe(false);
      const ok = researchTech('aquaticTraining');
      expect(ok).toBe(false);
      expect(game.world.tech.aquaticTraining).toBe(false);
    });

    it('test_aquaticTraining_afterPrereq_costDeducted', () => {
      const w = game.world;
      w.tech.herbalMedicine = true;
      const tech = TECH_UPGRADES.aquaticTraining;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('aquaticTraining', w.tech)).toBe(true);
      const ok = researchTech('aquaticTraining');

      expect(ok).toBe(true);
      expect(w.tech.aquaticTraining).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_deepDiving_requiresAquaticTraining_blocked', () => {
      expect(canResearch('deepDiving', game.world.tech)).toBe(false);
      const ok = researchTech('deepDiving');
      expect(ok).toBe(false);
      expect(game.world.tech.deepDiving).toBe(false);
    });

    it('test_deepDiving_afterPrereqChain_costDeducted', () => {
      const w = game.world;
      w.tech.herbalMedicine = true;
      w.tech.aquaticTraining = true;
      const tech = TECH_UPGRADES.deepDiving;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('deepDiving', w.tech)).toBe(true);
      const ok = researchTech('deepDiving');

      expect(ok).toBe(true);
      expect(w.tech.deepDiving).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_rootNetwork_requiresDeepDiving_blocked', () => {
      expect(canResearch('rootNetwork', game.world.tech)).toBe(false);
      const ok = researchTech('rootNetwork');
      expect(ok).toBe(false);
      expect(game.world.tech.rootNetwork).toBe(false);
    });

    it('test_rootNetwork_afterPrereqChain_costDeducted', () => {
      const w = game.world;
      w.tech.herbalMedicine = true;
      w.tech.aquaticTraining = true;
      w.tech.deepDiving = true;
      const tech = TECH_UPGRADES.rootNetwork;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('rootNetwork', w.tech)).toBe(true);
      const ok = researchTech('rootNetwork');

      expect(ok).toBe(true);
      expect(w.tech.rootNetwork).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
    });

    it('test_tidalSurge_requiresDeepDiving_blocked', () => {
      expect(canResearch('tidalSurge', game.world.tech)).toBe(false);
      const ok = researchTech('tidalSurge');
      expect(ok).toBe(false);
      expect(game.world.tech.tidalSurge).toBe(false);
    });

    it('test_tidalSurge_afterPrereqChain_costDeducted', () => {
      const w = game.world;
      w.tech.herbalMedicine = true;
      w.tech.aquaticTraining = true;
      w.tech.deepDiving = true;
      const tech = TECH_UPGRADES.tidalSurge;
      const clamsBefore = w.resources.clams;
      const twigsBefore = w.resources.twigs;

      expect(canResearch('tidalSurge', w.tech)).toBe(true);
      const ok = researchTech('tidalSurge');

      expect(ok).toBe(true);
      expect(w.tech.tidalSurge).toBe(true);
      expect(w.resources.clams).toBe(clamsBefore - tech.clamCost);
      expect(w.resources.twigs).toBe(twigsBefore - tech.twigCost);
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

      // canResearch returns false for already-researched tech
      expect(canResearch('cartography', w.tech)).toBe(false);

      const clamsBefore = w.resources.clams;
      const ok = researchTech('cartography');
      expect(ok).toBe(false);
      // Resources unchanged
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

    it('test_fullChain_lodge_sturdyMud_swiftPaws_rallyCry', () => {
      const w = game.world;

      // Research full chain
      expect(researchTech('sturdyMud')).toBe(true);
      expect(researchTech('swiftPaws')).toBe(true);
      expect(researchTech('rallyCry')).toBe(true);

      expect(w.tech.sturdyMud).toBe(true);
      expect(w.tech.swiftPaws).toBe(true);
      expect(w.tech.rallyCry).toBe(true);

      // Total cost deducted
      const totalClams =
        TECH_UPGRADES.sturdyMud.clamCost +
        TECH_UPGRADES.swiftPaws.clamCost +
        TECH_UPGRADES.rallyCry.clamCost;
      const totalTwigs =
        TECH_UPGRADES.sturdyMud.twigCost +
        TECH_UPGRADES.swiftPaws.twigCost +
        TECH_UPGRADES.rallyCry.twigCost;
      expect(w.resources.clams).toBe(10000 - totalClams);
      expect(w.resources.twigs).toBe(10000 - totalTwigs);
    });

    it('test_fullChain_armory_sharpSticks_eagleEye_siegeWorks_siegeEngineering', () => {
      const w = game.world;

      expect(researchTech('sharpSticks')).toBe(true);
      expect(researchTech('eagleEye')).toBe(true);
      expect(researchTech('siegeWorks')).toBe(true);
      expect(researchTech('siegeEngineering')).toBe(true);

      expect(w.tech.sharpSticks).toBe(true);
      expect(w.tech.eagleEye).toBe(true);
      expect(w.tech.siegeWorks).toBe(true);
      expect(w.tech.siegeEngineering).toBe(true);

      const totalClams =
        TECH_UPGRADES.sharpSticks.clamCost +
        TECH_UPGRADES.eagleEye.clamCost +
        TECH_UPGRADES.siegeWorks.clamCost +
        TECH_UPGRADES.siegeEngineering.clamCost;
      const totalTwigs =
        TECH_UPGRADES.sharpSticks.twigCost +
        TECH_UPGRADES.eagleEye.twigCost +
        TECH_UPGRADES.siegeWorks.twigCost +
        TECH_UPGRADES.siegeEngineering.twigCost;
      expect(w.resources.clams).toBe(10000 - totalClams);
      expect(w.resources.twigs).toBe(10000 - totalTwigs);
    });

    it('test_fullChain_nature_herbalMedicine_aquaticTraining_deepDiving_rootNetwork', () => {
      const w = game.world;

      expect(researchTech('herbalMedicine')).toBe(true);
      expect(researchTech('aquaticTraining')).toBe(true);
      expect(researchTech('deepDiving')).toBe(true);
      expect(researchTech('rootNetwork')).toBe(true);

      expect(w.tech.herbalMedicine).toBe(true);
      expect(w.tech.aquaticTraining).toBe(true);
      expect(w.tech.deepDiving).toBe(true);
      expect(w.tech.rootNetwork).toBe(true);

      const totalClams =
        TECH_UPGRADES.herbalMedicine.clamCost +
        TECH_UPGRADES.aquaticTraining.clamCost +
        TECH_UPGRADES.deepDiving.clamCost +
        TECH_UPGRADES.rootNetwork.clamCost;
      const totalTwigs =
        TECH_UPGRADES.herbalMedicine.twigCost +
        TECH_UPGRADES.aquaticTraining.twigCost +
        TECH_UPGRADES.deepDiving.twigCost +
        TECH_UPGRADES.rootNetwork.twigCost;
      expect(w.resources.clams).toBe(10000 - totalClams);
      expect(w.resources.twigs).toBe(10000 - totalTwigs);
    });

    it('test_canResearch_allTechs_initialState_matches_prerequisites', () => {
      const w = game.world;
      // Techs with no prerequisites should be researchable
      const noPrereq: TechId[] = ['sturdyMud', 'sharpSticks', 'cartography', 'tidalHarvest', 'herbalMedicine'];
      for (const id of noPrereq) {
        expect(canResearch(id, w.tech)).toBe(true);
      }

      // Techs with prerequisites should be blocked
      const withPrereq: TechId[] = [
        'swiftPaws', 'fortifiedWalls', 'rallyCry',
        'eagleEye', 'hardenedShells', 'piercingShot', 'ironShell',
        'siegeWorks', 'siegeEngineering', 'battleRoar', 'warDrums',
        'cunningTraps', 'venomCoating', 'camouflage',
        'tradeRoutes', 'pondBlessing', 'aquaticTraining', 'deepDiving',
        'rootNetwork', 'tidalSurge',
      ];
      for (const id of withPrereq) {
        expect(canResearch(id, w.tech)).toBe(false);
      }
    });
  });

  afterAll(() => {
    // Restore tech to clean state so other browser tests are not affected
    resetTechAndResources();
  });
});
