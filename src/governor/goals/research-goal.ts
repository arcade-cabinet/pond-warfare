/**
 * ResearchGoal — Stub (v3.0)
 *
 * In-game research was removed in v3.0. This goal always fails immediately
 * so the governor's Think brain moves on to higher-scoring goals.
 * Kept to avoid breaking the Yuka goal/evaluator wiring.
 */

import { Goal } from 'yuka';

export class ResearchGoal extends Goal {
  override activate(): void {
    // No research available in v3.0 — always fail so brain picks another goal.
    this.status = Goal.STATUS.FAILED;
  }

  override execute(): void {
    this.status = Goal.STATUS.COMPLETED;
  }

  override terminate(): void {}
}
