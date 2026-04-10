import { query } from 'bitecs';
import { Building, EntityTypeTag, FactionTag, Health } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

const PLAYER_FORTIFICATION_KINDS = new Set([
  EntityKind.Tower,
  EntityKind.Watchtower,
  EntityKind.Wall,
]);

export interface PlayerFortificationSnapshot {
  playerFortificationCount: number;
  playerFortificationHpPool: number;
  playerFortificationHpRatio: number;
}

export function getPlayerFortificationSnapshot(world: GameWorld): PlayerFortificationSnapshot {
  const fortifications = Array.from(query(world.ecs, [Health, FactionTag, EntityTypeTag, Building])).filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      PLAYER_FORTIFICATION_KINDS.has(EntityTypeTag.kind[eid] as EntityKind) &&
      Health.current[eid] > 0 &&
      Building.progress[eid] >= 100,
  );
  const totalCurrentHp = fortifications.reduce((sum, eid) => sum + Health.current[eid], 0);
  const totalMaxHp = fortifications.reduce((sum, eid) => sum + Health.max[eid], 0);

  return {
    playerFortificationCount: fortifications.length,
    playerFortificationHpPool: totalCurrentHp,
    playerFortificationHpRatio: totalMaxHp > 0 ? totalCurrentHp / totalMaxHp : 0,
  };
}
