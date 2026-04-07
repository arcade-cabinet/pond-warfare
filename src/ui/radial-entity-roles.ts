/**
 * Entity Kind to Radial Role Mapping
 *
 * Maps EntityKind numeric values to radial menu role strings.
 * Extracted from radial-menu-options.ts for 300 LOC compliance.
 */

/**
 * Map an EntityKind numeric value to a v3 role string.
 * Uses the existing entity kinds to determine role.
 */
export function entityKindToRole(kind: number): string {
  // EntityKind values from types.ts
  switch (kind) {
    case 0:
      return 'generalist'; // Mudpaw
    case 12:
      return 'heal'; // Healer
    case 16:
      return 'scout'; // Scout
    case 1: // Brawler
    case 2: // Sniper
    case 15: // Shieldbearer
    case 17: // Catapult
    case 28: // Swimmer
    case 30: // Commander
    case 33: // Diver
    case 34: // Engineer
    case 37: // FlyingHeron
    case 41: // Berserker
      return 'combat';
    case 35:
      return 'heal'; // Shaman
    case 44:
      return 'combat'; // Sapper
    case 45:
      return 'combat'; // Saboteur
    default:
      return 'combat';
  }
}
