/**
 * Roster Types
 *
 * Type definitions for the Forces and Buildings roster data used by the
 * Command Center panel. Extracted from store.ts to keep both files under
 * the 300 LOC limit.
 */

import type { EntityKind } from '@/types';

/** Describes what a unit is currently doing, derived from UnitState + context. */
export type UnitTask =
  | 'idle'
  | 'gathering-fish'
  | 'gathering-logs'
  | 'gathering-rocks'
  | 'building'
  | 'moving'
  | 'attacking'
  | 'defending'
  | 'patrolling'
  | 'healing'
  | 'scouting'
  | 'dead';

/** A single unit's data for the Forces tab roster display. */
export interface RosterUnit {
  eid: number;
  kind: EntityKind;
  label?: string;
  task: UnitTask;
  targetName: string;
  hp: number;
  maxHp: number;
  hasOverride: boolean;
}

/** Logical role grouping for the Forces tab. */
export type UnitRole = 'generalist' | 'combat' | 'support' | 'recon' | 'commander';

/** A group of units sharing the same role, with aggregate idle count. */
export interface RosterGroup {
  role: UnitRole;
  units: RosterUnit[];
  idleCount: number;
  autoEnabled: boolean;
}

/** A single building's data for the Buildings tab. */
export interface RosterBuilding {
  eid: number;
  kind: EntityKind;
  hp: number;
  maxHp: number;
  queueItems: string[];
  queueProgress: number;
  canTrain: EntityKind[];
}
