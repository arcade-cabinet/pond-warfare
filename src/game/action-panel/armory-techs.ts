/**
 * Action Panel -- Armory Tech Buttons (v3.0 Stub)
 *
 * In v3.0 the in-match tech tree was removed — research moved to the
 * between-match upgrade web. This module returns an empty array so the
 * action panel renders without crashing.
 */

import type { GameWorld } from '@/ecs/world';
import type { ActionButtonDef } from '@/ui/action-panel';

export function buildArmoryTechButtons(_w: GameWorld): ActionButtonDef[] {
  return [];
}
