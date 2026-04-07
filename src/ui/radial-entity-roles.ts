/**
 * Entity Kind to Radial Role Mapping
 *
 * Maps EntityKind numeric values to radial menu role strings.
 * Extracted from radial-menu-options.ts for 300 LOC compliance.
 */

import { EntityKind } from '@/types';

/**
 * Map an EntityKind numeric value to a v3 role string.
 * Uses the existing entity kinds to determine role.
 */
export function entityKindToRole(kind: EntityKind | number): string {
  switch (kind) {
    case EntityKind.Gatherer:
      return 'generalist';
    case EntityKind.Healer:
    case EntityKind.Shaman:
      return 'heal';
    case EntityKind.Scout:
      return 'scout';
    case EntityKind.Brawler:
    case EntityKind.Sniper:
    case EntityKind.Shieldbearer:
    case EntityKind.Catapult:
    case EntityKind.Swimmer:
    case EntityKind.Commander:
    case EntityKind.Diver:
    case EntityKind.Engineer:
    case EntityKind.FlyingHeron:
    case EntityKind.Berserker:
    case EntityKind.Sapper:
    case EntityKind.Saboteur:
      return 'combat';
    default:
      return 'combat';
  }
}
