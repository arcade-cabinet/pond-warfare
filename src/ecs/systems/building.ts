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
import { UnitState } from '@/types';

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
    // Original: if (this.state === 'build')
    if (state === UnitState.Building) {
      const tEnt = UnitStateMachine.targetEntity[eid];

      // Original: if (!this.tEnt || this.tEnt.hp >= this.tEnt.maxHp) { this.state = 'idle'; return; }
      if (
        !tEnt ||
        !hasComponent(world.ecs, tEnt, Health) ||
        Health.current[tEnt] >= Health.max[tEnt]
      ) {
        UnitStateMachine.state[eid] = UnitState.Idle;
        continue;
      }

      // SFX and particles every 20 frames
      // Original: if (GAME.frameCount % 20 === 0) { AudioSys.sfx.build(); this.part(PALETTE.mudLight); }
      if (world.frameCount % 20 === 0) {
        audio.build();
        world.particles.push({
          x: Position.x[tEnt] + (Math.random() - 0.5) * 20,
          y: Position.y[tEnt] - 10,
          vx: 0,
          vy: 1,
          life: 10,
          color: PALETTE.mudLight,
          size: 2,
        });
      }

      // Timer countdown
      // Original: if (--this.gTimer <= 0)
      UnitStateMachine.gatherTimer[eid]--;
      if (UnitStateMachine.gatherTimer[eid] <= 0) {
        // Original: this.tEnt.hp += 10; this.tEnt.progress = (this.tEnt.hp/this.tEnt.maxHp)*100;
        Health.current[tEnt] += 10;
        if (hasComponent(world.ecs, tEnt, Building)) {
          Building.progress[tEnt] = (Health.current[tEnt] / Health.max[tEnt]) * 100;
        }

        // Original: if (this.tEnt.hp >= this.tEnt.maxHp) { this.tEnt.hp=this.tEnt.maxHp; this.tEnt.progress=100; this.state='idle'; }
        if (Health.current[tEnt] >= Health.max[tEnt]) {
          Health.current[tEnt] = Health.max[tEnt];
          if (hasComponent(world.ecs, tEnt, Building)) {
            Building.progress[tEnt] = 100;
          }
          UnitStateMachine.state[eid] = UnitState.Idle;
        }

        // Reset timer (original: this.gTimer = 30)
        UnitStateMachine.gatherTimer[eid] = BUILD_TIMER;
      }
      continue;
    }

    // --- Repair state (lines 1695-1710) ---
    // Original: if (this.state === 'repair')
    if (state === UnitState.Repairing) {
      const tEnt = UnitStateMachine.targetEntity[eid];

      // Original: if (!this.tEnt || this.tEnt.hp >= this.tEnt.maxHp) { this.state = 'idle'; return; }
      if (
        !tEnt ||
        !hasComponent(world.ecs, tEnt, Health) ||
        Health.current[tEnt] >= Health.max[tEnt]
      ) {
        UnitStateMachine.state[eid] = UnitState.Idle;
        continue;
      }

      // SFX and particles every 20 frames
      // Original: if (GAME.frameCount % 20 === 0) { AudioSys.sfx.build(); this.part('#22c55e'); }
      if (world.frameCount % 20 === 0) {
        audio.build();
        world.particles.push({
          x: Position.x[tEnt] + (Math.random() - 0.5) * 20,
          y: Position.y[tEnt] - 10,
          vx: 0,
          vy: 1,
          life: 10,
          color: '#22c55e',
          size: 2,
        });
      }

      // Timer countdown
      // Original: if (--this.gTimer <= 0)
      UnitStateMachine.gatherTimer[eid]--;
      if (UnitStateMachine.gatherTimer[eid] <= 0) {
        // Repair costs 1 twig per 5 HP
        // Original: if (GAME.resources.twigs >= 1) { GAME.resources.twigs -= 1; this.tEnt.hp = Math.min(this.tEnt.maxHp, this.tEnt.hp + 5); }
        if (world.resources.twigs >= 1) {
          world.resources.twigs -= 1;
          Health.current[tEnt] = Math.min(Health.max[tEnt], Health.current[tEnt] + 5);
          if (Health.current[tEnt] >= Health.max[tEnt]) {
            UnitStateMachine.state[eid] = UnitState.Idle;
          }
        } else {
          // Original: GAME.floatingTexts.push({...}); this.state = 'idle';
          world.floatingTexts.push({
            x: Position.x[eid],
            y: Position.y[eid] - 20,
            text: 'No twigs!',
            color: '#ef4444',
            life: 40,
          });
          UnitStateMachine.state[eid] = UnitState.Idle;
        }

        // Reset timer (original: this.gTimer = 40)
        UnitStateMachine.gatherTimer[eid] = REPAIR_TIMER;
      }
    }
  }
}
