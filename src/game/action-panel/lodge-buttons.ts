/**
 * Action Panel -- Lodge Buttons
 *
 * Train buttons (Gatherer, Scout, Swimmer) shown by Global Command
 * Center and when a completed Lodge is selected.
 *
 * In v3.0 the in-match tech research was removed, so inline tech
 * buttons (sturdyMud, swiftPaws) and the "Tech Tree" button are gone.
 * The Swimmer train button is gated on world.tech.aquaticTraining —
 * since that flag is always false in the v3 stub, the button simply
 * won't appear until the upgrade web grants it.
 */

import { ENTITY_DEFS } from '@/config/entity-defs';
import type { GameWorld } from '@/ecs/world';
import { train } from '@/input/selection';
import type { ReplayRecorder } from '@/replay';
import { EntityKind } from '@/types';
import type { ActionButtonDef } from '@/ui/action-panel';

export function buildLodgeButtons(
  w: GameWorld,
  lodgeEid: number,
  recorder?: ReplayRecorder,
): ActionButtonDef[] {
  const btns: ActionButtonDef[] = [];
  const gDef = ENTITY_DEFS[EntityKind.Gatherer];
  btns.push({
    title: 'Gatherer',
    cost: `${gDef.clamCost}C ${gDef.foodCost}F`,
    hotkey: 'Q',
    affordable:
      w.resources.clams >= (gDef.clamCost ?? 0) &&
      w.resources.food + (gDef.foodCost ?? 1) <= w.resources.maxFood,
    description: 'Worker unit. Gathers clams and twigs, builds structures.',
    category: 'train',
    costBreakdown: { clams: gDef.clamCost, twigs: gDef.twigCost, food: gDef.foodCost },
    onClick: () => {
      train(
        w,
        lodgeEid,
        EntityKind.Gatherer,
        gDef.clamCost ?? 0,
        gDef.twigCost ?? 0,
        gDef.foodCost ?? 1,
      );
      recorder?.record(w.frameCount, 'train', {
        buildingEid: lodgeEid,
        unitKind: EntityKind.Gatherer,
      });
    },
  });
  const scoutDef = ENTITY_DEFS[EntityKind.Scout];
  btns.push({
    title: 'Scout',
    cost: `${scoutDef.clamCost}C ${scoutDef.foodCost}F`,
    hotkey: 'R',
    affordable:
      w.resources.clams >= (scoutDef.clamCost ?? 0) &&
      w.resources.food + (scoutDef.foodCost ?? 1) <= w.resources.maxFood,
    description: 'Fast recon unit with wide vision range.',
    category: 'train',
    costBreakdown: { clams: scoutDef.clamCost, twigs: scoutDef.twigCost, food: scoutDef.foodCost },
    onClick: () => {
      train(
        w,
        lodgeEid,
        EntityKind.Scout,
        scoutDef.clamCost ?? 0,
        scoutDef.twigCost ?? 0,
        scoutDef.foodCost ?? 1,
      );
      recorder?.record(w.frameCount, 'train', {
        buildingEid: lodgeEid,
        unitKind: EntityKind.Scout,
      });
    },
  });

  // Swimmer — gated on aquaticTraining tech (always false in v3 stub)
  if (w.tech.aquaticTraining) {
    const swimDef = ENTITY_DEFS[EntityKind.Swimmer];
    const swimDiscount = 1 - w.commanderModifiers.passiveSwimmerCostReduction;
    const swimClam = Math.round((swimDef.clamCost ?? 0) * swimDiscount);
    const swimTwig = Math.round((swimDef.twigCost ?? 0) * swimDiscount);
    btns.push({
      title: 'Swimmer',
      cost: `${swimClam}C ${swimTwig}T ${swimDef.foodCost}F`,
      hotkey: 'F',
      affordable:
        w.resources.clams >= swimClam &&
        w.resources.twigs >= swimTwig &&
        w.resources.food + (swimDef.foodCost ?? 1) <= w.resources.maxFood,
      description: 'Amphibious fast unit. Great for scouting and harassing.',
      category: 'train',
      costBreakdown: { clams: swimClam, twigs: swimTwig, food: swimDef.foodCost },
      requires: 'Requires: Aquatic Training',
      onClick: () => {
        train(w, lodgeEid, EntityKind.Swimmer, swimClam, swimTwig, swimDef.foodCost ?? 1);
        recorder?.record(w.frameCount, 'train', {
          buildingEid: lodgeEid,
          unitKind: EntityKind.Swimmer,
        });
      },
    });
  }

  return btns;
}
