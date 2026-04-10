import { ENTITY_DEFS } from '@/config/entity-defs';
import type { TrainingQueueCost } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import type { EntityKind } from '@/types';

function getDiscountedCost(baseCost: number, multiplier: number): number {
  if (baseCost <= 0) return 0;
  const safeMultiplier = Number.isFinite(multiplier) && multiplier > 0 ? multiplier : 1;
  if (safeMultiplier >= 1) return baseCost;
  return Math.max(0, Math.round(baseCost * safeMultiplier));
}

export function getPlayerTrainingCost(world: GameWorld, kind: EntityKind): TrainingQueueCost {
  const def = ENTITY_DEFS[kind];
  return {
    fish: getDiscountedCost(def.fishCost ?? 0, world.playerUnitCostMultiplier),
    logs: getDiscountedCost(def.logCost ?? 0, world.playerUnitCostMultiplier),
    rocks: getDiscountedCost(def.rockCost ?? 0, world.playerUnitCostMultiplier),
    food: def.foodCost ?? 1,
  };
}
