/**
 * Entity Kind to Radial Role Mapping
 *
 * Maps EntityKind numeric values to radial menu role strings.
 * Extracted from radial-menu-options.ts for 300 LOC compliance.
 */

import { EntityKind } from '@/types';
import { isLookoutKind, isMudpawKind, MEDIC_KIND } from '@/game/live-unit-kinds';

/**
 * Map an EntityKind numeric value to a v3 role string.
 * Uses the existing entity kinds to determine role.
 */
export function entityKindToRole(kind: EntityKind | number): string {
  if (isMudpawKind(kind)) return 'generalist';
  if (kind === MEDIC_KIND || kind === EntityKind.Shaman) return 'heal';
  if (isLookoutKind(kind)) return 'scout';
  return 'combat';
}
