import { TRAIN_TIMER } from '@/constants';
import type { GameWorld } from '@/ecs/world';

export function getPlayerTrainTimer(world: GameWorld): number {
  return Math.max(1, Math.round(TRAIN_TIMER / Math.max(0.1, world.playerTrainSpeedMultiplier)));
}

export function getPlayerTrainProgress(world: GameWorld, remainingFrames: number): number {
  const totalFrames = getPlayerTrainTimer(world);
  return Math.max(0, Math.min(100, ((totalFrames - remainingFrames) / totalFrames) * 100));
}
