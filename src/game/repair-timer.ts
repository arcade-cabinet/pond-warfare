import { REPAIR_TIMER } from '@/constants';
import type { GameWorld } from '@/ecs/world';

export function getPlayerRepairTimer(world: GameWorld): number {
  return Math.max(1, Math.round(REPAIR_TIMER / Math.max(0.1, world.playerRepairSpeedMultiplier)));
}
