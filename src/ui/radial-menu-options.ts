/**
 * Radial Menu Option Definitions (v3.0 — US9)
 *
 * Defines what options appear in the radial menu based on context:
 * - Lodge: manual training options + fortify + repair
 * - Unit (by role): role-specific actions
 *
 * Each option has an id (dispatched as action), label, icon, color, and
 * optional disabled state.
 */

// Re-export entityKindToRole from extracted module for backward compatibility
export { entityKindToRole } from './radial-entity-roles';

export type RadialMenuMode = 'lodge' | 'unit';
export type RadialUnitRole =
  | 'generalist'
  | 'combat'
  | 'support'
  | 'recon'
  | 'gather'
  | 'heal'
  | 'scout';

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
    id: 'train_mudpaw',
    label: 'Mudpaw',
    icon: '\u{1F9A6}',
    tooltip: 'Train Mudpaw (10 Fish)',
    color: 'success',
  },
  {
    id: 'train_medic',
    label: 'Medic',
    icon: '\u2764\uFE0F', // heart
    tooltip: 'Train Medic (15 Fish)',
    color: 'vine-highlight',
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

const GENERALIST_OPTIONS: RadialOption[] = [
  {
    id: 'cmd_gather',
    label: 'Gather',
    icon: '\u{1F33E}',
    tooltip: 'Send to resource',
    color: 'success',
  },
  {
    id: 'cmd_attack',
    label: 'Attack',
    icon: '\u2694\uFE0F',
    tooltip: 'Attack target',
    color: 'enemy',
  },
  {
    id: 'cmd_scout',
    label: 'Recon',
    icon: '\u{1F441}\uFE0F',
    tooltip: 'Survey area',
    color: 'recon',
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

const RECON_OPTIONS: RadialOption[] = [
  {
    id: 'cmd_scout',
    label: 'Recon',
    icon: '\u{1F441}\uFE0F',
    tooltip: 'Survey area',
    color: 'recon',
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
const ROLE_OPTIONS: Record<RadialUnitRole, RadialOption[]> = {
  generalist: GENERALIST_OPTIONS,
  combat: COMBAT_OPTIONS,
  support: HEAL_OPTIONS,
  recon: RECON_OPTIONS,
  gather: GATHER_OPTIONS,
  heal: HEAL_OPTIONS,
  scout: RECON_OPTIONS,
};

/** Game state used to filter Lodge radial options. */
export interface RadialGameState {
  /** Current fish available */
  fish: number;
  /** Current rocks available */
  rocks: number;
  /** Current logs available */
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
        case 'train_mudpaw':
          return gameState.fish >= 10;
        case 'train_medic':
          return gameState.unlockStage >= 2 && gameState.fish >= 15;
        case 'train_sapper':
          return gameState.unlockStage >= 5 && gameState.fish >= 25 && gameState.rocks >= 15;
        case 'train_saboteur':
          return gameState.unlockStage >= 6 && gameState.fish >= 20 && gameState.rocks >= 10;
        case 'fortify':
          return gameState.unlockStage >= 5 && gameState.rocks >= 15;
        case 'repair':
          return gameState.unlockStage >= 2 && gameState.logs >= 30 && gameState.lodgeDamaged;
        default:
          return true;
      }
    });
  }
  if (unitRole && unitRole in ROLE_OPTIONS) return ROLE_OPTIONS[unitRole as RadialUnitRole];
  return GENERIC_OPTIONS;
}
