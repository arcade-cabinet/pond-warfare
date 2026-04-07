/**
 * Action Panel Builder
 *
 * Builds context-sensitive action buttons and training queue items for
 * the selected entity (or global Command Center when nothing is selected).
 */

import { query } from 'bitecs';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import type { ReplayRecorder } from '@/replay';
import { EntityKind, Faction } from '@/types';
import {
  type ActionButtonDef,
  actionButtons,
  type QueueItemDef,
  queueItems,
} from '@/ui/action-panel';

import { buildMudpawButtons } from './mudpaw-buttons';
import { buildLodgeButtons } from './lodge-buttons';
import { buildMarketButtons } from './market-buttons';
import { buildTrainingQueueItems } from './tech-helpers';

/**
 * Build the action panel buttons and queue items based on the current selection.
 * Writes directly to the actionButtons and queueItems signals.
 */
export function buildActionPanel(world: GameWorld, recorder?: ReplayRecorder): void {
  const w = world;
  const btns: ActionButtonDef[] = [];
  const qItems: QueueItemDef[] = [];

  if (w.selection.length === 0) {
    // Global Command Center: find first completed player Lodge and show its actions
    const allBuildings = query(w.ecs, [Position, Health, FactionTag, EntityTypeTag, IsBuilding]);
    let lodgeEid = -1;
    for (let i = 0; i < allBuildings.length; i++) {
      const eid = allBuildings[i];
      if (
        FactionTag.faction[eid] === Faction.Player &&
        EntityTypeTag.kind[eid] === EntityKind.Lodge &&
        Health.current[eid] > 0 &&
        Building.progress[eid] >= 100
      ) {
        lodgeEid = eid;
        break;
      }
    }
    if (lodgeEid >= 0) {
      btns.push(...buildLodgeButtons(w, lodgeEid));
      buildTrainingQueueItems(w, lodgeEid, qItems);
    }
  } else if (w.selection.length === 1) {
    const selEid = w.selection[0];
    const selKind = EntityTypeTag.kind[selEid] as EntityKind;
    const selFaction = FactionTag.faction[selEid] as Faction;

    if (selFaction === Faction.Player) {
      if (selKind === EntityKind.Gatherer) {
        btns.push(...buildMudpawButtons(w));
      }

      if (selKind === EntityKind.Lodge && Building.progress[selEid] >= 100) {
        btns.push(...buildLodgeButtons(w, selEid));
      }

      if (selKind === EntityKind.Market && Building.progress[selEid] >= 100) {
        btns.push(...buildMarketButtons(w, selEid));
      }

      if (selKind === EntityKind.Lodge) {
        buildTrainingQueueItems(w, selEid, qItems);
      }
    }
  }

  actionButtons.value = btns;
  queueItems.value = qItems;
}
