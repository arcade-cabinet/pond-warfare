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

import { query, hasComponent } from 'bitecs';
import type { GameWorld } from '@/ecs/world';
import {
  Position,
  Health,
  UnitStateMachine,
  EntityTypeTag,
  FactionTag,
  Carrying,
  Resource,
  IsResource,
  IsBuilding,
  Building,
  Collider,
} from '@/ecs/components';
import { UnitState, EntityKind, Faction, ResourceType } from '@/types';
import { GATHER_AMOUNT, PALETTE, AUTO_GATHER_RADIUS } from '@/constants';
import { audio } from '@/audio/audio-system';


export function gatheringSystem(world: GameWorld): void {
  const gatherers = query(world.ecs, [Position, UnitStateMachine, Health, FactionTag, EntityTypeTag, Carrying]);
  const resources = query(world.ecs, [Position, Resource, IsResource]);
  const buildings = query(world.ecs, [Position, IsBuilding, FactionTag, EntityTypeTag, Health, Building]);

  for (let i = 0; i < gatherers.length; i++) {
    const eid = gatherers[i];
    if (Health.current[eid] <= 0) continue;

    const state = UnitStateMachine.state[eid] as UnitState;
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    const faction = FactionTag.faction[eid] as Faction;

    // --- Idle auto-gather (lines 1627-1639) ---
    // Original: if (this.state === 'idle' && this.type === 'gatherer' && this.faction === 'player' && GAME.frameCount % 90 === 0)
    if (
      state === UnitState.Idle &&
      kind === EntityKind.Gatherer &&
      faction === Faction.Player &&
      world.frameCount % 90 === 0
    ) {
      // Only auto-gather if not holding resources
      // Original: if (!this.heldRes)
      if (Carrying.resourceType[eid] === ResourceType.None) {
        const ex = Position.x[eid];
        const ey = Position.y[eid];
        let closest = 0;
        let minDist = AUTO_GATHER_RADIUS;

        // Original: let nearRes = GAME.entities.filter(e => e.isResource && e.resAmount > 0);
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

        if (closest) {
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
    // Original: if (this.state === 'gath')
    if (state !== UnitState.Gathering) continue;

    const tEnt = UnitStateMachine.targetEntity[eid];

    // Original: if (!this.tEnt || this.tEnt.resAmount <= 0)
    if (
      !tEnt ||
      !hasComponent(world.ecs, tEnt, Resource) ||
      Resource.amount[tEnt] <= 0
    ) {
      // Try to find another nearby resource of same type (lines 1664-1672)
      if (tEnt && hasComponent(world.ecs, tEnt, EntityTypeTag)) {
        const resKind = EntityTypeTag.kind[tEnt] as EntityKind;
        const ex = Position.x[eid];
        const ey = Position.y[eid];
        let closest = 0;
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

        if (closest) {
          // cmdGather(closest)
          UnitStateMachine.targetEntity[eid] = closest;
          UnitStateMachine.targetX[eid] = Position.x[closest];
          UnitStateMachine.targetY[eid] = Position.y[closest];
          UnitStateMachine.state[eid] = UnitState.GatherMove;
          continue;
        }
      }
      // Original: this.state = 'idle'; return;
      UnitStateMachine.state[eid] = UnitState.Idle;
      continue;
    }

    // SFX and particles every 30 frames
    // Original: if (GAME.frameCount % 30 === 0) { AudioSys.sfx[this.tEnt.type==='cattail'?'chop':'mine'](); this.part(...) }
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
    // Original: if (--this.gTimer <= 0)
    UnitStateMachine.gatherTimer[eid]--;
    if (UnitStateMachine.gatherTimer[eid] <= 0) {
      const resKind = EntityTypeTag.kind[tEnt] as EntityKind;

      // Set carried resource type
      // Original: this.heldRes = this.tEnt.type==='cattail'?'twigs':'clams';
      Carrying.resourceType[eid] =
        resKind === EntityKind.Cattail ? ResourceType.Twigs : ResourceType.Clams;

      // Deplete resource
      // Original: this.tEnt.resAmount -= 10; if(this.tEnt.resAmount<=0) this.tEnt.die();
      Resource.amount[tEnt] -= GATHER_AMOUNT;
      // Track stats
      world.stats.resourcesGathered += GATHER_AMOUNT;

      if (Resource.amount[tEnt] <= 0) {
        // Resource is depleted - will be handled by health/cleanup system.
        // Set HP to 0 to trigger death.
        Health.current[tEnt] = 0;
      }

      // Find lodge to return to
      // Original: let h = GAME.entities.find(e=>e.type==='lodge' && e.faction==='player');
      let lodge = 0;
      for (let j = 0; j < buildings.length; j++) {
        const b = buildings[j];
        if (
          EntityTypeTag.kind[b] === EntityKind.Lodge &&
          FactionTag.faction[b] === Faction.Player &&
          Health.current[b] > 0
        ) {
          lodge = b;
          break;
        }
      }

      if (lodge) {
        // Original: this.rEnt = h; this.tPos={x:h.x,y:h.y}; this.state='r_move';
        UnitStateMachine.returnEntity[eid] = lodge;
        UnitStateMachine.targetX[eid] = Position.x[lodge];
        UnitStateMachine.targetY[eid] = Position.y[lodge];
        UnitStateMachine.state[eid] = UnitState.ReturnMove;
      } else {
        UnitStateMachine.state[eid] = UnitState.Idle;
      }
    }
  }
}
