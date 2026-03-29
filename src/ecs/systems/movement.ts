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
import { spawnParticle } from '@/utils/particles';

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
    let speed = Velocity.speed[eid];

    // Apply speed debuff from Trapper traps (50% slow)
    if (Velocity.speedDebuffTimer[eid] > 0) {
      speed *= 0.5;
      Velocity.speedDebuffTimer[eid]--;
    }

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
      // Clear formation flocking before removing from Yuka
      world.yukaManager.clearFormationBehaviors(eid);
      // Remove from Yuka on arrival (all factions)
      world.yukaManager.removeUnit(eid);
      arrive(world, eid, state);
    } else {
      if (world.yukaManager.has(eid)) {
        // Yuka steering for any registered unit (positions synced in yukaManager.update)
        // Update Yuka target in case ECS target changed
        const isChasing = state === UnitState.AttackMove || state === UnitState.AttackMovePatrol;

        // Use PursuitBehavior for intercept prediction when chasing a Yuka-registered target
        const targetEnt = UnitStateMachine.targetEntity[eid];
        if (isChasing && targetEnt !== -1 && world.yukaManager.has(targetEnt)) {
          world.yukaManager.setPursuit(eid, targetEnt);
        } else {
          world.yukaManager.setTarget(eid, tx, ty, isChasing);
        }

        // Update facing based on Yuka velocity
        const vel = world.yukaManager.getVelocity(eid);
        if (vel && vel[0] !== 0) {
          Sprite.facingLeft[eid] = vel[0] < 0 ? 1 : 0;
        }
      } else {
        // Not yet registered with Yuka - register now
        world.yukaManager.addUnit(eid, Position.x[eid], Position.y[eid], speed, tx, ty);
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
    case UnitState.Move:
      UnitStateMachine.state[eid] = UnitState.Idle;
      break;
    case UnitState.AttackMovePatrol:
      UnitStateMachine.state[eid] = UnitState.Idle;
      UnitStateMachine.hasAttackMoveTarget[eid] = 0;
      break;
    case UnitState.GatherMove:
      UnitStateMachine.state[eid] = UnitState.Gathering;
      UnitStateMachine.gatherTimer[eid] = Math.round(GATHER_TIMER * world.gatherSpeedMod);
      break;
    case UnitState.BuildMove:
      UnitStateMachine.state[eid] = UnitState.Building;
      UnitStateMachine.gatherTimer[eid] = BUILD_TIMER;
      break;
    case UnitState.RepairMove:
      UnitStateMachine.state[eid] = UnitState.Repairing;
      UnitStateMachine.gatherTimer[eid] = REPAIR_TIMER;
      break;

    // Original lines 1781-1790: return move - deposit resources, then resume gathering or idle
    case UnitState.ReturnMove: {
      const heldRes = Carrying.resourceType[eid] as ResourceType;
      const faction = FactionTag.faction[eid] as Faction;
      if (heldRes !== ResourceType.None) {
        // Use actual carried amount (may differ from GATHER_AMOUNT due to Tidal Harvest)
        const depositAmt = Carrying.resourceAmount[eid] || GATHER_AMOUNT;

        // Floating text for returned resources (slightly bigger life for visibility)
        const resName =
          heldRes === ResourceType.Clams
            ? 'Clams'
            : heldRes === ResourceType.Pearls
              ? 'Pearls'
              : 'Twigs';
        const color =
          heldRes === ResourceType.Clams
            ? '#fde047'
            : heldRes === ResourceType.Pearls
              ? '#a5b4fc'
              : '#f97316';
        world.floatingTexts.push({
          x: Position.x[eid],
          y: Position.y[eid] - 24,
          text: `+${depositAmt} ${resName}`,
          color,
          life: 75,
        });

        // Particle burst at the return building (lodge/nest) to celebrate deposit
        const returnBld = UnitStateMachine.returnEntity[eid];
        if (returnBld !== -1) {
          const bx = Position.x[returnBld];
          const by = Position.y[returnBld];
          const pColor =
            heldRes === ResourceType.Clams
              ? '#fde047'
              : heldRes === ResourceType.Pearls
                ? '#a5b4fc'
                : '#92400e';
          for (let p = 0; p < 6; p++) {
            const angle = (p / 6) * Math.PI * 2;
            spawnParticle(
              world,
              bx + Math.cos(angle) * 8,
              by - 10,
              Math.cos(angle) * 1.5,
              Math.sin(angle) * 1.5 - 0.5,
              18,
              pColor,
              2,
            );
          }
        }

        // Add resources to the correct faction's stockpile
        if (faction === Faction.Enemy) {
          if (heldRes === ResourceType.Clams) {
            world.enemyResources.clams += depositAmt;
          } else if (heldRes === ResourceType.Twigs) {
            world.enemyResources.twigs += depositAmt;
          }
          // Enemies don't gather pearls
        } else {
          if (heldRes === ResourceType.Clams) {
            world.resources.clams += depositAmt;
          } else if (heldRes === ResourceType.Pearls) {
            world.resources.pearls += depositAmt;
          } else {
            world.resources.twigs += depositAmt;
          }
        }
        Carrying.resourceType[eid] = ResourceType.None;
        Carrying.resourceAmount[eid] = 0;

        // If the gather target still has resources, go back to it
        const tEnt = UnitStateMachine.targetEntity[eid];
        if (
          tEnt !== -1 &&
          hasComponent(world.ecs, tEnt, Position) &&
          hasComponent(world.ecs, tEnt, Resource) &&
          Resource.amount[tEnt] > 0
        ) {
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
    case UnitState.AttackMove:
      UnitStateMachine.state[eid] = UnitState.Attacking;
      break;

    default:
      break;
  }
}
