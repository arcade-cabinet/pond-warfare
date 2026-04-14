import { entityKindName } from '@/config/entity-defs';
import { EntityTypeTag, FactionTag } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { MEDIC_KIND, MUDPAW_KIND } from '@/game/live-unit-kinds';
import { type EntityKind, Faction } from '@/types';

const PLAYER_MANUAL_LABELS: Partial<Record<EntityKind, string>> = {
  [MUDPAW_KIND]: 'Mudpaw',
  [MEDIC_KIND]: 'Medic',
};

export function getPlayerTrainableDisplayName(kind: EntityKind): string {
  return PLAYER_MANUAL_LABELS[kind] ?? entityKindName(kind);
}

export function getEntityDisplayName(
  world: Pick<GameWorld, 'specialistAssignments'>,
  eid: number,
): string {
  const specialistLabel = world.specialistAssignments.get(eid)?.label;
  if (specialistLabel) return specialistLabel;

  const kind = EntityTypeTag.kind[eid] as EntityKind;
  if (FactionTag.faction[eid] === Faction.Player) {
    return getPlayerTrainableDisplayName(kind);
  }
  return entityKindName(kind);
}
