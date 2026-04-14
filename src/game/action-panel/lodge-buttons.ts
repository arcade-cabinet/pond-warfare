/**
 * Action Panel -- Lodge Buttons
 *
 * The player-facing manual roster is now the canonical Mudpaw path:
 * Mudpaw at stage 1, Medic at stage 2, Sapper at stage 5, Saboteur at stage 6.
 */

import type { GameWorld } from '@/ecs/world';
import { MEDIC_KIND, MUDPAW_KIND, SABOTEUR_KIND, SAPPER_KIND } from '@/game/live-unit-kinds';
import { getPlayerTrainingCost } from '@/game/training-costs';
import { train } from '@/input/selection/queries';
import type { ReplayRecorder } from '@/replay';
import type { EntityKind } from '@/types';
import type { ActionButtonDef } from '@/ui/action-panel';
import { buildSpecialistButtons } from './specialist-buttons';

interface ManualButtonSpec {
  kind: EntityKind;
  title: string;
  hotkey: string;
  requiredStage: number;
  description: string;
}

const MANUAL_BUTTON_SPECS: ManualButtonSpec[] = [
  {
    kind: MUDPAW_KIND,
    title: 'Mudpaw',
    hotkey: 'Q',
    requiredStage: 1,
    description: 'Generalist manual otter. Gathers, fights, runs recon, builds, and repairs.',
  },
  {
    kind: MEDIC_KIND,
    title: 'Medic',
    hotkey: 'W',
    requiredStage: 2,
    description: 'Field support manual unit that keeps Mudpaws and siege teams alive.',
  },
  {
    kind: SAPPER_KIND,
    title: 'Sapper',
    hotkey: 'E',
    requiredStage: 5,
    description: 'Manual siege specialist for breaking late-panel fort pressure.',
  },
  {
    kind: SABOTEUR_KIND,
    title: 'Saboteur',
    hotkey: 'R',
    requiredStage: 6,
    description: 'Manual disruption specialist for the full six-panel frontier.',
  },
];

export function buildLodgeButtons(
  w: GameWorld,
  lodgeEid: number,
  recorder?: ReplayRecorder,
): ActionButtonDef[] {
  const btns: ActionButtonDef[] = [];
  const stage = w.panelGrid?.getActivePanels().length ?? 1;

  for (const spec of MANUAL_BUTTON_SPECS) {
    if (stage < spec.requiredStage) continue;

    const adjustedCost = getPlayerTrainingCost(w, spec.kind);
    const fishCost = adjustedCost.fish;
    const logCost = adjustedCost.logs;
    const rockCost = adjustedCost.rocks;
    const foodCost = adjustedCost.food;

    btns.push({
      title: spec.title,
      cost: formatManualCost(fishCost, logCost, rockCost, foodCost),
      hotkey: spec.hotkey,
      affordable:
        w.resources.fish >= fishCost &&
        w.resources.logs >= logCost &&
        w.resources.rocks >= rockCost &&
        w.resources.food + foodCost <= w.resources.maxFood,
      description: spec.description,
      category: 'train',
      costBreakdown: { fish: fishCost, logs: logCost, rocks: rockCost, food: foodCost },
      onClick: () => {
        train(w, lodgeEid, spec.kind, fishCost, logCost, foodCost, rockCost);
        recorder?.record(w.frameCount, 'train', {
          buildingEid: lodgeEid,
          unitKind: spec.kind,
        });
      },
    });
  }

  btns.push(...buildSpecialistButtons(w, lodgeEid, recorder));
  return btns;
}

function formatManualCost(
  fishCost: number,
  logCost: number,
  rockCost: number,
  foodCost: number,
): string {
  const parts: string[] = [];
  if (fishCost > 0) parts.push(`${fishCost}F`);
  if (logCost > 0) parts.push(`${logCost}L`);
  if (rockCost > 0) parts.push(`${rockCost}R`);
  parts.push(`${foodCost}Pop`);
  return parts.join(' ');
}
