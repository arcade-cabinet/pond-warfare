/**
 * Selection Commands
 *
 * Context command dispatch, formation positioning, and idle/army selection.
 */

import { hasComponent } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { showBark } from '@/config/barks';
import {
  Building,
  Carrying,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { clearPatrol } from '@/ecs/systems/patrol';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';
import { calculateFormationPositions } from './formation';
import { issuePatrolCommand } from './patrol-command';

/**
 * Issue a context command (right-click or ground click) to selected units.
 * When shiftDown is true and target is null (ground click), issues a patrol command.
 * Returns `true` when at least one movable unit was dispatched.
 */
export function issueContextCommand(
  world: GameWorld,
  target: number | null,
  worldX: number,
  worldY: number,
  shiftDown = false,
): boolean {
  if (world.placingBuilding) {
    world.placingBuilding = null;
    return false;
  }

  // Rally point for single selected building
  if (
    world.selection.length === 1 &&
    hasComponent(world.ecs, world.selection[0], IsBuilding) &&
    FactionTag.faction[world.selection[0]] === Faction.Player
  ) {
    audio.click();
    Building.rallyX[world.selection[0]] = worldX;
    Building.rallyY[world.selection[0]] = worldY;
    Building.hasRally[world.selection[0]] = 1;
    return false;
  }

  if (world.selection.length === 0) return false;

  audio.click();

  // Shift+right-click on ground: patrol command
  if (shiftDown && target == null) {
    return issuePatrolCommand(world, worldX, worldY);
  }

  // Ground pings
  if (target == null) {
    world.groundPings.push({
      x: worldX,
      y: worldY,
      life: 20,
      maxLife: 20,
      color: 'rgba(34, 197, 94, 0.8)',
    });
  } else if (
    hasComponent(world.ecs, target, FactionTag) &&
    FactionTag.faction[target] === Faction.Enemy
  ) {
    world.groundPings.push({
      x: Position.x[target],
      y: Position.y[target],
      life: 20,
      maxLife: 20,
      color: 'rgba(239, 68, 68, 0.8)',
    });
  } else if (hasComponent(world.ecs, target, IsResource)) {
    world.groundPings.push({
      x: Position.x[target],
      y: Position.y[target],
      life: 20,
      maxLife: 20,
      color: 'rgba(250, 204, 21, 0.8)',
    });
  }

  // Count movable player units for formation
  const movableUnits = world.selection.filter(
    (eid) =>
      hasComponent(world.ecs, eid, FactionTag) &&
      FactionTag.faction[eid] === Faction.Player &&
      !hasComponent(world.ecs, eid, IsBuilding),
  );

  let barkShown = false;
  let voicePlayed = false;

  for (let idx = 0; idx < world.selection.length; idx++) {
    const eid = world.selection[idx];
    if (!hasComponent(world.ecs, eid, FactionTag)) continue;
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;

    const kind = EntityTypeTag.kind[eid] as EntityKind;

    // Clear stale state before applying any new order
    UnitStateMachine.hasAttackMoveTarget[eid] = 0;
    UnitStateMachine.attackMoveTargetX[eid] = 0;
    UnitStateMachine.attackMoveTargetY[eid] = 0;
    UnitStateMachine.targetEntity[eid] = -1;
    UnitStateMachine.returnEntity[eid] = -1;
    // Regular move/attack clears any existing patrol
    clearPatrol(world, eid);

    if (target != null) {
      barkShown = dispatchTargetCommand(world, eid, target, kind, worldX, worldY, barkShown);
      // Play command voice for the leader (first unit) only
      if (!voicePlayed) {
        const voiceTrigger = getCommandVoiceTrigger(world, target);
        if (voiceTrigger) audio.playCommandVoice(kind, voiceTrigger);
        voicePlayed = true;
      }
    } else {
      UnitStateMachine.state[eid] = UnitState.Move;
      UnitStateMachine.targetEntity[eid] = -1;
      if (!barkShown) {
        barkShown = showBark(world, eid, Position.x[eid], Position.y[eid], kind, 'move');
      }
      if (!voicePlayed) {
        audio.playCommandVoice(kind, 'move');
        voicePlayed = true;
      }
    }
  }

  // Formation positioning for ground-move commands
  if (target == null && movableUnits.length > 0) {
    const positions = calculateFormationPositions(movableUnits, worldX, worldY);
    for (const pos of positions) {
      UnitStateMachine.targetX[pos.eid] = pos.x;
      UnitStateMachine.targetY[pos.eid] = pos.y;
    }

    if (movableUnits.length > 1) {
      for (const eid of movableUnits) {
        const speed = Velocity.speed[eid];
        if (!world.yukaManager.has(eid)) {
          world.yukaManager.addUnit(
            eid,
            Position.x[eid],
            Position.y[eid],
            speed,
            UnitStateMachine.targetX[eid],
            UnitStateMachine.targetY[eid],
          );
        }
      }
      world.yukaManager.setFormation(movableUnits, worldX, worldY);
    }
  }

  return movableUnits.length > 0;
}

/** Dispatch a command when a specific target entity is clicked. */
function dispatchTargetCommand(
  world: GameWorld,
  eid: number,
  target: number,
  kind: EntityKind,
  worldX: number,
  worldY: number,
  barkShown: boolean,
): boolean {
  const tFaction = FactionTag.faction[target] as Faction;
  const isTargetBuilding = hasComponent(world.ecs, target, IsBuilding);
  const isTargetResource = hasComponent(world.ecs, target, IsResource);

  if (tFaction === Faction.Enemy) {
    UnitStateMachine.targetEntity[eid] = target;
    UnitStateMachine.targetX[eid] = Position.x[target];
    UnitStateMachine.targetY[eid] = Position.y[target];
    UnitStateMachine.state[eid] = UnitState.AttackMove;
    if (!barkShown) {
      barkShown = showBark(world, eid, Position.x[eid], Position.y[eid], kind, 'attack');
    }
  } else if (isTargetResource && kind === EntityKind.Gatherer) {
    UnitStateMachine.targetEntity[eid] = target;
    UnitStateMachine.targetX[eid] = Position.x[target];
    UnitStateMachine.targetY[eid] = Position.y[target];
    UnitStateMachine.state[eid] = UnitState.GatherMove;
    if (!barkShown) {
      barkShown = showBark(world, eid, Position.x[eid], Position.y[eid], kind, 'gather');
    }
  } else if (
    isTargetBuilding &&
    tFaction === Faction.Player &&
    Building.progress[target] < 100 &&
    kind === EntityKind.Gatherer
  ) {
    UnitStateMachine.targetEntity[eid] = target;
    UnitStateMachine.targetX[eid] = Position.x[target];
    UnitStateMachine.targetY[eid] = Position.y[target];
    UnitStateMachine.state[eid] = UnitState.BuildMove;
    if (!barkShown) {
      barkShown = showBark(world, eid, Position.x[eid], Position.y[eid], kind, 'build');
    }
  } else if (
    EntityTypeTag.kind[target] === EntityKind.Lodge &&
    kind === EntityKind.Gatherer &&
    Carrying.resourceType[eid] !== ResourceType.None
  ) {
    UnitStateMachine.returnEntity[eid] = target;
    UnitStateMachine.targetX[eid] = Position.x[target];
    UnitStateMachine.targetY[eid] = Position.y[target];
    UnitStateMachine.state[eid] = UnitState.ReturnMove;
  } else if (
    tFaction === Faction.Player &&
    !isTargetBuilding &&
    !isTargetResource &&
    kind === EntityKind.Healer &&
    Health.current[target] > 0 &&
    Health.current[target] < Health.max[target]
  ) {
    // Medic heal command: move to wounded ally so healer aura kicks in
    UnitStateMachine.targetEntity[eid] = target;
    UnitStateMachine.targetX[eid] = Position.x[target];
    UnitStateMachine.targetY[eid] = Position.y[target];
    UnitStateMachine.state[eid] = UnitState.Move;
    if (!barkShown) {
      barkShown = showBark(world, eid, Position.x[eid], Position.y[eid], kind, 'heal');
    }
  } else if (
    isTargetBuilding &&
    tFaction === Faction.Player &&
    Building.progress[target] >= 100 &&
    Health.current[target] < Health.max[target] &&
    kind === EntityKind.Gatherer
  ) {
    UnitStateMachine.targetEntity[eid] = target;
    UnitStateMachine.targetX[eid] = Position.x[target];
    UnitStateMachine.targetY[eid] = Position.y[target];
    UnitStateMachine.state[eid] = UnitState.RepairMove;
  } else {
    UnitStateMachine.targetX[eid] = worldX + (world.gameRng.next() - 0.5) * 20;
    UnitStateMachine.targetY[eid] = worldY + (world.gameRng.next() - 0.5) * 20;
    UnitStateMachine.state[eid] = UnitState.Move;
  }

  return barkShown;
}

/** Determine the voice trigger type based on the target entity. */
function getCommandVoiceTrigger(
  world: GameWorld,
  target: number,
): 'move' | 'attack' | 'gather' | null {
  if (hasComponent(world.ecs, target, FactionTag) && FactionTag.faction[target] === Faction.Enemy) {
    return 'attack';
  }
  if (hasComponent(world.ecs, target, IsResource)) {
    return 'gather';
  }
  return 'move';
}
