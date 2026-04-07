import { EntityKind, SpriteId } from '@/types';

/**
 * Canonical live player-facing unit mappings.
 *
 * The ECS enum still carries long-lived shared worker/recon and legacy combat
 * chassis ids, but live player/runtime code should speak in canonical roster
 * terms wherever possible.
 */
export const MUDPAW_KIND = EntityKind.Gatherer;
export const MEDIC_KIND = EntityKind.Healer;
export const LOOKOUT_KIND = EntityKind.Scout;
export const ENEMY_HARVESTER_KIND = EntityKind.Gatherer;
export const SAPPER_KIND = EntityKind.Sapper;
export const SABOTEUR_KIND = EntityKind.Saboteur;
export const LEGACY_SAPPER_CHASSIS_KIND = EntityKind.Brawler;
export const LEGACY_SABOTEUR_CHASSIS_KIND = EntityKind.Sniper;
export const MUDPAW_SPRITE_ID = SpriteId.Gatherer;
export const MEDIC_SPRITE_ID = SpriteId.Healer;
export const LOOKOUT_SPRITE_ID = SpriteId.Scout;
export const SAPPER_SPRITE_ID = SpriteId.Sapper;
export const SABOTEUR_SPRITE_ID = SpriteId.Saboteur;
export const LEGACY_SAPPER_CHASSIS_SPRITE_ID = SpriteId.Brawler;
export const LEGACY_SABOTEUR_CHASSIS_SPRITE_ID = SpriteId.Sniper;
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

export function isLegacySapperChassisKind(kind: EntityKind | number): boolean {
  return kind === LEGACY_SAPPER_CHASSIS_KIND;
}

export function isLegacySaboteurChassisKind(kind: EntityKind | number): boolean {
  return kind === LEGACY_SABOTEUR_CHASSIS_KIND;
}
