import { query } from 'bitecs';
import { EntityTypeTag, FactionTag, Health } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

export const LODGE_REPAIR_LOG_COST = 30;
const BASE_LODGE_REPAIR_HEAL = 100;

export type LodgeRepairResult =
  | { success: true; lodgeEid: number; healAmount: number }
  | { success: false; reason: 'no_lodge' | 'not_enough_logs' | 'full_health' };

export function getPlayerLodgeRepairAmount(world: GameWorld): number {
  return Math.max(1, Math.round(BASE_LODGE_REPAIR_HEAL * world.playerRepairSpeedMultiplier));
}

export function findPlayerLodge(world: GameWorld): number {
  const buildings = query(world.ecs, [FactionTag, EntityTypeTag, Health]);
  for (const eid of buildings) {
    if (
      FactionTag.faction[eid] === Faction.Player &&
      EntityTypeTag.kind[eid] === EntityKind.Lodge &&
      Health.current[eid] > 0
    ) {
      return eid;
    }
  }
  return -1;
}

export function repairPlayerLodge(world: GameWorld): LodgeRepairResult {
  const lodgeEid = findPlayerLodge(world);
  if (lodgeEid < 0) return { success: false, reason: 'no_lodge' };

  if (world.resources.logs < LODGE_REPAIR_LOG_COST) {
    return { success: false, reason: 'not_enough_logs' };
  }

  const current = Health.current[lodgeEid];
  const max = Health.max[lodgeEid];
  if (current >= max) return { success: false, reason: 'full_health' };

  world.resources.logs -= LODGE_REPAIR_LOG_COST;
  const healAmount = Math.min(getPlayerLodgeRepairAmount(world), max - current);
  Health.current[lodgeEid] = current + healAmount;
  return { success: true, lodgeEid, healAmount };
}
