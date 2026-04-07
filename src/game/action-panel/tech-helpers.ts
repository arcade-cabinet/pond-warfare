/**
 * Action Panel — Training Queue Helpers
 *
 * Utilities for training queue display. Tech research functions
 * were removed in v3.0 (replaced by upgrade web).
 */

import { TRAIN_TIMER } from '@/constants';
import { getPlayerTrainableDisplayName } from '@/game/unit-display';
import { TrainingQueue, trainingQueueSlots } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { cancelTrain } from '@/input/selection';
import type { ReplayRecorder } from '@/replay';
import type { EntityKind } from '@/types';
import type { QueueItemDef } from '@/ui/action-panel';

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
      label: getPlayerTrainableDisplayName(unitKind).charAt(0),
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
