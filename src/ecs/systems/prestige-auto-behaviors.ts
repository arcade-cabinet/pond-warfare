import { query } from 'bitecs';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { isAutoBehaviorUnlocked } from '@/config/prestige-logic';
import { EntityTypeTag, FactionTag, Health, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';
import * as storeV3 from '@/ui/store-v3';

const TICK_INTERVAL = 60;
const LODGE_REGEN_RADIUS = 180;
const LODGE_REGEN_PER_TICK = 1;
const LODGE_SELF_REPAIR_PER_TICK = 2;

export function prestigeAutoBehaviorSystem(world: GameWorld): void {
  if (world.frameCount % TICK_INTERVAL !== 0) return;

  const prestigeState = storeV3.prestigeState.value;
  const hasUnitRegen = isAutoBehaviorUnlocked(prestigeState, 'lodge_regen');
  const hasLodgeRepair = isAutoBehaviorUnlocked(prestigeState, 'lodge_self_repair');

  if (!hasUnitRegen && !hasLodgeRepair) return;

  const lodge = findPlayerLodge(world);
  if (lodge == null) return;

  if (hasLodgeRepair && Health.current[lodge] > 0) {
    Health.current[lodge] = Math.min(
      Health.max[lodge],
      Health.current[lodge] + LODGE_SELF_REPAIR_PER_TICK,
    );
  }

  if (!hasUnitRegen) return;

  const lodgeX = Position.x[lodge];
  const lodgeY = Position.y[lodge];
  const radiusSq = LODGE_REGEN_RADIUS * LODGE_REGEN_RADIUS;

  for (const eid of query(world.ecs, [Health, Position, FactionTag, EntityTypeTag])) {
    if (eid === lodge) continue;
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0 || Health.current[eid] >= Health.max[eid]) continue;

    const kind = EntityTypeTag.kind[eid] as EntityKind;
    const def = ENTITY_DEFS[kind];
    if (def.isBuilding || def.isResource) continue;

    const dx = Position.x[eid] - lodgeX;
    const dy = Position.y[eid] - lodgeY;
    if (dx * dx + dy * dy > radiusSq) continue;

    Health.current[eid] = Math.min(Health.max[eid], Health.current[eid] + LODGE_REGEN_PER_TICK);
  }
}

function findPlayerLodge(world: GameWorld): number | null {
  for (const eid of query(world.ecs, [Health, FactionTag, EntityTypeTag])) {
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (EntityTypeTag.kind[eid] !== EntityKind.Lodge) continue;
    if (Health.current[eid] <= 0) continue;
    return eid;
  }
  return null;
}
