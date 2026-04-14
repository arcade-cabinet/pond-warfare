/**
 * Training System
 *
 * Ported from Entity.update() training queue logic (lines 1743-1754) of the original HTML game.
 *
 * Responsibilities:
 * - Count down training timer for buildings with queued units
 * - Spawn unit entity when training completes
 * - Apply rally point movement command to newly spawned units
 * - Advance the queue (shift next unit to front)
 * - Particle burst effect on training completion
 */

import { query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  Sprite,
  TrainingQueue,
  trainingQueueCostSlots,
  trainingQueueSlots,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { getPlayerTrainTimer } from '@/game/train-timer';
import { getEntityDisplayName } from '@/game/unit-display';
import { triggerSpawnPop } from '@/rendering/animations';
import { type EntityKind, Faction, UnitState } from '@/types';
import { pushGameEvent } from '@/ui/game-events';
import { spawnDustBurst } from '@/utils/particles';

export function trainingSystem(world: GameWorld): void {
  const buildings = query(world.ecs, [
    Position,
    TrainingQueue,
    Building,
    FactionTag,
    IsBuilding,
    Health,
    Sprite,
  ]);

  for (let i = 0; i < buildings.length; i++) {
    const eid = buildings[i];

    // Only player buildings train units
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (Building.progress[eid] < 100) continue;

    const slots = trainingQueueSlots.get(eid) ?? [];
    const count = slots.length;
    if (count === 0) continue;

    // Count down timer
    TrainingQueue.timer[eid] -= 1;
    if (TrainingQueue.timer[eid] <= 0) {
      // Get the first queued unit type from the slots map
      const unitKind = slots[0] as EntityKind;

      // Spawn position: offset from building
      const bx = Position.x[eid];
      const by = Position.y[eid];
      const spriteH = Sprite.height[eid];
      const sx = bx + (world.gameRng.next() > 0.5 ? 1 : -1) * 30;
      const sy = by + spriteH / 2 + 20;

      // Spawn the unit
      const newEid = spawnEntity(world, unitKind, sx, sy, Faction.Player);
      if (newEid < 0) {
        TrainingQueue.timer[eid] = getPlayerTrainTimer(world);
        continue;
      }

      // Track trained unit stat
      world.stats.unitsTrained++;

      // Apply rally point if set
      if (Building.hasRally[eid]) {
        UnitStateMachine.targetX[newEid] = Building.rallyX[eid];
        UnitStateMachine.targetY[newEid] = Building.rallyY[eid];
        UnitStateMachine.state[newEid] = UnitState.Move;
      }

      // Shift queue: remove front item
      slots.shift();
      trainingQueueSlots.set(eid, slots);
      const costSlots = trainingQueueCostSlots.get(eid) ?? [];
      costSlots.shift();
      trainingQueueCostSlots.set(eid, costSlots);
      TrainingQueue.count[eid] = slots.length;

      // Set timer for next unit if queue still has entries
      if (TrainingQueue.count[eid] > 0) {
        TrainingQueue.timer[eid] = getPlayerTrainTimer(world, slots[0] as EntityKind);
      }

      // Training complete sound + unit selection voice
      audio.trainComplete();
      audio.playSelectionVoice(unitKind, world.playerFaction);

      // "{Unit Name} Ready" floating text near building
      const unitName = getEntityDisplayName(world, newEid);

      // Event feed
      pushGameEvent(`${unitName} trained`, '#38bdf8', world.frameCount);
      world.floatingTexts.push({
        x: bx,
        y: by - 20,
        text: `${unitName} Ready`,
        color: '#38bdf8',
        life: 50,
      });

      // Spawn pop animation (scale 0 -> 1.2 -> 1.0)
      triggerSpawnPop(newEid);

      // Training complete particle burst + dust at feet
      for (let j = 0; j < 8; j++) {
        world.particles.push({
          x: sx,
          y: sy,
          vx: (world.gameRng.next() - 0.5) * 3,
          vy: world.gameRng.next() * 2,
          life: 20,
          color: '#38bdf8',
          size: 3,
        });
      }
      // Dust particles at spawn position
      spawnDustBurst(world, sx, sy);
    }
  }
}
