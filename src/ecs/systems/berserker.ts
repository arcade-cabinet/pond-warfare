/**
 * Berserker System
 *
 * Manages the Berserker unit's unique mechanics:
 * - Loses 1 HP every 60 frames (1/second) when in combat (Attacking state)
 * - Gains +5% damage for every 10% HP lost (max +50% at 10% HP)
 * - Red rage particles when below 50% HP
 *
 * Runs every 60 frames for HP drain and damage recalculation.
 */

import { query } from 'bitecs';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { Combat, EntityTypeTag, Health, Position, UnitStateMachine } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, UnitState } from '@/types';
import { spawnParticle } from '@/utils/particles';

/** Frames between HP drain ticks. */
const DRAIN_INTERVAL = 60;

/** HP drain per tick when in combat. */
const DRAIN_AMOUNT = 1;

/** Maximum bonus damage multiplier at 10% HP. */
const MAX_BONUS = 0.5;

export function berserkerSystem(world: GameWorld): void {
  if (world.frameCount % DRAIN_INTERVAL !== 0) return;

  const entities = query(world.ecs, [EntityTypeTag, Health, Combat, UnitStateMachine, Position]);

  for (const eid of entities) {
    if (EntityTypeTag.kind[eid] !== EntityKind.Berserker) continue;

    const isAttacking = UnitStateMachine.state[eid] === UnitState.Attacking;
    const currentHp = Health.current[eid];
    const maxHp = Health.max[eid];

    // HP drain: only when actively attacking
    if (isAttacking && currentHp > 1) {
      Health.current[eid] = Math.max(1, currentHp - DRAIN_AMOUNT);
      world.berserkerCombatFrames.set(
        eid,
        (world.berserkerCombatFrames.get(eid) ?? 0) + DRAIN_INTERVAL,
      );
    }

    // Damage scaling: +5% per 10% HP lost, max +50%
    const hpPercent = Health.current[eid] / maxHp;
    const hpLostPercent = 1 - hpPercent;
    const bonusMult = Math.min(MAX_BONUS, Math.floor(hpLostPercent * 10) * 0.05);

    // Apply damage = base * (1 + bonus)
    const baseDamage = ENTITY_DEFS[EntityKind.Berserker].damage;
    Combat.damage[eid] = Math.round(baseDamage * (1 + bonusMult));

    // Red rage particles below 50% HP
    if (hpPercent < 0.5) {
      const x = Position.x[eid];
      const y = Position.y[eid];
      spawnParticle(
        world,
        x + (Math.random() - 0.5) * 20,
        y - 10,
        (Math.random() - 0.5) * 1.5,
        -1.5,
        20,
        '#ef4444',
        2,
      );
    }
  }
}
