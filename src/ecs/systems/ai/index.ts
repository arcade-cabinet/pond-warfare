/**
 * AI System
 *
 * Enemy AI with resource-based economy. Replaces the old fixed-timer wave
 * spawning with intelligent decision-making:
 *
 * 1. **Enemy harvester spawning** (from task #11): nests spawn harvester units to collect
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
import { enemyCommanderTick } from './enemy-commander';
import { bossWaveLogic, nestDefenseReinforcement } from './enemy-defense';
import { enemyEconomyTick } from './enemy-economy';
import { enemyHealerTick } from './enemy-healer';
import { enemyRaiderTick } from './enemy-raider';
import { enemySapperTick } from './enemy-sapper';
import { enemyTrainingQueueProcess, enemyTrainingTick } from './enemy-training';

export function aiSystem(world: GameWorld): void {
  enemyEconomyTick(world);
  enemyBuildingTick(world);
  enemyTrainingTick(world);
  enemyTrainingQueueProcess(world);
  enemyCombatTick(world);
  enemyRaiderTick(world);
  enemyHealerTick(world);
  enemySapperTick(world);
  enemyCommanderTick(world);
  nestDefenseReinforcement(world);
  bossWaveLogic(world);
}

export { enemyBuildingTick } from './enemy-building';
export { enemyCombatTick } from './enemy-combat';
export { enemyCommanderTick } from './enemy-commander';
export { bossWaveLogic, nestDefenseReinforcement } from './enemy-defense';
// Re-export sub-module functions for direct access if needed
export { enemyEconomyTick } from './enemy-economy';
export { enemyHealerTick } from './enemy-healer';
export { enemyRaiderTick } from './enemy-raider';
export { enemySapperTick } from './enemy-sapper';
export { enemyTrainingQueueProcess, enemyTrainingTick } from './enemy-training';
export {
  countEnemyArmy,
  countPlayerUnitsOfKind,
  findBuildPosition,
  findDamagedEnemyUnits,
  findNearestEntity,
  findPlayerFortifications,
  findPlayerLodge,
  findResourceNodes,
  findWeakestPlayerBuilding,
  getEnemyArmyUnits,
  getEnemyNests,
  startEnemyConstruction,
} from './helpers';
