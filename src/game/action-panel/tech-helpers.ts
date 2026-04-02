/**
 * Action Panel — Tech Helpers
 *
 * Shared utilities for tech cost calculation, affordability checks,
 * purchasing, and training queue display.
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { entityKindName } from '@/config/entity-defs';
import { canResearch, TECH_UPGRADES, type TechId } from '@/config/tech-tree';
import { TRAIN_TIMER } from '@/constants';
import {
  FactionTag,
  Health,
  IsBuilding,
  TrainingQueue,
  trainingQueueSlots,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { cancelTrain } from '@/input/selection';
import type { ReplayRecorder } from '@/replay';
import { type EntityKind, Faction } from '@/types';
import type { QueueItemDef } from '@/ui/action-panel';
import { pushGameEvent } from '@/ui/game-events';

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

/** Techs that buff existing units -- flash all player units on research. */
const UNIT_BUFF_TECHS: ReadonlySet<TechId> = new Set([
  'sharpSticks',
  'eagleEye',
  'hardenedShells',
  'swiftPaws',
  'regeneration',
  'venomCoating',
]);

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

  // --- Research completion ceremony ---
  audio.researchComplete();
  pushGameEvent(`${upgrade.name} researched`, '#eab308', w.frameCount);

  // Floating announcement at camera center
  const cx = w.camX + w.viewWidth / 2;
  const cy = w.camY + 80;
  w.floatingTexts.push({
    x: cx,
    y: cy,
    text: `${upgrade.name} Researched!`,
    color: '#38bdf8',
    life: 90,
  });
  w.floatingTexts.push({
    x: cx,
    y: cy + 16,
    text: upgrade.description,
    color: '#94a3b8',
    life: 70,
  });

  // Flash all player units for techs that buff existing units
  if (UNIT_BUFF_TECHS.has(techId)) {
    const units = query(w.ecs, [Health, FactionTag]);
    for (let i = 0; i < units.length; i++) {
      const eid = units[i];
      if (FactionTag.faction[eid] !== Faction.Player) continue;
      if (Health.current[eid] <= 0) continue;
      if (hasComponent(w.ecs, eid, IsBuilding)) continue;
      Health.flashTimer[eid] = 15;
    }
  }

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
