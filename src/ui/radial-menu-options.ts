/**
 * Radial Menu Option Definitions (v3.0 — US9)
 *
 * Defines what options appear in the radial menu based on context:
 * - Lodge: training options + fortify + repair
 * - Unit (by role): role-specific actions
 *
 * Each option has an id (dispatched as action), label, icon, color, and
 * optional disabled state.
 */

export type RadialMenuMode = 'lodge' | 'unit';

export interface RadialOption {
  id: string;
  label: string;
  icon: string;
  tooltip: string;
  /** CSS variable suffix for color, e.g. "success" -> var(--pw-success) */
  color: string;
  disabled?: boolean;
}

// ── Lodge Options ──────────────────────────────────────────────────

const LODGE_OPTIONS: RadialOption[] = [
  {
    id: 'train_gatherer',
    label: 'Gatherer',
    icon: '\u{1F41F}', // fish emoji for gatherer
    tooltip: 'Train Gatherer (10 Fish)',
    color: 'success',
  },
  {
    id: 'train_fighter',
    label: 'Fighter',
    icon: '\u2694\uFE0F', // crossed swords
    tooltip: 'Train Fighter (20 Fish)',
    color: 'enemy',
  },
  {
    id: 'train_medic',
    label: 'Medic',
    icon: '\u2764\uFE0F', // heart
    tooltip: 'Train Medic (15 Fish)',
    color: 'vine-highlight',
  },
  {
    id: 'train_scout',
    label: 'Scout',
    icon: '\u{1F441}\uFE0F', // eye
    tooltip: 'Train Scout (8 Fish)',
    color: 'scout',
  },
  {
    id: 'train_sapper',
    label: 'Sapper',
    icon: '\u{1F4A3}', // bomb
    tooltip: 'Train Sapper (25 Fish, 15 Rocks)',
    color: 'twig',
  },
  {
    id: 'train_saboteur',
    label: 'Saboteur',
    icon: '\u{1F5E1}\uFE0F', // dagger
    tooltip: 'Train Saboteur (20 Fish, 10 Rocks)',
    color: 'moss-bright',
  },
  {
    id: 'fortify',
    label: 'Fortify',
    icon: '\u{1F9F1}', // brick
    tooltip: 'Build Wall (costs Rocks)',
    color: 'twig',
  },
  {
    id: 'repair',
    label: 'Repair',
    icon: '\u{1F527}', // wrench
    tooltip: 'Repair Lodge (costs Logs)',
    color: 'otter',
  },
];

// ── Unit Options by Role ───────────────────────────────────────────

const GATHER_OPTIONS: RadialOption[] = [
  {
    id: 'cmd_gather',
    label: 'Gather',
    icon: '\u{1F33E}',
    tooltip: 'Send to resource',
    color: 'success',
  },
  { id: 'cmd_hold', label: 'Hold', icon: '\u270B', tooltip: 'Hold position', color: 'warning' },
  {
    id: 'cmd_patrol',
    label: 'Patrol',
    icon: '\u{1F6B6}',
    tooltip: 'Patrol between points',
    color: 'vine-base',
  },
  {
    id: 'cmd_return',
    label: 'Return',
    icon: '\u{1F3E0}',
    tooltip: 'Return to Lodge',
    color: 'otter',
  },
];

const COMBAT_OPTIONS: RadialOption[] = [
  {
    id: 'cmd_attack',
    label: 'Attack',
    icon: '\u2694\uFE0F',
    tooltip: 'Attack target',
    color: 'enemy',
  },
  {
    id: 'cmd_amove',
    label: 'A-Move',
    icon: '\u{1F5E1}\uFE0F',
    tooltip: 'Attack-move',
    color: 'enemy-light',
  },
  { id: 'cmd_hold', label: 'Hold', icon: '\u270B', tooltip: 'Hold position', color: 'warning' },
  {
    id: 'cmd_patrol',
    label: 'Patrol',
    icon: '\u{1F6B6}',
    tooltip: 'Patrol between points',
    color: 'vine-base',
  },
  {
    id: 'cmd_stance',
    label: 'Stance',
    icon: '\u{1F6E1}\uFE0F',
    tooltip: 'Cycle stance',
    color: 'moss-bright',
  },
];

const HEAL_OPTIONS: RadialOption[] = [
  {
    id: 'cmd_heal',
    label: 'Heal',
    icon: '\u2764\uFE0F',
    tooltip: 'Heal wounded ally',
    color: 'vine-highlight',
  },
  { id: 'cmd_hold', label: 'Hold', icon: '\u270B', tooltip: 'Hold position', color: 'warning' },
  {
    id: 'cmd_patrol',
    label: 'Patrol',
    icon: '\u{1F6B6}',
    tooltip: 'Patrol between points',
    color: 'vine-base',
  },
  {
    id: 'cmd_return',
    label: 'Return',
    icon: '\u{1F3E0}',
    tooltip: 'Return to Lodge',
    color: 'otter',
  },
];

const SCOUT_OPTIONS: RadialOption[] = [
  {
    id: 'cmd_scout',
    label: 'Scout',
    icon: '\u{1F441}\uFE0F',
    tooltip: 'Explore area',
    color: 'scout',
  },
  { id: 'cmd_hold', label: 'Hold', icon: '\u270B', tooltip: 'Hold position', color: 'warning' },
  {
    id: 'cmd_patrol',
    label: 'Patrol',
    icon: '\u{1F6B6}',
    tooltip: 'Patrol between points',
    color: 'vine-base',
  },
  {
    id: 'cmd_return',
    label: 'Return',
    icon: '\u{1F3E0}',
    tooltip: 'Return to Lodge',
    color: 'otter',
  },
];

/** Generic options for units without a specific role match. */
const GENERIC_OPTIONS: RadialOption[] = [
  {
    id: 'cmd_move',
    label: 'Move',
    icon: '\u{1F463}',
    tooltip: 'Move to position',
    color: 'success',
  },
  { id: 'cmd_hold', label: 'Hold', icon: '\u270B', tooltip: 'Hold position', color: 'warning' },
  {
    id: 'cmd_patrol',
    label: 'Patrol',
    icon: '\u{1F6B6}',
    tooltip: 'Patrol between points',
    color: 'vine-base',
  },
];

/** Map unit roles to their radial options. */
const ROLE_OPTIONS: Record<string, RadialOption[]> = {
  gather: GATHER_OPTIONS,
  combat: COMBAT_OPTIONS,
  heal: HEAL_OPTIONS,
  scout: SCOUT_OPTIONS,
};

/** Game state used to filter Lodge radial options. */
export interface RadialGameState {
  /** Current fish (clams) available */
  fish: number;
  /** Current rocks (pearls) available */
  rocks: number;
  /** Current logs (twigs) available */
  logs: number;
  /** Which panel unlock stage the player is at (1-6) */
  unlockStage: number;
  /** Whether Lodge is damaged (for repair option) */
  lodgeDamaged: boolean;
}

/**
 * Get the appropriate radial options for the current context.
 * Lodge options are filtered by resource availability and progression.
 */
export function getRadialOptions(
  mode: RadialMenuMode,
  unitRole: string | null,
  gameState?: RadialGameState,
): RadialOption[] {
  if (mode === 'lodge') {
    if (!gameState) return LODGE_OPTIONS;
    return LODGE_OPTIONS.filter((opt) => {
      switch (opt.id) {
        case 'train_gatherer':
          return gameState.fish >= 10;
        case 'train_fighter':
          return gameState.fish >= 20;
        case 'train_medic':
          return gameState.fish >= 15;
        case 'train_scout':
          return gameState.fish >= 8;
        case 'train_sapper':
          // Sapper needs rocks (panel 4/6 unlock = stage 5+)
          return gameState.unlockStage >= 5 && gameState.fish >= 25 && gameState.rocks >= 15;
        case 'train_saboteur':
          // Saboteur needs rocks
          return gameState.unlockStage >= 5 && gameState.fish >= 20 && gameState.rocks >= 10;
        case 'fortify':
          // Fortify needs rocks (panel 4/6)
          return gameState.unlockStage >= 5 && gameState.rocks >= 15;
        case 'repair':
          // Repair needs logs (panel 2+) and Lodge must be damaged
          return gameState.unlockStage >= 2 && gameState.logs >= 10 && gameState.lodgeDamaged;
        default:
          return true;
      }
    });
  }
  if (unitRole && ROLE_OPTIONS[unitRole]) return ROLE_OPTIONS[unitRole];
  return GENERIC_OPTIONS;
}

/**
 * Map an EntityKind numeric value to a v3 role string.
 * Uses the existing entity kinds to determine role.
 */
export function entityKindToRole(kind: number): string {
  // EntityKind values from types.ts
  switch (kind) {
    case 0:
      return 'gather'; // Gatherer
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
