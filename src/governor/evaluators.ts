/**
 * Goal Evaluators — Score functions for the Governor brain.
 *
 * Each evaluator calculates a desirability score (0-1) based on
 * store signals, then sets the corresponding goal when selected.
 */

import { type GameEntity, GoalEvaluator } from 'yuka';
import { isWingBuilding } from '@/config/entity-defs';
import { EntityKind } from '@/types';
import * as store from '@/ui/store';
import { AttackGoal, MIN_ATTACK_ARMY } from './goals/attack-goal';
import { BuildGoal } from './goals/build-goal';
import { DefendGoal } from './goals/defend-goal';
import { findIdleGatherers, GatherGoal } from './goals/gather-goal';
import { TrainGoal } from './goals/train-goal';
import type { Governor } from './governor';

function hasBuilding(kind: EntityKind): boolean {
  return store.buildingRoster.value.some((b) => b.kind === kind);
}

/**
 * Check if a wing-type building is present. For wing buildings (Armory, etc.),
 * presence in buildingRoster means the wing is unlocked on the Lodge.
 */
function hasWingOrBuilding(kind: EntityKind): boolean {
  if (isWingBuilding(kind)) {
    // Wing buildings appear in buildingRoster when the Lodge wing is unlocked
    return store.buildingRoster.value.some((b) => b.kind === kind);
  }
  return hasBuilding(kind);
}

function combatUnitCount(): number {
  return store.unitRoster.value
    .filter((g) => g.role === 'combat')
    .reduce((sum, g) => sum + g.units.length, 0);
}

/** High score when idle gatherers exist — always beats Train to avoid idle waste. */
export class GatherEvaluator extends GoalEvaluator {
  override calculateDesirability(_owner: GameEntity): number {
    const idle = findIdleGatherers();
    if (idle.length === 0) return 0;
    return 0.85 + Math.min(idle.length * 0.03, 0.1);
  }

  override setGoal(owner: GameEntity): void {
    const gov = owner as Governor;
    gov.brain.clearSubgoals();
    gov.brain.addSubgoal(new GatherGoal(gov));
  }
}

/** High score when a needed building is missing. */
export class BuildEvaluator extends GoalEvaluator {
  override calculateDesirability(_owner: GameEntity): number {
    // Armory is a Lodge wing — check if it's unlocked rather than placed
    if (!hasWingOrBuilding(EntityKind.Armory) && store.fish.value >= 180 && store.logs.value >= 120)
      return 0.85;
    if (store.food.value >= store.maxFood.value - 1 && store.logs.value >= 75) return 0.75;
    if (store.baseUnderAttack.value && store.fish.value >= 200) return 0.8;
    return 0;
  }

  override setGoal(owner: GameEntity): void {
    const gov = owner as Governor;
    gov.brain.clearSubgoals();
    gov.brain.addSubgoal(new BuildGoal(gov));
  }
}

/** High score when army is small and resources are available. */
export class TrainEvaluator extends GoalEvaluator {
  override calculateDesirability(_owner: GameEntity): number {
    if (store.food.value >= store.maxFood.value) return 0;

    const gatherers = store.unitRoster.value
      .filter((g) => g.role === 'gatherer')
      .reduce((sum, g) => sum + g.units.length, 0);
    const idleGatherers = findIdleGatherers().length;

    // Need gatherers for economy — but don't train more if some are idle
    if (gatherers < 4) {
      if (idleGatherers > 0) return 0; // Let Gather goal assign them first
      if (store.fish.value >= 10) return 0.8;
    }

    // Need combat units — always desirable when economy is running
    const army = combatUnitCount();
    if (army < 6 && store.fish.value >= 20) return 0.75;

    // Keep training if we can afford it
    if (store.fish.value >= 20) return 0.5;
    return 0;
  }

  override setGoal(owner: GameEntity): void {
    const gov = owner as Governor;
    gov.brain.clearSubgoals();
    gov.brain.addSubgoal(new TrainGoal(gov));
  }
}

/** Very high score when base is under attack. */
export class DefendEvaluator extends GoalEvaluator {
  override calculateDesirability(_owner: GameEntity): number {
    if (!store.baseUnderAttack.value) return 0;
    return 0.95;
  }

  override setGoal(owner: GameEntity): void {
    const gov = owner as Governor;
    gov.brain.clearSubgoals();
    gov.brain.addSubgoal(new DefendGoal(gov));
  }
}

/** High score when army is large enough and no immediate threats. */
export class AttackEvaluator extends GoalEvaluator {
  override calculateDesirability(_owner: GameEntity): number {
    if (store.baseUnderAttack.value) return 0;
    const army = combatUnitCount();
    const safeAttackArmy = Math.max(MIN_ATTACK_ARMY + 2, 5);
    if (army < safeAttackArmy) return 0;
    return Math.min(0.4 + (army - safeAttackArmy) * 0.08, 0.85);
  }

  override setGoal(owner: GameEntity): void {
    const gov = owner as Governor;
    gov.brain.clearSubgoals();
    gov.brain.addSubgoal(new AttackGoal(gov));
  }
}
