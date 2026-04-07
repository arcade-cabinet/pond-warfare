/**
 * Healing Sub-systems
 *
 * Passive healing, Medic aura (max 3 targets), herbalist hut area heal,
 * and regeneration (requires 5s out of combat).
 */

import { hasComponent, query } from 'bitecs';
import { showBark } from '@/config/barks';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { MEDIC_KIND } from '@/game/live-unit-kinds';
import { EntityKind, Faction, UnitState } from '@/types';
import { spawnParticle } from '@/utils/particles';

/** Max units a single Medic can heal per tick. */
const MAX_HEALS_PER_HEALER = 3;

/** Herbalist Hut healing radius in pixels. */
const HERBALIST_HUT_RANGE = 200;

/** Frames since last damage before regen kicks in (5s at 60fps). */
const REGEN_OUT_OF_COMBAT_FRAMES = 300;

/** Passive healing: every 300 frames, player non-building units heal +1 HP when idle/non-combat. */
export function processPassiveHealing(world: GameWorld): void {
  const units = query(world.ecs, [UnitStateMachine, Health, FactionTag, EntityTypeTag]);
  for (let i = 0; i < units.length; i++) {
    const eid = units[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (hasComponent(world.ecs, eid, IsResource)) continue;
    if (Health.current[eid] <= 0) continue;
    if (Health.current[eid] >= Health.max[eid]) continue;

    const state = UnitStateMachine.state[eid] as UnitState;
    if (
      state === UnitState.Idle ||
      state === UnitState.Move ||
      state === UnitState.Gathering ||
      state === UnitState.GatherMove ||
      state === UnitState.ReturnMove
    ) {
      const healAmount = world.tech.hardenedShells ? 5 : 1;
      Health.current[eid] = Math.min(Health.max[eid], Health.current[eid] + healAmount);

      if (world.tech.hardenedShells) {
        spawnParticle(
          world,
          Position.x[eid],
          Position.y[eid] - 8,
          (world.gameRng.next() - 0.5) * 0.8,
          -world.gameRng.next() * 1,
          15,
          '#86efac',
          2,
        );
      }
    }
  }
}

/** Medic aura: Medics heal up to 3 nearest friendlies within 80px every 60 frames. */
export function processHealerAura(world: GameWorld): void {
  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);

  const healers: number[] = [];
  const candidates: number[] = [];
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if ((FactionTag.faction[eid] as Faction) !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if ((EntityTypeTag.kind[eid] as EntityKind) === MEDIC_KIND) {
      healers.push(eid);
    } else if (
      !hasComponent(world.ecs, eid, IsBuilding) &&
      !hasComponent(world.ecs, eid, IsResource) &&
      Health.current[eid] < Health.max[eid]
    ) {
      candidates.push(eid);
    }
  }

  for (let i = 0; i < healers.length; i++) {
    const hEid = healers[i];
    const hx = Position.x[hEid];
    const hy = Position.y[hEid];
    const rangeLimit = 80 * 80;

    // Collect candidates in range with distances, then pick closest 3
    const inRange: { eid: number; distSq: number }[] = [];
    for (let j = 0; j < candidates.length; j++) {
      const tEid = candidates[j];
      const dx = Position.x[tEid] - hx;
      const dy = Position.y[tEid] - hy;
      const dSq = dx * dx + dy * dy;
      if (dSq < rangeLimit) {
        inRange.push({ eid: tEid, distSq: dSq });
      }
    }

    // Sort by distance and cap at MAX_HEALS_PER_HEALER
    inRange.sort((a, b) => a.distSq - b.distSq);
    const healCount = Math.min(inRange.length, MAX_HEALS_PER_HEALER);

    for (let h = 0; h < healCount; h++) {
      const target = inRange[h].eid;
      Health.current[target] = Math.min(Health.max[target], Health.current[target] + 2);
      spawnParticle(
        world,
        Position.x[target],
        Position.y[target] - 10,
        (world.gameRng.next() - 0.5) * 1,
        -world.gameRng.next() * 1.5,
        20,
        '#22c55e',
        3,
      );
    }

    if (healCount > 0 && world.gameRng.next() < 0.2) {
      showBark(world, hEid, hx, hy, MEDIC_KIND, 'heal');
    }
  }
}

/** Regeneration tech: every 300 frames, all living player units regen 1 HP if out of combat 5s. */
export function processRegeneration(world: GameWorld): void {
  const units = query(world.ecs, [Health, FactionTag, EntityTypeTag]);
  for (let i = 0; i < units.length; i++) {
    const eid = units[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (hasComponent(world.ecs, eid, IsResource)) continue;
    if (Health.current[eid] <= 0) continue;
    if (Health.current[eid] >= Health.max[eid]) continue;

    // Only regen if unit hasn't taken damage in the last 5 seconds (300 frames)
    const lastDmg = Health.lastDamagedFrame[eid];
    if (lastDmg > 0 && world.frameCount - lastDmg < REGEN_OUT_OF_COMBAT_FRAMES) continue;

    Health.current[eid] = Math.min(Health.max[eid], Health.current[eid] + 1);
  }
}

/** Herbalist Hut area heal: every 120 frames, heals all player units within 200px by 2 HP. */
export function processHerbalistHutHeal(world: GameWorld): void {
  const huts = query(world.ecs, [Position, Health, IsBuilding, EntityTypeTag, FactionTag]);
  for (let i = 0; i < huts.length; i++) {
    const hut = huts[i];
    if (EntityTypeTag.kind[hut] !== EntityKind.HerbalistHut) continue;
    if (FactionTag.faction[hut] !== Faction.Player) continue;
    if (Health.current[hut] <= 0) continue;
    if (!hasComponent(world.ecs, hut, Building) || Building.progress[hut] < 100) continue;

    const hx = Position.x[hut];
    const hy = Position.y[hut];
    const nearby = world.spatialHash
      ? world.spatialHash.query(hx, hy, HERBALIST_HUT_RANGE)
      : query(world.ecs, [Position, Health, FactionTag]);
    for (let j = 0; j < nearby.length; j++) {
      const uid = nearby[j];
      if (!hasComponent(world.ecs, uid, FactionTag)) continue;
      if (FactionTag.faction[uid] !== Faction.Player) continue;
      if (hasComponent(world.ecs, uid, IsBuilding)) continue;
      if (!hasComponent(world.ecs, uid, Health)) continue;
      if (Health.current[uid] <= 0 || Health.current[uid] >= Health.max[uid]) continue;
      Health.current[uid] = Math.min(Health.max[uid], Health.current[uid] + 2);
      spawnParticle(
        world,
        Position.x[uid],
        Position.y[uid] - 8,
        (world.gameRng.next() - 0.5) * 0.8,
        -world.gameRng.next() * 1,
        15,
        '#86efac',
        2,
      );
    }
  }
}
