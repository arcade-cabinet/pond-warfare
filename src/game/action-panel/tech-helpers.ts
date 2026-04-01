/**
 * Action Panel — Tech Helpers
 *
 * Shared utilities for tech cost calculation, affordability checks,
 * purchasing, and training queue display.
 */

import { entityKindName } from '@/config/entity-defs';
import { canResearch, TECH_UPGRADES, type TechId } from '@/config/tech-tree';
import { TRAIN_TIMER } from '@/constants';
import { TrainingQueue, trainingQueueSlots } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { cancelTrain } from '@/input/selection';
import type { ReplayRecorder } from '@/replay';
import type { EntityKind } from '@/types';
import type { QueueItemDef } from '@/ui/action-panel';

/** Apply Sage passive research discount to a tech cost. */
export function discountedTechCost(
  w: GameWorld,
  clamCost: number,
  twigCost: number,
): { clams: number; twigs: number } {
  const d = 1 - w.commanderModifiers.passiveResearchSpeed;
  return { clams: Math.round(clamCost * d), twigs: Math.round(twigCost * d) };
}

/** Check affordability for a tech upgrade with Sage discount applied. */
export function canAffordTech(w: GameWorld, techId: TechId): boolean {
  const upgrade = TECH_UPGRADES[techId];
  const { clams, twigs } = discountedTechCost(w, upgrade.clamCost, upgrade.twigCost);
  const pearlCost = (upgrade as { pearlCost?: number }).pearlCost ?? 0;
  return (
    canResearch(techId, w.tech) &&
    w.resources.clams >= clams &&
    w.resources.twigs >= twigs &&
    w.resources.pearls >= pearlCost
  );
}

/** Purchase a tech upgrade, applying Sage discount. Returns true if successful. */
export function purchaseTech(w: GameWorld, techId: TechId): boolean {
  const upgrade = TECH_UPGRADES[techId];
  const { clams, twigs } = discountedTechCost(w, upgrade.clamCost, upgrade.twigCost);
  const pearlCost = (upgrade as { pearlCost?: number }).pearlCost ?? 0;
  if (
    !canResearch(techId, w.tech) ||
    w.resources.clams < clams ||
    w.resources.twigs < twigs ||
    w.resources.pearls < pearlCost
  )
    return false;
  w.resources.clams -= clams;
  w.resources.twigs -= twigs;
  w.resources.pearls -= pearlCost;
  w.tech[techId] = true;
  return true;
}

/** Return a human-readable "Requires: <Tech Name>" string for a tech upgrade, or undefined. */
export function techRequiresLabel(techId: TechId): string | undefined {
  const upgrade = TECH_UPGRADES[techId];
  if ('requires' in upgrade && upgrade.requires) {
    const req = TECH_UPGRADES[upgrade.requires];
    return `Requires: ${req.name}`;
  }
  return undefined;
}

/** Build training queue display items for any building with an active queue. */
export function buildTrainingQueueItems(
  w: GameWorld,
  buildingEid: number,
  qItems: QueueItemDef[],
  recorder?: ReplayRecorder,
): void {
  const slots = trainingQueueSlots.get(buildingEid) ?? [];
  for (let qi = 0; qi < slots.length; qi++) {
    const unitKind = slots[qi] as EntityKind;
    const progress =
      qi === 0
        ? Math.max(
            0,
            Math.min(100, ((TRAIN_TIMER - TrainingQueue.timer[buildingEid]) / TRAIN_TIMER) * 100),
          )
        : 0;
    const idx = qi;
    qItems.push({
      label: entityKindName(unitKind).charAt(0),
      progressPct: progress,
      onCancel: () => {
        cancelTrain(w, buildingEid, idx);
        recorder?.record(w.frameCount, 'cancel-train', {
          buildingEid,
          index: idx,
          unitKind,
        });
      },
    });
  }
}
