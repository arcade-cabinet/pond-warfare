import { EntityKind, SpriteId } from '@/types';

/**
 * Canonical live player-facing unit mappings.
 *
 * The ECS enum still carries a few reserved alias ids, but live player/runtime
 * code should speak in canonical roster terms wherever possible.
 */
export const MUDPAW_KIND = EntityKind.Mudpaw;
export const MEDIC_KIND = EntityKind.Medic;
export const LOOKOUT_KIND = EntityKind.Lookout;
export const ENEMY_HARVESTER_KIND = EntityKind.Mudpaw;
export const SAPPER_KIND = EntityKind.Sapper;
export const SABOTEUR_KIND = EntityKind.Saboteur;
export const SHARED_SAPPER_CHASSIS_KIND = EntityKind.SharedSapperChassis;
export const SHARED_SABOTEUR_CHASSIS_KIND = EntityKind.SharedSaboteurChassis;
export const SHARED_HEAVY_CHASSIS_KIND = EntityKind.SharedHeavyChassis;
export const SHARED_SIEGE_CHASSIS_KIND = EntityKind.SharedSiegeChassis;
export const MUDPAW_SPRITE_ID = SpriteId.Mudpaw;
export const MEDIC_SPRITE_ID = SpriteId.Medic;
export const LOOKOUT_SPRITE_ID = SpriteId.Lookout;
export const SAPPER_SPRITE_ID = SpriteId.Sapper;
export const SABOTEUR_SPRITE_ID = SpriteId.Saboteur;
export const FISHER_KIND = MUDPAW_KIND;
export const LOGGER_KIND = MUDPAW_KIND;
export const DIGGER_KIND = MUDPAW_KIND;
export const GUARD_KIND = SAPPER_KIND;
export const RANGER_KIND = SABOTEUR_KIND;
export const BOMBARDIER_KIND = SAPPER_KIND;
export const SHAMAN_KIND = EntityKind.Shaman;

export function isMudpawKind(kind: EntityKind | number): boolean {
  return kind === MUDPAW_KIND;
}

export function isMedicKind(kind: EntityKind | number): boolean {
  return kind === MEDIC_KIND;
}

export function isLookoutKind(kind: EntityKind | number): boolean {
  return kind === LOOKOUT_KIND;
}
