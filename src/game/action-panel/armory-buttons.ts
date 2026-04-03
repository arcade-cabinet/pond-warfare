/**
 * Action Panel -- Armory Buttons
 *
 * Train buttons (Brawler, Sniper, Healer, Shieldbearer, Catapult, Trapper)
 * shown when a completed Armory is selected.
 *
 * In v3.0 the in-match tech research was removed, so inline tech buttons
 * (sharpSticks, eagleEye, etc.) and the late-game tech panel are gone.
 * Conditional units (Shieldbearer, Catapult, Trapper) are gated on
 * world.tech flags — since those are always false in the v3 stub,
 * the buttons simply won't appear until the upgrade web grants them.
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
    cost: `${bDef.clamCost}C ${bDef.twigCost}T ${bDef.foodCost}F`,
    hotkey: 'Q',
    affordable:
      w.resources.clams >= (bDef.clamCost ?? 0) &&
      w.resources.twigs >= (bDef.twigCost ?? 0) &&
      w.resources.food + (bDef.foodCost ?? 1) <= w.resources.maxFood,
    description: 'Tough melee fighter. Short range, high damage.',
    category: 'train',
    costBreakdown: { clams: bDef.clamCost, twigs: bDef.twigCost, food: bDef.foodCost },
    onClick: () => {
      train(
        w,
        selEid,
        EntityKind.Brawler,
        bDef.clamCost ?? 0,
        bDef.twigCost ?? 0,
        bDef.foodCost ?? 1,
      );
    },
  });
  const sDef = ENTITY_DEFS[EntityKind.Sniper];
  btns.push({
    title: 'Sniper',
    cost: `${sDef.clamCost}C ${sDef.twigCost}T ${sDef.foodCost}F`,
    hotkey: 'W',
    affordable:
      w.resources.clams >= (sDef.clamCost ?? 0) &&
      w.resources.twigs >= (sDef.twigCost ?? 0) &&
      w.resources.food + (sDef.foodCost ?? 1) <= w.resources.maxFood,
    description: 'Ranged attacker. Long range, lower HP.',
    category: 'train',
    costBreakdown: { clams: sDef.clamCost, twigs: sDef.twigCost, food: sDef.foodCost },
    onClick: () => {
      train(
        w,
        selEid,
        EntityKind.Sniper,
        sDef.clamCost ?? 0,
        sDef.twigCost ?? 0,
        sDef.foodCost ?? 1,
      );
    },
  });
  const hDef = ENTITY_DEFS[EntityKind.Healer];
  btns.push({
    title: 'Healer',
    cost: `${hDef.clamCost}C ${hDef.twigCost}T ${hDef.foodCost}F`,
    hotkey: 'E',
    affordable:
      w.resources.clams >= (hDef.clamCost ?? 0) &&
      w.resources.twigs >= (hDef.twigCost ?? 0) &&
      w.resources.food + (hDef.foodCost ?? 1) <= w.resources.maxFood,
    description: 'Support unit. Heals nearby friendly units over time.',
    category: 'train',
    costBreakdown: { clams: hDef.clamCost, twigs: hDef.twigCost, food: hDef.foodCost },
    onClick: () => {
      train(
        w,
        selEid,
        EntityKind.Healer,
        hDef.clamCost ?? 0,
        hDef.twigCost ?? 0,
        hDef.foodCost ?? 1,
      );
    },
  });

  // Conditional train units — gated on tech flags (always false in v3 stub)
  if (w.tech.ironShell) {
    const sbDef = ENTITY_DEFS[EntityKind.Shieldbearer];
    btns.push({
      title: 'Shieldbearer',
      cost: `${sbDef.clamCost}C ${sbDef.twigCost}T ${sbDef.foodCost}F`,
      hotkey: 'U',
      affordable:
        w.resources.clams >= (sbDef.clamCost ?? 0) &&
        w.resources.twigs >= (sbDef.twigCost ?? 0) &&
        w.resources.food + (sbDef.foodCost ?? 1) <= w.resources.maxFood,
      description: 'Heavy tank unit with shield. High HP, absorbs damage.',
      category: 'train',
      costBreakdown: { clams: sbDef.clamCost, twigs: sbDef.twigCost, food: sbDef.foodCost },
      requires: 'Requires: Iron Shell',
      onClick: () => {
        train(
          w,
          selEid,
          EntityKind.Shieldbearer,
          sbDef.clamCost ?? 0,
          sbDef.twigCost ?? 0,
          sbDef.foodCost ?? 1,
        );
      },
    });
  }
  if (w.tech.siegeWorks) {
    const catDef = ENTITY_DEFS[EntityKind.Catapult];
    btns.push({
      title: 'Catapult',
      cost: `${catDef.clamCost}C ${catDef.twigCost}T ${catDef.foodCost}F`,
      hotkey: 'I',
      affordable:
        w.resources.clams >= (catDef.clamCost ?? 0) &&
        w.resources.twigs >= (catDef.twigCost ?? 0) &&
        w.resources.food + (catDef.foodCost ?? 1) <= w.resources.maxFood,
      description: 'Siege unit. Area-of-effect damage at long range.',
      category: 'train',
      costBreakdown: { clams: catDef.clamCost, twigs: catDef.twigCost, food: catDef.foodCost },
      requires: 'Requires: Siege Works',
      onClick: () => {
        train(
          w,
          selEid,
          EntityKind.Catapult,
          catDef.clamCost ?? 0,
          catDef.twigCost ?? 0,
          catDef.foodCost ?? 1,
        );
      },
    });
  }

  // Trapper (conditional on cunningTraps)
  if (w.tech.cunningTraps) {
    const trapDef = ENTITY_DEFS[EntityKind.Trapper];
    btns.push({
      title: 'Trapper',
      cost: `${trapDef.clamCost}C ${trapDef.twigCost}T ${trapDef.foodCost}F`,
      hotkey: 'N',
      affordable:
        w.resources.clams >= (trapDef.clamCost ?? 0) &&
        w.resources.twigs >= (trapDef.twigCost ?? 0) &&
        w.resources.food + (trapDef.foodCost ?? 1) <= w.resources.maxFood,
      description: 'Utility unit. Places traps that slow enemies.',
      category: 'train',
      costBreakdown: { clams: trapDef.clamCost, twigs: trapDef.twigCost, food: trapDef.foodCost },
      requires: 'Requires: Cunning Traps',
      onClick: () => {
        train(
          w,
          selEid,
          EntityKind.Trapper,
          trapDef.clamCost ?? 0,
          trapDef.twigCost ?? 0,
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
