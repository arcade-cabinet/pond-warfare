/**
 * Goal Evaluators — Score functions for the Governor brain.
 *
 * Each evaluator calculates a desirability score (0-1) based on
 * store signals, then sets the corresponding goal when selected.
 */

import { type GameEntity, GoalEvaluator } from 'yuka';
import { EntityKind } from '@/types';
import * as store from '@/ui/store';
import { AttackGoal, MIN_ATTACK_ARMY } from './goals/attack-goal';
import { BuildGoal } from './goals/build-goal';
import { DefendGoal } from './goals/defend-goal';
import { findIdleGatherers, GatherGoal } from './goals/gather-goal';
import { ResearchGoal } from './goals/research-goal';
import { TrainGoal } from './goals/train-goal';
import type { Governor } from './governor';

function hasBuilding(kind: EntityKind): boolean {
  return store.buildingRoster.value.some((b) => b.kind === kind);
}

function combatUnitCount(): number {
  return store.unitRoster.value
    .filter((g) => g.role === 'combat')
    .reduce((sum, g) => sum + g.units.length, 0);
}

/** High score when idle gatherers exist. */
export class GatherEvaluator extends GoalEvaluator {
  override calculateDesirability(_owner: GameEntity): number {
    const idle = findIdleGatherers();
    if (idle.length === 0) return 0;
    return 0.7 + Math.min(idle.length * 0.05, 0.3);
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
    if (!hasBuilding(EntityKind.Armory) && store.clams.value >= 180) return 0.85;
    if (store.food.value >= store.maxFood.value - 1 && store.twigs.value >= 75) return 0.75;
    if (store.baseUnderAttack.value && store.clams.value >= 200) return 0.8;
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
    if (gatherers < 4 && store.clams.value >= 50) return 0.8;
    if (hasBuilding(EntityKind.Armory) && store.clams.value >= 100) {
      return combatUnitCount() < 6 ? 0.7 : 0.5;
    }
    return 0;
  }

  override setGoal(owner: GameEntity): void {
    const gov = owner as Governor;
    gov.brain.clearSubgoals();
    gov.brain.addSubgoal(new TrainGoal(gov));
  }
}

/**
 * Research evaluator -- always returns 0 in v3.0.
 *
 * In-game research was removed in v3.0 (TECH_UPGRADES is empty,
 * canResearch always returns false). This evaluator is kept so the
 * governor brain wiring stays intact for future reintroduction.
 */
export class ResearchEvaluator extends GoalEvaluator {
  override calculateDesirability(_owner: GameEntity): number {
    // v3.0: no in-game research available -- always return 0
    return 0;
  }

  override setGoal(owner: GameEntity): void {
    const gov = owner as Governor;
    gov.brain.clearSubgoals();
    gov.brain.addSubgoal(new ResearchGoal(gov));
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
    if (army < MIN_ATTACK_ARMY) return 0;
    return Math.min(0.6 + (army - MIN_ATTACK_ARMY) * 0.05, 0.9);
  }

  override setGoal(owner: GameEntity): void {
    const gov = owner as Governor;
    gov.brain.clearSubgoals();
    gov.brain.addSubgoal(new AttackGoal(gov));
  }
}
