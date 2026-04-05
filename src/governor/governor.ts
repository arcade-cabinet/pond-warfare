/**
 * Governor — Yuka-driven AI player for Pond Warfare.
 *
 * Plays the game the same way a human would: reads from UI signals
 * (unitRoster, buildingRoster, resources) and interacts through the
 * same programmatic APIs the accordion UI uses. Uses Yuka's Think/Goal
 * system to pick the highest-scoring action each tick.
 *
 * The governor does NOT:
 * - Read from game.world directly (except through store signals)
 * - Query ECS components directly
 * - Manipulate the DOM
 * - Have god-mode knowledge
 */

import { GameEntity, Think } from 'yuka';
import {
  AttackEvaluator,
  BuildEvaluator,
  DefendEvaluator,
  GatherEvaluator,
  TrainEvaluator,
} from './evaluators';

/** How many game frames between brain ticks. */
const THINK_INTERVAL = 120;

/**
 * GovernorBrain — Yuka Think instance that arbitrates between goals.
 *
 * Each evaluator scores how desirable its goal is (0-1) based on
 * the current store signals. The highest-scoring goal executes.
 */
class GovernorBrain extends Think {
  constructor(owner: GameEntity) {
    super(owner);
    this.addEvaluator(new GatherEvaluator());
    this.addEvaluator(new BuildEvaluator());
    this.addEvaluator(new TrainEvaluator());
    this.addEvaluator(new DefendEvaluator());
    this.addEvaluator(new AttackEvaluator());
  }
}

/**
 * Governor — the AI player entity.
 *
 * Extends Yuka GameEntity so it can own a Think brain.
 * Call tick() each frame from the game loop.
 */
export class Governor extends GameEntity {
  readonly brain: GovernorBrain;
  private frameCounter = 0;
  private _enabled = false;

  constructor() {
    super();
    this.brain = new GovernorBrain(this);
  }

  /** Enable or disable the governor. */
  get enabled(): boolean {
    return this._enabled;
  }

  set enabled(value: boolean) {
    this._enabled = value;
    if (value) {
      this.frameCounter = 0;
    }
  }

  /**
   * Tick the governor brain. Call once per game frame.
   * The brain only arbitrates every THINK_INTERVAL frames to avoid
   * spamming actions every single frame.
   */
  tick(): void {
    if (!this._enabled) return;

    this.frameCounter++;
    if (this.frameCounter < THINK_INTERVAL) return;
    this.frameCounter = 0;

    this.brain.arbitrate();
    this.brain.execute();
  }

  /** Reset the governor state (e.g., on new game). */
  reset(): void {
    this.frameCounter = 0;
    this.brain.clearSubgoals();
  }

  /** Get the think interval for testing. */
  static get THINK_INTERVAL(): number {
    return THINK_INTERVAL;
  }
}
