/**
 * Gathering System
 *
 * Ported from Entity.update() gathering state (lines 1661-1683) and idle auto-gather
 * (lines 1627-1639) of the original HTML game.
 *
 * Responsibilities:
 * - Gathering state: timer countdown, resource depletion, carry resource, find lodge and return
 * - SFX calls (chop for cattails, mine for clambeds) every 30 frames while gathering
 * - Particle spawning at resource location
 * - Find nearby resource of same type if current resource is depleted
 * - Idle auto-gather: player gatherers near resources auto-start gathering every 90 frames
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { AUTO_GATHER_RADIUS, GATHER_AMOUNT, PALETTE } from '@/constants';
import {
  Building,
  Carrying,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Resource,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

export function gatheringSystem(world: GameWorld): void {
  const gatherers = query(world.ecs, [
    Position,
    UnitStateMachine,
    Health,
    FactionTag,
    EntityTypeTag,
    Carrying,
  ]);
  const resources = query(world.ecs, [Position, Resource, IsResource]);
  const buildings = query(world.ecs, [
    Position,
    IsBuilding,
    FactionTag,
    EntityTypeTag,
    Health,
    Building,
  ]);

  for (let i = 0; i < gatherers.length; i++) {
    const eid = gatherers[i];
    if (Health.current[eid] <= 0) continue;

    const state = UnitStateMachine.state[eid] as UnitState;
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    const faction = FactionTag.faction[eid] as Faction;

    // --- Idle auto-gather ---
    // Player gatherers only auto-gather when autoBehaviors.gather is enabled
    // Enemy gatherers always auto-gather (AI economy)
    const canAutoGather = faction === Faction.Enemy || world.autoBehaviors.gather;
    if (
      state === UnitState.Idle &&
      kind === EntityKind.Gatherer &&
      canAutoGather &&
      world.frameCount % 90 === 0
    ) {
      // Only auto-gather if not holding resources
      if (Carrying.resourceType[eid] === ResourceType.None) {
        const ex = Position.x[eid];
        const ey = Position.y[eid];
        let closest = -1;
        let minDist = AUTO_GATHER_RADIUS;
        for (let j = 0; j < resources.length; j++) {
          const r = resources[j];
          if (Resource.amount[r] <= 0) continue;
          const dx = Position.x[r] - ex;
          const dy = Position.y[r] - ey;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < minDist) {
            minDist = d;
            closest = r;
          }
        }

        if (closest !== -1) {
          // cmdGather(closest)
          UnitStateMachine.targetEntity[eid] = closest;
          UnitStateMachine.targetX[eid] = Position.x[closest];
          UnitStateMachine.targetY[eid] = Position.y[closest];
          UnitStateMachine.state[eid] = UnitState.GatherMove;
        }
      }
      continue;
    }

    // --- Gathering state (lines 1661-1683) ---
    if (state !== UnitState.Gathering) continue;

    const tEnt = UnitStateMachine.targetEntity[eid];
    if (tEnt === -1 || !hasComponent(world.ecs, tEnt, Resource) || Resource.amount[tEnt] <= 0) {
      // Try to find another nearby resource of same type (lines 1664-1672)
      if (tEnt !== -1 && hasComponent(world.ecs, tEnt, EntityTypeTag)) {
        const resKind = EntityTypeTag.kind[tEnt] as EntityKind;
        const ex = Position.x[eid];
        const ey = Position.y[eid];
        let closest = -1;
        let minDist = 300;

        for (let j = 0; j < resources.length; j++) {
          const r = resources[j];
          if (EntityTypeTag.kind[r] !== resKind) continue;
          if (Resource.amount[r] <= 0) continue;
          const dx = Position.x[r] - ex;
          const dy = Position.y[r] - ey;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < minDist) {
            minDist = d;
            closest = r;
          }
        }

        if (closest !== -1) {
          // cmdGather(closest)
          UnitStateMachine.targetEntity[eid] = closest;
          UnitStateMachine.targetX[eid] = Position.x[closest];
          UnitStateMachine.targetY[eid] = Position.y[closest];
          UnitStateMachine.state[eid] = UnitState.GatherMove;
          continue;
        }
      }
      UnitStateMachine.state[eid] = UnitState.Idle;
      continue;
    }

    // SFX and particles every 30 frames
    if (world.frameCount % 30 === 0) {
      const resKind = EntityTypeTag.kind[tEnt] as EntityKind;
      if (resKind === EntityKind.Cattail) {
        audio.chop();
        // part(PALETTE.reedBrown) - spawns particle at target entity
        world.particles.push({
          x: Position.x[tEnt] + (Math.random() - 0.5) * 20,
          y: Position.y[tEnt] - 10,
          vx: 0,
          vy: 1,
          life: 10,
          color: PALETTE.reedBrown,
          size: 2,
        });
      } else {
        audio.mine();
        world.particles.push({
          x: Position.x[tEnt] + (Math.random() - 0.5) * 20,
          y: Position.y[tEnt] - 10,
          vx: 0,
          vy: 1,
          life: 10,
          color: PALETTE.clamMeat,
          size: 2,
        });
      }
    }

    // Timer countdown
    UnitStateMachine.gatherTimer[eid]--;
    if (UnitStateMachine.gatherTimer[eid] <= 0) {
      const resKind = EntityTypeTag.kind[tEnt] as EntityKind;

      // Set carried resource type
      Carrying.resourceType[eid] =
        resKind === EntityKind.Cattail ? ResourceType.Twigs : ResourceType.Clams;

      // Deplete resource (Tidal Harvest: +50%)
      const gatherAmt = faction === Faction.Player && world.tech.tidalHarvest ? 15 : GATHER_AMOUNT;
      Carrying.resourceAmount[eid] = gatherAmt;
      Resource.amount[tEnt] -= gatherAmt;
      // Track stats
      world.stats.resourcesGathered += gatherAmt;

      if (Resource.amount[tEnt] <= 0) {
        // Resource is depleted - will be handled by health/cleanup system.
        // Set HP to 0 to trigger death.
        Health.current[tEnt] = 0;
      }

      // Find return building: Lodge for player, nearest PredatorNest for enemy
      let returnBuilding = -1;
      if (faction === Faction.Enemy) {
        // Enemy gatherers return to nearest PredatorNest
        let minDist = Infinity;
        const ex = Position.x[eid];
        const ey = Position.y[eid];
        for (let j = 0; j < buildings.length; j++) {
          const b = buildings[j];
          if (EntityTypeTag.kind[b] === EntityKind.PredatorNest && Health.current[b] > 0) {
            const bdx = Position.x[b] - ex;
            const bdy = Position.y[b] - ey;
            const bDistSq = bdx * bdx + bdy * bdy;
            if (bDistSq < minDist) {
              minDist = bDistSq;
              returnBuilding = b;
            }
          }
        }
      } else {
        // Player gatherers return to nearest completed Lodge
        let minDist = Infinity;
        const ex = Position.x[eid];
        const ey = Position.y[eid];
        for (let j = 0; j < buildings.length; j++) {
          const b = buildings[j];
          if (
            EntityTypeTag.kind[b] === EntityKind.Lodge &&
            FactionTag.faction[b] === Faction.Player &&
            Health.current[b] > 0 &&
            Building.progress[b] >= 100
          ) {
            const bdx = Position.x[b] - ex;
            const bdy = Position.y[b] - ey;
            const bDistSq = bdx * bdx + bdy * bdy;
            if (bDistSq < minDist) {
              minDist = bDistSq;
              returnBuilding = b;
            }
          }
        }
      }

      if (returnBuilding !== -1) {
        UnitStateMachine.returnEntity[eid] = returnBuilding;
        UnitStateMachine.targetX[eid] = Position.x[returnBuilding];
        UnitStateMachine.targetY[eid] = Position.y[returnBuilding];
        UnitStateMachine.state[eid] = UnitState.ReturnMove;
      } else {
        UnitStateMachine.state[eid] = UnitState.Idle;
      }
    }
  }
}
