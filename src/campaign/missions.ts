/**
 * Campaign Mission Definitions — Re-export barrel
 *
 * Types live in mission-types.ts, mission data in mission-defs.ts.
 */

export { BRANCH_MISSIONS, CAMPAIGN_MISSIONS } from './mission-defs';
export type { MissionDef, MissionDialogue, MissionObjective, ObjectiveType } from './mission-types';
export { EK } from './mission-types';

import { CAMPAIGN_MISSIONS } from './mission-defs';
import type { MissionDef } from './mission-types';

/** Look up a mission by its string ID. */
export function getMission(id: string): MissionDef | undefined {
  return CAMPAIGN_MISSIONS.find((m) => m.id === id);
}
