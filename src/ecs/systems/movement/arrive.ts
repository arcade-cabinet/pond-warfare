/**
 * Movement Arrival Logic
 *
 * Provides the set of movement states and the arrive() handler that
 * transitions a unit to its next state when it reaches its target.
 *
 * Direct port of Entity.arrive() (lines 1774-1793) from the original HTML game.
 */

import { hasComponent } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { BUILD_TIMER, GATHER_AMOUNT, GATHER_TIMER, REPAIR_TIMER } from '@/constants';
import {
  Carrying,
  FactionTag,
  Patrol,
  Position,
  Resource,
  Sprite,
  UnitStateMachine,
} from '@/ecs/components';
import { getWeatherGatherMult } from '@/ecs/systems/weather';
import type { GameWorld } from '@/ecs/world';
import { Faction, ResourceType, UnitState } from '@/types';
import { spawnParticle } from '@/utils/particles';

/**
 * Set of states that involve movement toward a target position.
 * Matches original: ['move', 'g_move', 'r_move', 'a_move', 'b_move', 'atk_move', 'rep_move']
 * Plus Retreat state (auto-retreat to building).
 */
export const MOVE_STATES = new Set<number>([
  UnitState.Move,
  UnitState.GatherMove,
  UnitState.ReturnMove,
  UnitState.AttackMove,
  UnitState.BuildMove,
  UnitState.AttackMovePatrol,
  UnitState.RepairMove,
  UnitState.Retreat,
  UnitState.PatrolMove,
]);

/** Handles state transitions when a unit reaches its target position. */
export function arrive(world: GameWorld, eid: number, state: UnitState): void {
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
      UnitStateMachine.gatherTimer[eid] = Math.round(
        GATHER_TIMER * world.gatherSpeedMod * (1 / getWeatherGatherMult(world)),
      );
      break;
    case UnitState.BuildMove:
      UnitStateMachine.state[eid] = UnitState.Building;
      UnitStateMachine.gatherTimer[eid] = BUILD_TIMER;
      break;
    case UnitState.RepairMove:
      UnitStateMachine.state[eid] = UnitState.Repairing;
      UnitStateMachine.gatherTimer[eid] = REPAIR_TIMER;
      break;
    case UnitState.Retreat:
      // Arrived at building safely; go idle
      UnitStateMachine.state[eid] = UnitState.Idle;
      UnitStateMachine.targetEntity[eid] = -1;
      break;

    // Original lines 1781-1790: return move - deposit resources, then resume gathering or idle
    case UnitState.ReturnMove: {
      const heldRes = Carrying.resourceType[eid] as ResourceType;
      const faction = FactionTag.faction[eid] as Faction;
      if (heldRes !== ResourceType.None) {
        // Use actual carried amount (may differ from GATHER_AMOUNT due to Tidal Harvest)
        const depositAmt = Carrying.resourceAmount[eid] || GATHER_AMOUNT;

        // Floating text for returned resources
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

        // Floating "+N" at the return building (lodge/nest) -- visible economic drip
        const returnBld = UnitStateMachine.returnEntity[eid];
        if (returnBld !== -1) {
          const bx = Position.x[returnBld];
          const by = Position.y[returnBld];

          // Small deposit text at the Lodge (shorter than combat floaters)
          if (faction === Faction.Player) {
            world.floatingTexts.push({
              x: bx + (world.gameRng.next() - 0.5) * 16,
              y: by - 30,
              text: `+${depositAmt}`,
              color,
              life: 45,
            });
          }

          // Particle burst to celebrate deposit
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
            world.stats.totalClamsEarned += depositAmt;
          } else if (heldRes === ResourceType.Pearls) {
            world.resources.pearls += depositAmt;
            world.stats.pearlsEarned += depositAmt;
          } else {
            world.resources.twigs += depositAmt;
          }
        }
        Carrying.resourceType[eid] = ResourceType.None;
        Carrying.resourceAmount[eid] = 0;
        audio.deposit(Position.x[eid]);

        // Co-op: notify partner of resource change
        if (faction === Faction.Player && world.coopMode && world.coopResourceCallback) {
          world.coopResourceCallback();
        }

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

    case UnitState.PatrolMove:
      advancePatrolWaypoint(world, eid);
      break;

    default:
      break;
  }
}

/** Advance a patrolling unit to the next waypoint, looping back to start. */
function advancePatrolWaypoint(world: GameWorld, eid: number): void {
  if (Patrol.active[eid] !== 1) {
    UnitStateMachine.state[eid] = UnitState.Idle;
    return;
  }

  const waypoints = world.patrolWaypoints.get(eid);
  if (!waypoints || waypoints.length === 0) {
    Patrol.active[eid] = 0;
    UnitStateMachine.state[eid] = UnitState.Idle;
    return;
  }

  const next = (Patrol.currentWaypoint[eid] + 1) % waypoints.length;
  Patrol.currentWaypoint[eid] = next;

  const wp = waypoints[next];
  UnitStateMachine.targetX[eid] = wp.x;
  UnitStateMachine.targetY[eid] = wp.y;
  UnitStateMachine.state[eid] = UnitState.PatrolMove;
}
