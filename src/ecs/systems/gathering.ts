/**
 * Gathering System
 *
 * Ported from Entity.update() gathering state (lines 1661-1683) and idle auto-gather
 * (lines 1627-1639) of the original HTML game.
 *
 * v3: uses nodeKindToResourceType() for consistent resource mapping.
 * Clambed -> Fish, PearlBed -> Rocks, Cattail -> Logs.
 *
 * Responsibilities:
 * - Gathering state: timer countdown, resource depletion, carry resource, find lodge and return
 * - SFX calls (chop for cattails, mine for clambeds) every 30 frames while gathering
 * - Particle spawning at resource location
 * - Find nearby resource of same type if current resource is depleted
 * - Idle auto-gather: player Mudpaws/generalists near resources auto-start gathering every 30 frames
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
  TaskOverride,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { isMudpawKind } from '@/game/live-unit-kinds';
import { EntityKind, Faction, nodeKindToResourceType, ResourceType, UnitState } from '@/types';
import { checkResourceDepletion } from './gathering/depletion-warning';
import { resumeGatherOverride, retargetGatherOverride } from './gathering/gather-override';
import { applyPassiveIncome } from './gathering/passive-income';

export function gatheringSystem(world: GameWorld): void {
  const gatheringUnits = query(world.ecs, [
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
  const playerGatherRadius = Math.max(1, world.playerGatherRadiusMultiplier);

  for (let i = 0; i < gatheringUnits.length; i++) {
    const eid = gatheringUnits[i];
    if (Health.current[eid] <= 0) continue;

    const state = UnitStateMachine.state[eid] as UnitState;
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    const faction = FactionTag.faction[eid] as Faction;

    if (isMudpawKind(kind) && state === UnitState.Idle && resumeGatherOverride(world, eid)) {
      continue;
    }

    const canAutoGather = faction === Faction.Enemy || world.autoBehaviors.generalist;
    if (
      state === UnitState.Idle &&
      isMudpawKind(kind) &&
      canAutoGather &&
      (world.frameCount + eid * 7) % 30 === 0
    ) {
      // Only auto-gather if not holding resources
      if (Carrying.resourceType[eid] === ResourceType.None) {
        const ex = Position.x[eid];
        const ey = Position.y[eid];
        let closest = -1;

        // Root Network: player Mudpaws/generalists auto-path to the richest resource node
        if (faction === Faction.Player && world.tech.rootNetwork) {
          let bestAmount = 0;
          for (let j = 0; j < resources.length; j++) {
            const r = resources[j];
            if (Resource.amount[r] <= 0) continue;
            if (Resource.amount[r] > bestAmount) {
              bestAmount = Resource.amount[r];
              closest = r;
            }
          }
        } else {
          let minDist = AUTO_GATHER_RADIUS * (faction === Faction.Player ? playerGatherRadius : 1);
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
        let minDist = 300 * (faction === Faction.Player ? playerGatherRadius : 1);

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
          if (TaskOverride.active[eid] === 1 && TaskOverride.task[eid] === UnitState.GatherMove) {
            TaskOverride.targetEntity[eid] = closest;
          }
          UnitStateMachine.targetEntity[eid] = closest;
          UnitStateMachine.targetX[eid] = Position.x[closest];
          UnitStateMachine.targetY[eid] = Position.y[closest];
          UnitStateMachine.state[eid] = UnitState.GatherMove;
          continue;
        }
      }

      if (retargetGatherOverride(world, eid)) continue;
      UnitStateMachine.state[eid] = UnitState.Idle;
      continue;
    }

    // SFX and particles every 30 frames (staggered per-entity for layered rhythm)
    if ((world.frameCount + eid * 7) % 30 === 0) {
      const resKind = EntityTypeTag.kind[tEnt] as EntityKind;
      if (resKind === EntityKind.Cattail) {
        audio.chop();
        // part(PALETTE.reedBrown) - spawns particle at target entity
        world.particles.push({
          x: Position.x[tEnt] + (world.gameRng.next() - 0.5) * 20,
          y: Position.y[tEnt] - 10,
          vx: 0,
          vy: 1,
          life: 10,
          color: PALETTE.reedBrown,
          size: 2,
        });
      } else if (resKind === EntityKind.PearlBed) {
        audio.mine();
        world.particles.push({
          x: Position.x[tEnt] + (world.gameRng.next() - 0.5) * 20,
          y: Position.y[tEnt] - 10,
          vx: (world.gameRng.next() - 0.5) * 1,
          vy: -world.gameRng.next() * 1.5,
          life: 15,
          color: '#a5b4fc', // Pearl blue shimmer
          size: 2,
        });
      } else {
        audio.mine();
        world.particles.push({
          x: Position.x[tEnt] + (world.gameRng.next() - 0.5) * 20,
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

      // v3: use nodeKindToResourceType for consistent mapping
      Carrying.resourceType[eid] = nodeKindToResourceType(resKind);

      // Deplete resource (Tidal Harvest: +25% gathering)
      let gatherAmt = GATHER_AMOUNT;
      // Preserve some real throughput gain on long travel-heavy maps where
      // pure timer reductions are too small to change completed trip counts.
      if (faction === Faction.Player && world.gatherSpeedMod > 1.0) {
        gatherAmt = Math.round(gatherAmt * (1 + (world.gatherSpeedMod - 1) * 0.5));
      }
      if (faction === Faction.Player && world.playerCarryCapacityMultiplier > 1.0) {
        gatherAmt = Math.round(gatherAmt * world.playerCarryCapacityMultiplier);
      }
      if (faction === Faction.Player && world.tech.tidalHarvest) {
        gatherAmt = Math.round(gatherAmt * 1.25);
      }
      // Commander bonuses: global gather passive plus Sage-style aura gather rate.
      if (faction === Faction.Player && world.commanderModifiers.passiveGatherBonus > 0) {
        gatherAmt = Math.round(gatherAmt * (1 + world.commanderModifiers.passiveGatherBonus));
      }
      if (faction === Faction.Player && world.commanderGatherBuff.has(eid)) {
        gatherAmt = Math.round(gatherAmt * (1 + world.commanderModifiers.auraGatherBonus));
      }
      // Permadeath rewards modifier: +50% gathered resources for player
      if (faction === Faction.Player && world.rewardsModifier > 1.0) {
        gatherAmt = Math.round(gatherAmt * world.rewardsModifier);
      }
      Carrying.resourceAmount[eid] = gatherAmt;
      Resource.amount[tEnt] -= gatherAmt;
      audio.pickup(Position.x[eid]);
      // Track stats
      world.stats.resourcesGathered += gatherAmt;

      // Depletion warning: "Running low!" at 20%, "Depleted!" at 0%
      checkResourceDepletion(world, tEnt, resKind);

      if (Resource.amount[tEnt] <= 0) {
        // Resource is depleted - will be handled by health/cleanup system.
        // Set HP to 0 to trigger death.
        Health.current[tEnt] = 0;
      }

      // Find return building: Lodge for player, nearest PredatorNest for enemy
      let returnBuilding = -1;
      if (faction === Faction.Enemy) {
        // Enemy harvesters return to the nearest Predator Nest
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
        // Player Mudpaws return to the nearest completed Lodge
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

  applyPassiveIncome(world);
}
