/**
 * Starting Resource Calculator
 *
 * Computes starting Fish/Rocks/Logs from panels.json formula × units.json costs.
 * Each tier defines how many of each unit type the player should be able to afford.
 * The formula multiplies unit counts by actual unit costs so if we rebalance costs,
 * starting resources automatically adjust.
 */

import { getUnitDef } from '@/config/config-loader';
import type { GameWorld } from '@/ecs/world';
import type { VerticalMapLayout } from '@/game/vertical-map';
import panelsConfig from '../../../configs/panels.json';

type UnitCounts = Record<string, number>;

interface StageFormula {
  fish: UnitCounts;
  rocks: number;
  logs: number;
}

/** Look up the fish cost of a unit type from units.json. */
function unitFishCost(unitType: string): number {
  const def = getUnitDef(unitType);
  if (!def) return 0;
  // GeneralistDef has .cost.fish, SpecialistDef doesn't have .cost
  if ('cost' in def && def.cost && typeof def.cost === 'object') {
    return (def.cost as Record<string, number>).fish ?? 0;
  }
  return 0;
}

/** Compute total starting Fish from the formula for a given stage. */
function computeStartingFish(formula: StageFormula): number {
  let total = 0;
  for (const [unitType, count] of Object.entries(formula.fish)) {
    if (unitType === 'buffer') {
      total += count;
    } else {
      total += unitFishCost(unitType) * count;
    }
  }
  return total;
}

/**
 * Apply starting resources to the world based on the current unlock stage.
 * Reads the formula from panels.json and unit costs from units.json.
 */
export function applyStartingResources(world: GameWorld, layout: VerticalMapLayout): void {
  const stage = layout.panelGrid?.getActivePanels().length ?? 1;
  const stageKey = String(Math.min(stage, 6));

  const formulas = (panelsConfig as Record<string, unknown>).starting_resources_formula as
    | Record<string, StageFormula>
    | undefined;

  if (!formulas?.[stageKey]) {
    // Fallback: enough for 2 gatherers + 1 fighter
    world.resources.fish = 40;
    return;
  }

  const formula = formulas[stageKey];
  world.resources.fish = computeStartingFish(formula);
  world.resources.rocks = formula.rocks;
  world.resources.logs = formula.logs;
}
