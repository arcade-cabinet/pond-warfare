import { EntityKind } from '@/types';

/**
 * Canonical live player-facing unit mappings.
 *
 * The ECS enum still carries long-lived shared chassis ids such as
 * `Gatherer` and `Scout`, but live player/runtime code should speak in
 * canonical roster terms wherever possible.
 */
export const MUDPAW_KIND = EntityKind.Gatherer;
export const MEDIC_KIND = EntityKind.Healer;
export const LOOKOUT_KIND = EntityKind.Scout;
export const SAPPER_KIND = EntityKind.Sapper;
export const SABOTEUR_KIND = EntityKind.Saboteur;

export function isMudpawKind(kind: EntityKind | number): boolean {
  return kind === MUDPAW_KIND;
}

export function isMedicKind(kind: EntityKind | number): boolean {
  return kind === MEDIC_KIND;
}

export function isLookoutKind(kind: EntityKind | number): boolean {
  return kind === LOOKOUT_KIND;
}
