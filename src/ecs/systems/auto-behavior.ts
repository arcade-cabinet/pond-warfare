/**
 * Auto-Behavior System
 *
 * When auto-behavior toggles are enabled (via the radial menu), idle player units
 * are automatically assigned tasks:
 * - Auto-Gather: idle gatherers seek the nearest resource with remaining amount.
 * - Auto-Defend: idle combat units patrol near the player Lodge.
 * - Auto-Attack: idle combat units seek the nearest enemy unit.
 * - Auto-Scout: idle fast units (Snake speed+) move to random unexplored map areas.
 *
 * Runs every 60 frames (~1 second at 60fps) to avoid per-frame overhead.
 */

import { query } from 'bitecs';
import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Resource,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

export function autoBehaviorSystem(world: GameWorld): void {
  // Only check every 60 frames (~1 second)
  if (world.frameCount % 60 !== 0) return;

  const { gather, defend, attack, scout } = world.autoBehaviors;
  if (!gather && !defend && !attack && !scout) return;

  const units = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, UnitStateMachine]);

  for (let i = 0; i < units.length; i++) {
    const eid = units[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (UnitStateMachine.state[eid] !== UnitState.Idle) continue;

    const kind = EntityTypeTag.kind[eid] as EntityKind;

    // Auto-Gather: idle gatherers go to nearest resource
    if (gather && kind === EntityKind.Gatherer) {
      const resources = query(world.ecs, [Position, Health, IsResource, Resource]);
      let bestRes = -1;
      let bestDist = Infinity;
      for (let j = 0; j < resources.length; j++) {
        const rid = resources[j];
        if (Resource.amount[rid] <= 0) continue;
        const dx = Position.x[rid] - Position.x[eid];
        const dy = Position.y[rid] - Position.y[eid];
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
          bestDist = d;
          bestRes = rid;
        }
      }
      if (bestRes !== -1) {
        UnitStateMachine.targetEntity[eid] = bestRes;
        UnitStateMachine.targetX[eid] = Position.x[bestRes];
        UnitStateMachine.targetY[eid] = Position.y[bestRes];
        UnitStateMachine.state[eid] = UnitState.GatherMove;
      }
      continue;
    }

    // Combat unit checks (skip gatherers and healers)
    if (kind === EntityKind.Gatherer || kind === EntityKind.Healer) continue;

    // Auto-Attack takes priority over defend (seek and destroy vs. patrol)
    if (attack) {
      const enemies = query(world.ecs, [Position, Health, FactionTag]);
      let bestEnemy = -1;
      let bestDist = Infinity;
      for (let j = 0; j < enemies.length; j++) {
        const eid2 = enemies[j];
        if (FactionTag.faction[eid2] !== Faction.Enemy) continue;
        if (Health.current[eid2] <= 0) continue;
        const dx = Position.x[eid2] - Position.x[eid];
        const dy = Position.y[eid2] - Position.y[eid];
        const d = dx * dx + dy * dy;
        if (d < bestDist) {
          bestDist = d;
          bestEnemy = eid2;
        }
      }
      if (bestEnemy !== -1) {
        UnitStateMachine.targetEntity[eid] = bestEnemy;
        UnitStateMachine.targetX[eid] = Position.x[bestEnemy];
        UnitStateMachine.targetY[eid] = Position.y[bestEnemy];
        UnitStateMachine.state[eid] = UnitState.AttackMove;
        continue;
      }
    }

    // Auto-Scout: fast idle combat units move to random unexplored map areas
    if (scout && Velocity.speed[eid] >= 2.0) {
      // Pick a random point on the map edges or quadrants to explore
      const margin = 200;
      const targetX = margin + Math.random() * (WORLD_WIDTH - margin * 2);
      const targetY = margin + Math.random() * (WORLD_HEIGHT - margin * 2);
      UnitStateMachine.targetX[eid] = targetX;
      UnitStateMachine.targetY[eid] = targetY;
      UnitStateMachine.state[eid] = UnitState.AttackMovePatrol;
      UnitStateMachine.hasAttackMoveTarget[eid] = 1;
      UnitStateMachine.attackMoveTargetX[eid] = targetX;
      UnitStateMachine.attackMoveTargetY[eid] = targetY;
      continue;
    }

    // Auto-Defend: idle combat units patrol near Lodge (only if auto-attack didn't find a target)
    if (defend) {
      const buildings = query(world.ecs, [Position, Health, IsBuilding, FactionTag, EntityTypeTag]);
      for (let j = 0; j < buildings.length; j++) {
        const bid = buildings[j];
        if (
          EntityTypeTag.kind[bid] === EntityKind.Lodge &&
          FactionTag.faction[bid] === Faction.Player &&
          Health.current[bid] > 0
        ) {
          // Position the unit near the lodge then use wander for organic patrol movement
          const lodgeX = Position.x[bid];
          const lodgeY = Position.y[bid];

          // If not yet registered with Yuka, register near the lodge
          if (!world.yukaManager.has(eid)) {
            const speed = 1.5; // default patrol speed
            world.yukaManager.addUnit(eid, Position.x[eid], Position.y[eid], speed, lodgeX, lodgeY);
          }

          // Set wander behavior for a natural patrol pattern
          world.yukaManager.setWander(eid);

          // Move to a random point near the lodge as the initial direction
          UnitStateMachine.targetX[eid] = lodgeX + (Math.random() - 0.5) * 200;
          UnitStateMachine.targetY[eid] = lodgeY + (Math.random() - 0.5) * 200;
          UnitStateMachine.state[eid] = UnitState.AttackMovePatrol;
          break;
        }
      }
    }
  }
}
