/**
 * Building System
 *
 * Ported from Entity.update() build state (lines 1685-1693) and repair state
 * (lines 1695-1710) of the original HTML game.
 *
 * Responsibilities:
 * - Build state: progress building HP toward max, update progress percentage
 * - Repair state: repair damaged buildings at cost of 1 twig per 5 HP
 * - SFX calls (build sound every 20 frames)
 * - Particle effects at target building
 * - Timer management for both build and repair cycles
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { entityKindName } from '@/config/entity-defs';
import { BUILD_TIMER, PALETTE, REPAIR_TIMER } from '@/constants';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { triggerBuildingComplete } from '@/rendering/animations';
import { EntityKind, UnitState } from '@/types';
import { pushGameEvent } from '@/ui/game-events';
import { spawnParticle } from '@/utils/particles';

export function buildingSystem(world: GameWorld): void {
  const builders = query(world.ecs, [
    Position,
    UnitStateMachine,
    Health,
    EntityTypeTag,
    FactionTag,
  ]);

  for (let i = 0; i < builders.length; i++) {
    const eid = builders[i];
    if (Health.current[eid] <= 0) continue;

    const state = UnitStateMachine.state[eid] as UnitState;

    // --- Build state (lines 1685-1693) ---
    if (state === UnitState.Building) {
      const tEnt = UnitStateMachine.targetEntity[eid];
      if (
        tEnt === -1 ||
        !hasComponent(world.ecs, tEnt, Health) ||
        Health.current[tEnt] >= Health.max[tEnt]
      ) {
        UnitStateMachine.state[eid] = UnitState.Idle;
        continue;
      }

      // SFX and particles every 20 frames
      if (world.frameCount % 20 === 0) {
        audio.build();
        world.particles.push({
          x: Position.x[tEnt] + (world.gameRng.next() - 0.5) * 20,
          y: Position.y[tEnt] - 10,
          vx: 0,
          vy: 1,
          life: 10,
          color: PALETTE.mudLight,
          size: 2,
        });
      }

      // Timer countdown
      UnitStateMachine.gatherTimer[eid]--;
      if (UnitStateMachine.gatherTimer[eid] <= 0) {
        Health.current[tEnt] += 10;
        if (hasComponent(world.ecs, tEnt, Building)) {
          Building.progress[tEnt] = (Health.current[tEnt] / Health.max[tEnt]) * 100;
        }
        if (Health.current[tEnt] >= Health.max[tEnt]) {
          Health.current[tEnt] = Health.max[tEnt];
          if (hasComponent(world.ecs, tEnt, Building)) {
            Building.progress[tEnt] = 100;
          }
          // Fortified Walls: +100 HP to Wall buildings on completion
          if (
            world.tech.fortifiedWalls &&
            hasComponent(world.ecs, tEnt, EntityTypeTag) &&
            (EntityTypeTag.kind[tEnt] as EntityKind) === EntityKind.Wall
          ) {
            Health.max[tEnt] += 100;
            Health.current[tEnt] = Health.max[tEnt];
          }

          audio.buildComplete();
          triggerBuildingComplete(tEnt);

          // Ring of particles expanding outward from building
          const bx = Position.x[tEnt];
          const by = Position.y[tEnt];
          for (let p = 0; p < 16; p++) {
            const angle = (p / 16) * Math.PI * 2;
            const speed = 2 + world.gameRng.next() * 1.5;
            spawnParticle(
              world,
              bx,
              by,
              Math.cos(angle) * speed,
              Math.sin(angle) * speed,
              25,
              '#fde047',
              3,
            );
          }

          // Flash the building sprite white
          Health.flashTimer[tEnt] = 12;

          // Gold floating announcement text centered on building
          const buildingName = hasComponent(world.ecs, tEnt, EntityTypeTag)
            ? entityKindName(EntityTypeTag.kind[tEnt] as EntityKind)
            : 'Building';
          world.floatingTexts.push({
            x: bx,
            y: by - 30,
            text: `${buildingName} COMPLETE!`,
            color: '#fbbf24',
            life: 90,
          });

          // Minimap ping on the completed building
          world.minimapPings.push({ x: bx, y: by, life: 120, maxLife: 120 });

          // Event feed
          pushGameEvent(`${buildingName} complete`, '#fbbf24', world.frameCount);

          world.stats.buildingsBuilt++;
          UnitStateMachine.state[eid] = UnitState.Idle;
        } else {
          // Reset timer only when not yet complete (original: this.gTimer = 30)
          UnitStateMachine.gatherTimer[eid] = BUILD_TIMER;
        }
      }
      continue;
    }

    // --- Repair state (lines 1695-1710) ---
    if (state === UnitState.Repairing) {
      const tEnt = UnitStateMachine.targetEntity[eid];
      if (
        tEnt === -1 ||
        !hasComponent(world.ecs, tEnt, Health) ||
        Health.current[tEnt] >= Health.max[tEnt]
      ) {
        UnitStateMachine.state[eid] = UnitState.Idle;
        continue;
      }

      // SFX and particles every 20 frames
      if (world.frameCount % 20 === 0) {
        audio.build();
        world.particles.push({
          x: Position.x[tEnt] + (world.gameRng.next() - 0.5) * 20,
          y: Position.y[tEnt] - 10,
          vx: 0,
          vy: 1,
          life: 10,
          color: '#22c55e',
          size: 2,
        });
      }

      // Timer countdown
      UnitStateMachine.gatherTimer[eid]--;
      if (UnitStateMachine.gatherTimer[eid] <= 0) {
        // Repair costs 1 twig per 5 HP
        if (world.resources.twigs >= 1) {
          world.resources.twigs -= 1;
          Health.current[tEnt] = Math.min(Health.max[tEnt], Health.current[tEnt] + 5);
          if (Health.current[tEnt] >= Health.max[tEnt]) {
            UnitStateMachine.state[eid] = UnitState.Idle;
          } else {
            // Reset timer only when not yet complete (original: this.gTimer = 40)
            UnitStateMachine.gatherTimer[eid] = REPAIR_TIMER;
          }
        } else {
          world.floatingTexts.push({
            x: Position.x[eid],
            y: Position.y[eid] - 20,
            text: 'No twigs!',
            color: '#ef4444',
            life: 40,
          });
          UnitStateMachine.state[eid] = UnitState.Idle;
        }
      }
    }
  }
}
