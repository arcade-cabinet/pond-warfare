/**
 * Movement System
 *
 * Handles all unit movement logic ported from Entity.update() lines 1641-1658
 * and Entity.arrive() lines 1774-1793 of the original HTML game.
 *
 * Responsibilities:
 * - Move units toward their target position based on current state
 * - Calculate arrival distance based on state (gather, build, attack, etc.)
 * - Trigger state transitions on arrival (arrive logic)
 * - Update yOffset bob animation while moving
 * - Update facingLeft based on movement direction
 */

import { hasComponent, query } from 'bitecs';
import { BUILD_TIMER, GATHER_AMOUNT, GATHER_TIMER, REPAIR_TIMER } from '@/constants';
import {
  Carrying,
  Collider,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  Resource,
  Sprite,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

/**
 * Set of states that involve movement toward a target position.
 * Matches original: ['move', 'g_move', 'r_move', 'a_move', 'b_move', 'atk_move', 'rep_move']
 */
const MOVE_STATES = new Set<number>([
  UnitState.Move,
  UnitState.GatherMove,
  UnitState.ReturnMove,
  UnitState.AttackMove,
  UnitState.BuildMove,
  UnitState.AttackMovePatrol,
  UnitState.RepairMove,
]);

export function movementSystem(world: GameWorld): void {
  const ents = query(world.ecs, [
    Position,
    Velocity,
    UnitStateMachine,
    Sprite,
    Collider,
    Health,
    Combat,
    EntityTypeTag,
    FactionTag,
    Carrying,
  ]);

  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i];

    // Skip dead entities
    if (hasComponent(world.ecs, eid, Health) && Health.current[eid] <= 0) continue;

    const state = UnitStateMachine.state[eid] as UnitState;

    // Only process entities in a movement state with a target position
    if (!MOVE_STATES.has(state)) continue;

    const tx = UnitStateMachine.targetX[eid];
    const ty = UnitStateMachine.targetY[eid];
    const speed = Velocity.speed[eid];

    const dx = tx - Position.x[eid];
    const dy = ty - Position.y[eid];
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Update facing direction (original: if (dx !== 0) this.facingLeft = dx < 0)
    if (dx !== 0) {
      Sprite.facingLeft[eid] = dx < 0 ? 1 : 0;
    }

    // Calculate target radius for states that move toward an entity
    // Original lines 1647-1650: g_move uses tEnt.radius, r_move uses rEnt.radius, b_move/rep_move use tEnt.radius
    let targetRad = 0;
    if (
      state === UnitState.GatherMove ||
      state === UnitState.BuildMove ||
      state === UnitState.RepairMove
    ) {
      const tEnt = UnitStateMachine.targetEntity[eid];
      if (tEnt !== -1 && hasComponent(world.ecs, tEnt, Collider)) {
        targetRad = Collider.radius[tEnt];
      }
    } else if (state === UnitState.ReturnMove) {
      const rEnt = UnitStateMachine.returnEntity[eid];
      if (rEnt !== -1 && hasComponent(world.ecs, rEnt, Collider)) {
        targetRad = Collider.radius[rEnt];
      }
    }

    // Calculate arrival distance based on state
    // Original lines 1652-1655
    let arriveDist = speed;
    if (
      state === UnitState.GatherMove ||
      state === UnitState.ReturnMove ||
      state === UnitState.BuildMove ||
      state === UnitState.RepairMove
    ) {
      arriveDist = Collider.radius[eid] + targetRad + 15;
    }
    if (state === UnitState.AttackMove) {
      // a_move: arrive when in attack range
      arriveDist = Combat.attackRange[eid];
    }
    if (state === UnitState.AttackMovePatrol) {
      // atk_move: arrive at speed distance (same as move)
      arriveDist = speed;
    }

    if (dist <= arriveDist) {
      // --- Arrive logic ---
      // Remove from Yuka on arrival
      if (FactionTag.faction[eid] === Faction.Enemy) {
        world.yukaManager.removeEnemy(eid);
      }
      arrive(world, eid, state);
    } else {
      const isEnemy = FactionTag.faction[eid] === Faction.Enemy;

      if (isEnemy && world.yukaManager.has(eid)) {
        // Enemy movement handled by Yuka steering (positions synced in yukaManager.update)
        // Update Yuka target in case ECS target changed
        const isChasing = state === UnitState.AttackMove || state === UnitState.AttackMovePatrol;
        world.yukaManager.setTarget(eid, tx, ty, isChasing);

        // Update facing based on Yuka velocity
        const vel = world.yukaManager.getVelocity(eid);
        if (vel && vel[0] !== 0) {
          Sprite.facingLeft[eid] = vel[0] < 0 ? 1 : 0;
        }
      } else {
        // Player units and unregistered entities: direct-line movement (original line 1658)
        Position.x[eid] += (dx / dist) * speed;
        Position.y[eid] += (dy / dist) * speed;
      }

      // Bob animation (original: this.yOff = Math.sin(GAME.frameCount*(this.type==='snake'?0.6:0.3))*3)
      const kind = EntityTypeTag.kind[eid] as EntityKind;
      const freq = kind === EntityKind.Snake ? 0.6 : 0.3;
      Sprite.yOffset[eid] = Math.sin(world.frameCount * freq) * 3;
    }
  }
}

/**
 * Handles state transitions when a unit reaches its target position.
 * Direct port of Entity.arrive() (lines 1774-1793) from the original game.
 */
function arrive(world: GameWorld, eid: number, state: UnitState): void {
  // Reset bob (original: this.yOff = 0)
  Sprite.yOffset[eid] = 0;

  switch (state) {
    // Original: if (this.state === 'move') { this.state = 'idle'; this.tPos = null; }
    case UnitState.Move:
      UnitStateMachine.state[eid] = UnitState.Idle;
      break;

    // Original: else if (this.state === 'atk_move') { this.state = 'idle'; this.tPos = null; this.attackMoveTarget = null; }
    case UnitState.AttackMovePatrol:
      UnitStateMachine.state[eid] = UnitState.Idle;
      UnitStateMachine.hasAttackMoveTarget[eid] = 0;
      break;

    // Original: else if (this.state === 'g_move') { this.state = 'gath'; this.gTimer = 60; }
    case UnitState.GatherMove:
      UnitStateMachine.state[eid] = UnitState.Gathering;
      UnitStateMachine.gatherTimer[eid] = GATHER_TIMER;
      break;

    // Original: else if (this.state === 'b_move') { this.state = 'build'; this.gTimer = 30; }
    case UnitState.BuildMove:
      UnitStateMachine.state[eid] = UnitState.Building;
      UnitStateMachine.gatherTimer[eid] = BUILD_TIMER;
      break;

    // Original: else if (this.state === 'rep_move') { this.state = 'repair'; this.gTimer = 40; }
    case UnitState.RepairMove:
      UnitStateMachine.state[eid] = UnitState.Repairing;
      UnitStateMachine.gatherTimer[eid] = REPAIR_TIMER;
      break;

    // Original lines 1781-1790: return move - deposit resources, then resume gathering or idle
    case UnitState.ReturnMove: {
      const heldRes = Carrying.resourceType[eid] as ResourceType;
      if (heldRes !== ResourceType.None) {
        // Floating text for returned resources
        const resName = heldRes === ResourceType.Clams ? 'Clams' : 'Twigs';
        const color = heldRes === ResourceType.Clams ? '#fde047' : '#f97316';
        world.floatingTexts.push({
          x: Position.x[eid],
          y: Position.y[eid] - 20,
          text: `+${GATHER_AMOUNT} ${resName}`,
          color,
          life: 60,
        });

        // Add resources (original: GAME.resources[this.heldRes] += 10)
        if (heldRes === ResourceType.Clams) {
          world.resources.clams += GATHER_AMOUNT;
        } else {
          world.resources.twigs += GATHER_AMOUNT;
        }
        Carrying.resourceType[eid] = ResourceType.None;

        // If the gather target still has resources, go back to it
        // Original: if (this.tEnt && this.tEnt.resAmount>0) { this.tPos={x:this.tEnt.x,y:this.tEnt.y}; this.state='g_move'; }
        const tEnt = UnitStateMachine.targetEntity[eid];
        if (tEnt !== -1 && hasComponent(world.ecs, tEnt, Resource) && Resource.amount[tEnt] > 0) {
          UnitStateMachine.targetX[eid] = Position.x[tEnt];
          UnitStateMachine.targetY[eid] = Position.y[tEnt];
          UnitStateMachine.state[eid] = UnitState.GatherMove;
        } else {
          UnitStateMachine.state[eid] = UnitState.Idle;
        }
      } else {
        UnitStateMachine.state[eid] = UnitState.Idle;
      }
      break;
    }

    // Original: else if (this.state === 'a_move') this.state = 'atk';
    case UnitState.AttackMove:
      UnitStateMachine.state[eid] = UnitState.Attacking;
      break;

    default:
      break;
  }
}
