/**
 * Action Panel -- Lodge Buttons
 *
 * Train buttons (Gatherer, Scout, Swimmer) shown by Global Command
 * Center and when a completed Lodge is selected.
 *
 * In v3.0 in-match tech research was replaced by the upgrade web.
 * The Swimmer train button is gated on world.tech.aquaticTraining,
 * which is set by the upgrade web.
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
    cost: `${gDef.fishCost}F ${gDef.foodCost}F`,
    hotkey: 'Q',
    affordable:
      w.resources.fish >= (gDef.fishCost ?? 0) &&
      w.resources.food + (gDef.foodCost ?? 1) <= w.resources.maxFood,
    description: 'Worker unit. Gathers fish and logs, builds structures.',
    category: 'train',
    costBreakdown: { fish: gDef.fishCost, logs: gDef.logCost, food: gDef.foodCost },
    onClick: () => {
      train(
        w,
        lodgeEid,
        EntityKind.Gatherer,
        gDef.fishCost ?? 0,
        gDef.logCost ?? 0,
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
    cost: `${scoutDef.fishCost}F ${scoutDef.foodCost}F`,
    hotkey: 'R',
    affordable:
      w.resources.fish >= (scoutDef.fishCost ?? 0) &&
      w.resources.food + (scoutDef.foodCost ?? 1) <= w.resources.maxFood,
    description: 'Fast recon unit with wide vision range.',
    category: 'train',
    costBreakdown: { fish: scoutDef.fishCost, logs: scoutDef.logCost, food: scoutDef.foodCost },
    onClick: () => {
      train(
        w,
        lodgeEid,
        EntityKind.Scout,
        scoutDef.fishCost ?? 0,
        scoutDef.logCost ?? 0,
        scoutDef.foodCost ?? 1,
      );
      recorder?.record(w.frameCount, 'train', {
        buildingEid: lodgeEid,
        unitKind: EntityKind.Scout,
      });
    },
  });

  // Swimmer -- gated on aquaticTraining upgrade
  if (w.tech.aquaticTraining) {
    const swimDef = ENTITY_DEFS[EntityKind.Swimmer];
    const swimDiscount = 1 - w.commanderModifiers.passiveSwimmerCostReduction;
    const swimFish = Math.round((swimDef.fishCost ?? 0) * swimDiscount);
    const swimLog = Math.round((swimDef.logCost ?? 0) * swimDiscount);
    btns.push({
      title: 'Swimmer',
      cost: `${swimFish}F ${swimLog}L ${swimDef.foodCost}F`,
      hotkey: 'F',
      affordable:
        w.resources.fish >= swimFish &&
        w.resources.logs >= swimLog &&
        w.resources.food + (swimDef.foodCost ?? 1) <= w.resources.maxFood,
      description: 'Amphibious fast unit. Great for scouting and harassing.',
      category: 'train',
      costBreakdown: { fish: swimFish, logs: swimLog, food: swimDef.foodCost },
      requires: 'Requires: Aquatic Training',
      onClick: () => {
        train(w, lodgeEid, EntityKind.Swimmer, swimFish, swimLog, swimDef.foodCost ?? 1);
        recorder?.record(w.frameCount, 'train', {
          buildingEid: lodgeEid,
          unitKind: EntityKind.Swimmer,
        });
      },
    });
  }

  return btns;
}
