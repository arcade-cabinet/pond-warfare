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
import {
  Carrying,
  Collider,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  Sprite,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';
import { arrive, MOVE_STATES } from './movement/arrive';

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

    // Commander aura: speed bonus for buffed player units
    if (world.commanderSpeedBuff.has(eid)) {
      speed += world.commanderModifiers.auraSpeedBonus;
    }

    // Rally Cry: +30% speed to all player units while active
    if (
      FactionTag.faction[eid] === Faction.Player &&
      world.rallyCryExpiry > 0 &&
      world.frameCount < world.rallyCryExpiry
    ) {
      speed *= 1.3;
    }

    // Fortified Walls: enemies near player walls are slowed by 30%
    if (world.tech.fortifiedWalls && FactionTag.faction[eid] === Faction.Enemy) {
      const ex = Position.x[eid];
      const ey = Position.y[eid];
      const wallSlowRange = 80;
      const wallCandidates = world.spatialHash
        ? world.spatialHash.query(ex, ey, wallSlowRange)
        : [];
      for (let w = 0; w < wallCandidates.length; w++) {
        const wid = wallCandidates[w];
        if (
          (EntityTypeTag.kind[wid] as EntityKind) === EntityKind.Wall &&
          FactionTag.faction[wid] === Faction.Player &&
          Health.current[wid] > 0
        ) {
          const wdx = Position.x[wid] - ex;
          const wdy = Position.y[wid] - ey;
          if (Math.sqrt(wdx * wdx + wdy * wdy) <= wallSlowRange) {
            speed *= 0.7;
            break;
          }
        }
      }
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
      // a_move: arrive when the center-to-center distance is within the unit's
      // attack range, matching how the combat system checks engagement distance.
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
