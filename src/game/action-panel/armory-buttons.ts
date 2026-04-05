/**
 * Action Panel -- Armory Buttons
 *
 * Train buttons (Brawler, Sniper, Healer, Shieldbearer, Catapult, Trapper)
 * shown when a completed Armory is selected.
 *
 * In v3.0 in-match tech research was replaced by the upgrade web.
 * Conditional units (Shieldbearer, Catapult, Trapper) are gated on
 * world.tech flags set by the upgrade web and commander abilities.
 */

import { ENTITY_DEFS } from '@/config/entity-defs';
import type { GameWorld } from '@/ecs/world';
import { train } from '@/input/selection';
import type { ReplayRecorder } from '@/replay';
import { EntityKind } from '@/types';
import type { ActionButtonDef } from '@/ui/action-panel';

export function buildArmoryButtons(
  w: GameWorld,
  selEid: number,
  recorder?: ReplayRecorder,
): ActionButtonDef[] {
  const btns: ActionButtonDef[] = [];

  const bDef = ENTITY_DEFS[EntityKind.Brawler];
  btns.push({
    title: 'Brawler',
    cost: `${bDef.fishCost}F ${bDef.logCost}L ${bDef.foodCost}F`,
    hotkey: 'Q',
    affordable:
      w.resources.fish >= (bDef.fishCost ?? 0) &&
      w.resources.logs >= (bDef.logCost ?? 0) &&
      w.resources.food + (bDef.foodCost ?? 1) <= w.resources.maxFood,
    description: 'Tough melee fighter. Short range, high damage.',
    category: 'train',
    costBreakdown: { fish: bDef.fishCost, logs: bDef.logCost, food: bDef.foodCost },
    onClick: () => {
      train(
        w,
        selEid,
        EntityKind.Brawler,
        bDef.fishCost ?? 0,
        bDef.logCost ?? 0,
        bDef.foodCost ?? 1,
      );
    },
  });
  const sDef = ENTITY_DEFS[EntityKind.Sniper];
  btns.push({
    title: 'Sniper',
    cost: `${sDef.fishCost}F ${sDef.logCost}L ${sDef.foodCost}F`,
    hotkey: 'W',
    affordable:
      w.resources.fish >= (sDef.fishCost ?? 0) &&
      w.resources.logs >= (sDef.logCost ?? 0) &&
      w.resources.food + (sDef.foodCost ?? 1) <= w.resources.maxFood,
    description: 'Ranged attacker. Long range, lower HP.',
    category: 'train',
    costBreakdown: { fish: sDef.fishCost, logs: sDef.logCost, food: sDef.foodCost },
    onClick: () => {
      train(
        w,
        selEid,
        EntityKind.Sniper,
        sDef.fishCost ?? 0,
        sDef.logCost ?? 0,
        sDef.foodCost ?? 1,
      );
    },
  });
  const hDef = ENTITY_DEFS[EntityKind.Healer];
  btns.push({
    title: 'Healer',
    cost: `${hDef.fishCost}F ${hDef.logCost}L ${hDef.foodCost}F`,
    hotkey: 'E',
    affordable:
      w.resources.fish >= (hDef.fishCost ?? 0) &&
      w.resources.logs >= (hDef.logCost ?? 0) &&
      w.resources.food + (hDef.foodCost ?? 1) <= w.resources.maxFood,
    description: 'Support unit. Heals nearby friendly units over time.',
    category: 'train',
    costBreakdown: { fish: hDef.fishCost, logs: hDef.logCost, food: hDef.foodCost },
    onClick: () => {
      train(
        w,
        selEid,
        EntityKind.Healer,
        hDef.fishCost ?? 0,
        hDef.logCost ?? 0,
        hDef.foodCost ?? 1,
      );
    },
  });

  // Conditional train units -- gated on tech flags from upgrade web
  if (w.tech.ironShell) {
    const sbDef = ENTITY_DEFS[EntityKind.Shieldbearer];
    btns.push({
      title: 'Shieldbearer',
      cost: `${sbDef.fishCost}F ${sbDef.logCost}L ${sbDef.foodCost}F`,
      hotkey: 'U',
      affordable:
        w.resources.fish >= (sbDef.fishCost ?? 0) &&
        w.resources.logs >= (sbDef.logCost ?? 0) &&
        w.resources.food + (sbDef.foodCost ?? 1) <= w.resources.maxFood,
      description: 'Heavy tank unit with shield. High HP, absorbs damage.',
      category: 'train',
      costBreakdown: { fish: sbDef.fishCost, logs: sbDef.logCost, food: sbDef.foodCost },
      requires: 'Requires: Iron Shell',
      onClick: () => {
        train(
          w,
          selEid,
          EntityKind.Shieldbearer,
          sbDef.fishCost ?? 0,
          sbDef.logCost ?? 0,
          sbDef.foodCost ?? 1,
        );
      },
    });
  }
  if (w.tech.siegeWorks) {
    const catDef = ENTITY_DEFS[EntityKind.Catapult];
    btns.push({
      title: 'Catapult',
      cost: `${catDef.fishCost}F ${catDef.logCost}L ${catDef.foodCost}F`,
      hotkey: 'I',
      affordable:
        w.resources.fish >= (catDef.fishCost ?? 0) &&
        w.resources.logs >= (catDef.logCost ?? 0) &&
        w.resources.food + (catDef.foodCost ?? 1) <= w.resources.maxFood,
      description: 'Siege unit. Area-of-effect damage at long range.',
      category: 'train',
      costBreakdown: { fish: catDef.fishCost, logs: catDef.logCost, food: catDef.foodCost },
      requires: 'Requires: Siege Works',
      onClick: () => {
        train(
          w,
          selEid,
          EntityKind.Catapult,
          catDef.fishCost ?? 0,
          catDef.logCost ?? 0,
          catDef.foodCost ?? 1,
        );
      },
    });
  }

  // Trapper -- gated on cunningTraps upgrade
  if (w.tech.cunningTraps) {
    const trapDef = ENTITY_DEFS[EntityKind.Trapper];
    btns.push({
      title: 'Trapper',
      cost: `${trapDef.fishCost}F ${trapDef.logCost}L ${trapDef.foodCost}F`,
      hotkey: 'N',
      affordable:
        w.resources.fish >= (trapDef.fishCost ?? 0) &&
        w.resources.logs >= (trapDef.logCost ?? 0) &&
        w.resources.food + (trapDef.foodCost ?? 1) <= w.resources.maxFood,
      description: 'Utility unit. Places traps that slow enemies.',
      category: 'train',
      costBreakdown: { fish: trapDef.fishCost, logs: trapDef.logCost, food: trapDef.foodCost },
      requires: 'Requires: Cunning Traps',
      onClick: () => {
        train(
          w,
          selEid,
          EntityKind.Trapper,
          trapDef.fishCost ?? 0,
          trapDef.logCost ?? 0,
          trapDef.foodCost ?? 1,
        );
        recorder?.record(w.frameCount, 'train', {
          buildingEid: selEid,
          unitKind: EntityKind.Trapper,
        });
      },
    });
  }

  return btns;
}
