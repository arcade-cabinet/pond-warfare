/**
 * Group Selection Commands
 *
 * Select idle workers (with cycling) and select all army units.
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Selectable,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

/** Select idle worker with cycling. */
export function selectIdleWorker(world: GameWorld): void {
  audio.selectUnit();
  const ents = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  const idles = ents.filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      EntityTypeTag.kind[eid] === EntityKind.Gatherer &&
      UnitStateMachine.state[eid] === UnitState.Idle,
  );

  if (idles.length > 0) {
    world.idleWorkerIdx = world.idleWorkerIdx % idles.length;
    for (const eid of world.selection) {
      if (hasComponent(world.ecs, eid, Selectable)) {
        Selectable.selected[eid] = 0;
      }
    }
    const target = idles[world.idleWorkerIdx];
    world.selection = [target];
    Selectable.selected[target] = 1;
    world.isTracking = true;
    world.idleWorkerIdx++;
  }
}

/** Select all army units (non-gatherer player units). */
export function selectArmy(world: GameWorld): void {
  audio.selectUnit();
  const ents = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  const army = ents.filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      !hasComponent(world.ecs, eid, IsBuilding) &&
      !hasComponent(world.ecs, eid, IsResource) &&
      EntityTypeTag.kind[eid] !== EntityKind.Gatherer &&
      EntityTypeTag.kind[eid] !== EntityKind.Commander &&
      Health.current[eid] > 0,
  );

  if (army.length > 0) {
    for (const eid of world.selection) {
      if (hasComponent(world.ecs, eid, Selectable)) {
        Selectable.selected[eid] = 0;
      }
    }
    world.selection = Array.from(army);
    for (const eid of army) {
      Selectable.selected[eid] = 1;
    }
    world.isTracking = true;
  }
}
