/**
 * AI System
 *
 * Enemy AI with resource-based economy. Replaces the old fixed-timer wave
 * spawning with intelligent decision-making:
 *
 * 1. **Gatherer spawning** (from task #11): nests spawn gatherers to collect
 *    resources that feed the enemy economy.
 *
 * 2. **Building construction** (task #12): AI spends resources to build Towers,
 *    Burrows, and expansion Nests near existing nests.
 *
 * 3. **Army training** (task #13): Nests train combat units using TrainingQueue,
 *    with composition adapting to counter the player's army.
 *
 * 4. **Attack decision-making** (task #14): Enemy attacks when army exceeds a
 *    threshold, targets weakest player building, groups before attacking,
 *    retreats damaged units, and sends scouts.
 *
 * 5. **Nest defense**: when a nest drops below 50% HP, spawn defenders
 *    (unchanged from original, but now costs resources).
 *
 * 6. **Boss waves**: after sufficient time, boss crocs still spawn periodically.
 */

import type { GameWorld } from '@/ecs/world';
import { enemyBuildingTick } from './enemy-building';
import { enemyCombatTick } from './enemy-combat';
import { enemyEconomyTick } from './enemy-economy';
import {
  bossWaveLogic,
  enemyTrainingQueueProcess,
  enemyTrainingTick,
  nestDefenseReinforcement,
} from './enemy-training';

export function aiSystem(world: GameWorld): void {
  enemyEconomyTick(world);
  enemyBuildingTick(world);
  enemyTrainingTick(world);
  enemyTrainingQueueProcess(world);
  enemyCombatTick(world);
  nestDefenseReinforcement(world);
  bossWaveLogic(world);
}

// Re-export sub-module functions for direct access if needed
export { enemyEconomyTick } from './enemy-economy';
export { enemyBuildingTick } from './enemy-building';
export { enemyTrainingTick, enemyTrainingQueueProcess, nestDefenseReinforcement, bossWaveLogic } from './enemy-training';
export { enemyCombatTick } from './enemy-combat';
