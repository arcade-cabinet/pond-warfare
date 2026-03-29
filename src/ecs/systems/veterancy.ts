/**
 * Veterancy System
 *
 * Units gain experience from kills and rank up with stat bonuses.
 * Runs every 60 frames. Checks Combat.kills against thresholds and
 * applies incremental bonuses when a unit reaches a new rank.
 *
 * Ranks: Recruit (0) -> Veteran (3 kills) -> Elite (7 kills) -> Hero (15 kills)
 */

import { hasComponent, query } from 'bitecs';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  VET_DMG_BONUS,
  VET_HP_BONUS,
  VET_RANK_NAMES,
  VET_SPD_BONUS,
  VET_THRESHOLDS,
} from '@/constants';
import {
  Combat,
  EntityTypeTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Sprite,
  Velocity,
  Veterancy,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import type { EntityKind } from '@/types';

/**
 * Calculate the veterancy rank for a given kill count.
 * Returns 0 (Recruit), 1 (Veteran), 2 (Elite), or 3 (Hero).
 */
export function rankFromKills(kills: number): number {
  let rank = 0;
  for (let i = VET_THRESHOLDS.length - 1; i >= 1; i--) {
    if (kills >= VET_THRESHOLDS[i]) {
      rank = i;
      break;
    }
  }
  return rank;
}

export function veterancySystem(world: GameWorld): void {
  // Only run every 60 frames
  if (world.frameCount % 60 !== 0) return;

  const units = query(world.ecs, [Combat, Health, Veterancy, Position, EntityTypeTag]);

  for (let i = 0; i < units.length; i++) {
    const eid = units[i];

    // Skip buildings and resources
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (hasComponent(world.ecs, eid, IsResource)) continue;
    if (Health.current[eid] <= 0) continue;

    const kills = Combat.kills[eid];
    const newRank = rankFromKills(kills);
    const appliedRank = Veterancy.appliedRank[eid];

    if (newRank > appliedRank) {
      // Look up base stats from entity definition
      const kind = EntityTypeTag.kind[eid] as EntityKind;
      const def = ENTITY_DEFS[kind];

      // Calculate delta bonuses between old rank and new rank
      const hpBonusDelta = VET_HP_BONUS[newRank] - VET_HP_BONUS[appliedRank];
      const dmgBonusDelta = VET_DMG_BONUS[newRank] - VET_DMG_BONUS[appliedRank];
      const spdBonusDelta = VET_SPD_BONUS[newRank] - VET_SPD_BONUS[appliedRank];

      // Apply HP bonus (based on base HP)
      if (hpBonusDelta > 0) {
        const hpIncrease = Math.round(def.hp * hpBonusDelta);
        Health.max[eid] += hpIncrease;
        // Heal by the same amount so the unit doesn't appear damaged after ranking up
        Health.current[eid] = Math.min(Health.max[eid], Health.current[eid] + hpIncrease);
      }

      // Apply damage bonus (based on base damage)
      if (dmgBonusDelta > 0 && def.damage > 0) {
        const dmgIncrease = Math.round(def.damage * dmgBonusDelta);
        Combat.damage[eid] += dmgIncrease;
      }

      // Apply speed bonus (based on base speed)
      if (spdBonusDelta > 0 && hasComponent(world.ecs, eid, Velocity)) {
        const spdIncrease = def.speed * spdBonusDelta;
        Velocity.speed[eid] += spdIncrease;
      }

      // Update rank tracking
      Veterancy.rank[eid] = newRank;
      Veterancy.appliedRank[eid] = newRank;

      // Floating text announcement
      const spriteH = hasComponent(world.ecs, eid, Sprite) ? Sprite.height[eid] : 32;
      const rankName = VET_RANK_NAMES[newRank];
      world.floatingTexts.push({
        x: Position.x[eid],
        y: Position.y[eid] - spriteH / 2 - 10,
        text: `${rankName}!`,
        color: '#fbbf24', // gold
        life: 60,
      });

      // Particle burst effect (gold sparkles)
      const ex = Position.x[eid];
      const ey = Position.y[eid];
      for (let p = 0; p < 12; p++) {
        const angle = (p / 12) * Math.PI * 2;
        world.particles.push({
          x: ex,
          y: ey - 5,
          vx: Math.cos(angle) * 2,
          vy: Math.sin(angle) * 2,
          life: 25,
          color: '#fbbf24',
          size: 3,
        });
      }
    }
  }
}
