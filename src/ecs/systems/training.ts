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
import { TRAIN_TIMER } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  Sprite,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { type EntityKind, Faction, UnitState } from '@/types';

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
    // Original: if (this.isBuilding && this.faction === 'player' && this.q && this.q.length > 0)
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (Building.progress[eid] < 100) continue;

    const slots = trainingQueueSlots.get(eid) ?? [];
    const count = slots.length;
    if (count === 0) continue;

    // Count down timer
    // Original: if (--this.qTimer <= 0)
    TrainingQueue.timer[eid]--;
    if (TrainingQueue.timer[eid] <= 0) {
      // Get the first queued unit type from the slots map
      // Original: let t = this.q.shift()
      const unitKind = slots[0] as EntityKind;

      // Spawn position: offset from building
      // Original: let sx = this.x + (Math.random()>.5?1:-1)*30, sy = this.y + this.height/2 + 20
      const bx = Position.x[eid];
      const by = Position.y[eid];
      const spriteH = Sprite.height[eid];
      const sx = bx + (Math.random() > 0.5 ? 1 : -1) * 30;
      const sy = by + spriteH / 2 + 20;

      // Spawn the unit
      // Original: let newEnt = new Entity(t, sx, sy, 'player');
      const newEid = spawnEntity(world, unitKind, sx, sy, Faction.Player);
      if (newEid < 0) {
        TrainingQueue.timer[eid] = TRAIN_TIMER;
        continue;
      }

      // Apply rally point if set
      // Original: if (this.rallyPos) newEnt.cmdMove(this.rallyPos.x, this.rallyPos.y);
      if (Building.hasRally[eid]) {
        UnitStateMachine.targetX[newEid] = Building.rallyX[eid];
        UnitStateMachine.targetY[newEid] = Building.rallyY[eid];
        UnitStateMachine.state[newEid] = UnitState.Move;
      }

      // Shift queue: remove front item
      // Original: this.q.shift() already removed index 0
      slots.shift();
      trainingQueueSlots.set(eid, slots);
      TrainingQueue.count[eid] = slots.length;

      // Set timer for next unit if queue still has entries
      // Original: if (this.q.length > 0) this.qTimer = 180;
      if (TrainingQueue.count[eid] > 0) {
        TrainingQueue.timer[eid] = TRAIN_TIMER;
      }

      // Training complete sound
      audio.trainComplete();

      // Training complete particle burst
      // Original: for(let j=0; j<8; j++) GAME.particles.push({x: sx, y: sy, vx:(Math.random()-.5)*3, vy:Math.random()*2, life:20, c:'#38bdf8', s:3});
      for (let j = 0; j < 8; j++) {
        world.particles.push({
          x: sx,
          y: sy,
          vx: (Math.random() - 0.5) * 3,
          vy: Math.random() * 2,
          life: 20,
          color: '#38bdf8',
          size: 3,
        });
      }
    }
  }
}
