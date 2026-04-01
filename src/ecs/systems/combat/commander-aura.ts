/**
 * Commander Aura
 *
 * Rebuilds on the normal 60-frame cadence, but clears immediately
 * if all living player Commanders are gone so buffs never linger
 * after commander death/removal.
 */

import { hasComponent, query } from 'bitecs';
import {
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

export function commanderAura(world: GameWorld): void {
  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, Combat]);
  const shouldRefresh = world.frameCount % 60 === 0;

  if (!shouldRefresh) {
    if (world.commanderDamageBuff.size === 0 && world.commanderSpeedBuff.size === 0) return;

    for (let i = 0; i < allUnits.length; i++) {
      const eid = allUnits[i];
      if (FactionTag.faction[eid] !== Faction.Player) continue;
      if (Health.current[eid] <= 0) continue;
      if ((EntityTypeTag.kind[eid] as EntityKind) === EntityKind.Commander) return;
    }

    world.commanderDamageBuff.clear();
    world.commanderSpeedBuff.clear();
    world.commanderEnemyDebuff.clear();
    return;
  }

  // Clear previous buff sets; we rebuild each tick
  world.commanderDamageBuff.clear();
  world.commanderSpeedBuff.clear();
  world.commanderEnemyDebuff.clear();

  const mods = world.commanderModifiers;

  // Find living player Commanders
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if ((EntityTypeTag.kind[eid] as EntityKind) !== EntityKind.Commander) continue;

    const cx = Position.x[eid];
    const cy = Position.y[eid];
    const auraRadius = 150;

    const candidates = world.spatialHash ? world.spatialHash.query(cx, cy, auraRadius) : allUnits;
    for (let j = 0; j < candidates.length; j++) {
      const t = candidates[j];
      if (t === eid) continue;
      if (!hasComponent(world.ecs, t, FactionTag) || FactionTag.faction[t] !== Faction.Player)
        continue;
      if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;

      const dx = Position.x[t] - cx;
      const dy = Position.y[t] - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > auraRadius) continue;

      const isBuil = hasComponent(world.ecs, t, IsBuilding);
      const isRes = hasComponent(world.ecs, t, IsResource);

      // Building HP bonus
      if (isBuil && mods.auraHpBonus > 0 && !world.commanderHpBuffApplied.has(t)) {
        Health.max[t] += mods.auraHpBonus;
        Health.current[t] += mods.auraHpBonus;
        world.commanderHpBuffApplied.add(t);
      }

      // Unit buffs
      if (!isBuil && !isRes && hasComponent(world.ecs, t, Combat)) {
        world.commanderDamageBuff.add(t);

        if (mods.auraSpeedBonus > 0) {
          world.commanderSpeedBuff.add(t);
        }

        // Ironpaw: +20% HP to all units (apply once)
        if (mods.auraUnitHpBonus > 0 && !world.commanderHpBuffApplied.has(t)) {
          const bonus = Math.round(Health.max[t] * mods.auraUnitHpBonus);
          Health.max[t] += bonus;
          Health.current[t] += bonus;
          world.commanderHpBuffApplied.add(t);
        }
      }
    }

    // Shadowfang-style debuff: mark enemy units in aura range
    if (mods.auraEnemyDamageReduction > 0) {
      const enemies = world.spatialHash ? world.spatialHash.query(cx, cy, auraRadius) : allUnits;
      for (let j = 0; j < enemies.length; j++) {
        const e = enemies[j];
        if (!hasComponent(world.ecs, e, FactionTag) || FactionTag.faction[e] !== Faction.Enemy)
          continue;
        if (!hasComponent(world.ecs, e, Health) || Health.current[e] <= 0) continue;
        const edx = Position.x[e] - cx;
        const edy = Position.y[e] - cy;
        if (Math.sqrt(edx * edx + edy * edy) <= auraRadius) {
          world.commanderEnemyDebuff.add(e);
        }
      }
    }
  }
}
