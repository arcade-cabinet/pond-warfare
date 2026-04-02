/**
 * Healing Sub-systems
 *
 * Passive healing, healer aura, and herbalist hut area heal.
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
import { EntityKind, Faction, UnitState } from '@/types';
import { spawnParticle } from '@/utils/particles';

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

/** Healer aura: healers heal nearest friendly within 80px every 60 frames. */
export function processHealerAura(world: GameWorld): void {
  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);

  const healers: number[] = [];
  const candidates: number[] = [];
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if ((FactionTag.faction[eid] as Faction) !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if ((EntityTypeTag.kind[eid] as EntityKind) === EntityKind.Healer) {
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
    let bestEid = -1;
    let bestDistSq = 80 * 80;

    for (let j = 0; j < candidates.length; j++) {
      const tEid = candidates[j];
      const dx = Position.x[tEid] - hx;
      const dy = Position.y[tEid] - hy;
      const dSq = dx * dx + dy * dy;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestEid = tEid;
      }
    }

    if (bestEid !== -1) {
      Health.current[bestEid] = Math.min(Health.max[bestEid], Health.current[bestEid] + 2);
      spawnParticle(
        world,
        Position.x[bestEid],
        Position.y[bestEid] - 10,
        (world.gameRng.next() - 0.5) * 1,
        -world.gameRng.next() * 1.5,
        20,
        '#22c55e',
        3,
      );

      if (world.gameRng.next() < 0.2) {
        showBark(world, hEid, Position.x[hEid], Position.y[hEid], EntityKind.Healer, 'heal');
      }
    }
  }
}

/** Regeneration tech: every 300 frames, all living player units regen 1 HP. */
export function processRegeneration(world: GameWorld): void {
  const units = query(world.ecs, [Health, FactionTag, EntityTypeTag]);
  for (let i = 0; i < units.length; i++) {
    const eid = units[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (hasComponent(world.ecs, eid, IsResource)) continue;
    if (Health.current[eid] <= 0) continue;
    if (Health.current[eid] >= Health.max[eid]) continue;
    Health.current[eid] = Math.min(Health.max[eid], Health.current[eid] + 1);
  }
}

/** Herbalist Hut area heal: every 120 frames, heals all player units within 150px by 2 HP. */
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
      ? world.spatialHash.query(hx, hy, 150)
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
