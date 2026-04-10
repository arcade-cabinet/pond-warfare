import { TRAIN_TIMER } from '@/constants';
import type { GameWorld } from '@/ecs/world';
import { isMudpawKind } from '@/game/live-unit-kinds';
import type { EntityKind } from '@/types';

export function getPlayerTrainTimer(world: GameWorld, kind?: EntityKind): number {
  const speedMultiplier =
    kind != null && isMudpawKind(kind) ? 1 : Math.max(0.1, world.playerTrainSpeedMultiplier);
  return Math.max(1, Math.round(TRAIN_TIMER / speedMultiplier));
}

export function getPlayerTrainProgress(
  world: GameWorld,
  remainingFrames: number,
  kind?: EntityKind,
): number {
  const totalFrames = getPlayerTrainTimer(world, kind);
  return Math.max(0, Math.min(100, ((totalFrames - remainingFrames) / totalFrames) * 100));
}
