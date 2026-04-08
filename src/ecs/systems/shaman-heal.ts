/**
 * Shaman AoE Healing System
 *
 * The Shaman passively heals all friendly units within 100px for 2 HP
 * every 300 frames (5 seconds). Different from Medic (single-target);
 * Shaman is AoE. Shows green particle ring on heal tick.
 *
 * Runs every 300 frames.
 */

import { hasComponent, query } from 'bitecs';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { isPointInSpecialistArea } from '@/game/specialist-assignment-queries';
import { EntityKind, Faction } from '@/types';
import { spawnParticle } from '@/utils/particles';

/** Radius in pixels for Shaman AoE heal. */
const SHAMAN_HEAL_RADIUS = 100;

/** HP healed per tick per unit in range. */
const SHAMAN_HEAL_AMOUNT = 2;

/** Interval in frames between heals (5 seconds at 60fps). */
const SHAMAN_HEAL_INTERVAL = 300;

function getShamanHealAmount(world: GameWorld): number {
  return Math.max(1, Math.round(SHAMAN_HEAL_AMOUNT * world.playerHealMultiplier));
}

/**
 * Shaman healing tick. For each living player Shaman, heal all nearby
 * friendly units by SHAMAN_HEAL_AMOUNT, capped at max HP.
 */
export function shamanHealSystem(world: GameWorld): void {
  if (world.frameCount % SHAMAN_HEAL_INTERVAL !== 0) return;

  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);

  // Find living Shamans
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (Health.current[eid] <= 0) continue;
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if ((EntityTypeTag.kind[eid] as EntityKind) !== EntityKind.Shaman) continue;

    const sx = Position.x[eid];
    const sy = Position.y[eid];

    // Find friendly units in range
    const candidates = world.spatialHash
      ? world.spatialHash.query(sx, sy, SHAMAN_HEAL_RADIUS)
      : allUnits;

    let healedAny = false;

    for (let j = 0; j < candidates.length; j++) {
      const t = candidates[j];
      if (t === eid) continue;
      if (!hasComponent(world.ecs, t, FactionTag)) continue;
      if (FactionTag.faction[t] !== Faction.Player) continue;
      if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;
      if (Health.current[t] >= Health.max[t]) continue;
      if (hasComponent(world.ecs, t, IsBuilding) || hasComponent(world.ecs, t, IsResource))
        continue;
      if (!isPointInSpecialistArea(world, eid, Position.x[t], Position.y[t])) continue;

      const dx = Position.x[t] - sx;
      const dy = Position.y[t] - sy;
      if (Math.sqrt(dx * dx + dy * dy) > SHAMAN_HEAL_RADIUS) continue;

      // Heal
      Health.current[t] = Math.min(Health.current[t] + getShamanHealAmount(world), Health.max[t]);
      healedAny = true;
    }

    // Green particle ring around Shaman when healing
    if (healedAny) {
      for (let p = 0; p < 8; p++) {
        const angle = (p / 8) * Math.PI * 2;
        spawnParticle(
          world,
          sx + Math.cos(angle) * 20,
          sy + Math.sin(angle) * 20,
          Math.cos(angle) * 0.5,
          Math.sin(angle) * 0.5,
          25,
          '#4ade80',
          3,
        );
      }
    }
  }
}
