/**
 * AI System - Enemy Training
 *
 * Army training queue management and counter-composition logic (task #13).
 * Replaces old free wave spawning with resource-based training.
 */

import { query } from 'bitecs';
import { resolvePersonality } from '@/config/ai-personalities';
import {
  ENEMY_GATOR_COST_CLAMS,
  ENEMY_GATOR_COST_TWIGS,
  ENEMY_LATE_GAME_FRAME,
  ENEMY_LATE_TRAIN_INTERVAL,
  ENEMY_MID_GAME_FRAME,
  ENEMY_SNAKE_COST_CLAMS,
  ENEMY_SNAKE_COST_TWIGS,
  ENEMY_TRAIN_CHECK_INTERVAL,
  ENEMY_TRAIN_TIME,
} from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  Sprite,
  TrainingQueue,
  trainingQueueSlots,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { triggerSpawnPop } from '@/rendering/animations';
import { EntityKind, Faction } from '@/types';
import { spawnDustBurst } from '@/utils/particles';
import type { SeededRandom } from '@/utils/random';
import { countPlayerUnitsOfKind, getEnemyNests } from './helpers';

/** Resource costs for all enemy-trainable unit types. */
const ENEMY_UNIT_COSTS: Partial<
  Record<EntityKind, { clams: number; twigs: number; weight: number }>
> = {
  [EntityKind.Gator]: { clams: ENEMY_GATOR_COST_CLAMS, twigs: ENEMY_GATOR_COST_TWIGS, weight: 10 },
  [EntityKind.Snake]: {
    clams: ENEMY_SNAKE_COST_CLAMS,
    twigs: ENEMY_SNAKE_COST_TWIGS,
    weight: 10,
  },
  [EntityKind.ArmoredGator]: { clams: 150, twigs: 80, weight: 6 },
  [EntityKind.VenomSnake]: { clams: 100, twigs: 50, weight: 7 },
  [EntityKind.SwampDrake]: { clams: 120, twigs: 60, weight: 5 },
  [EntityKind.SiegeTurtle]: { clams: 300, twigs: 200, weight: 3 },
  [EntityKind.AlphaPredator]: { clams: 500, twigs: 300, weight: 1 },
};

/** Melee-type enemy units (short range, high HP). */
const MELEE_KINDS = new Set([EntityKind.Gator, EntityKind.ArmoredGator]);
/** Ranged-type enemy units. */
const RANGED_KINDS = new Set([EntityKind.Snake, EntityKind.VenomSnake, EntityKind.SwampDrake]);
/** Siege-type enemy units. */
const SIEGE_KINDS = new Set([EntityKind.SiegeTurtle]);

/**
 * Pick a unit kind from unlocked units using weighted random selection.
 * Higher-tier units have lower weights, so they train less frequently.
 * The trainingPreference param biases selection toward a unit category.
 */
function pickEnemyUnit(
  rng: SeededRandom,
  unlockedUnits: EntityKind[],
  trainingPreference: 'melee' | 'ranged' | 'balanced' | 'siege' = 'balanced',
): EntityKind {
  let totalWeight = 0;
  for (const kind of unlockedUnits) {
    let w = ENEMY_UNIT_COSTS[kind]?.weight ?? 0;
    // Bias weight by personality preference
    if (trainingPreference === 'melee' && MELEE_KINDS.has(kind)) w *= 2;
    else if (trainingPreference === 'ranged' && RANGED_KINDS.has(kind)) w *= 2;
    else if (trainingPreference === 'siege' && SIEGE_KINDS.has(kind)) w *= 3;
    totalWeight += w;
  }
  if (totalWeight === 0) return EntityKind.Gator;

  let roll = rng.next() * totalWeight;
  for (const kind of unlockedUnits) {
    let w = ENEMY_UNIT_COSTS[kind]?.weight ?? 0;
    if (trainingPreference === 'melee' && MELEE_KINDS.has(kind)) w *= 2;
    else if (trainingPreference === 'ranged' && RANGED_KINDS.has(kind)) w *= 2;
    else if (trainingPreference === 'siege' && SIEGE_KINDS.has(kind)) w *= 3;
    roll -= w;
    if (roll <= 0) return kind;
  }
  return unlockedUnits[0];
}

/**
 * Enemy army training via TrainingQueue (task #13).
 * Adapts unit composition to counter the player's army.
 */
export function enemyTrainingTick(world: GameWorld): void {
  const isPeaceful = world.frameCount < world.peaceTimer;
  if (isPeaceful) return;
  // Scale training frequency: faster checks in late game and on hard difficulty
  let trainInterval =
    world.frameCount >= ENEMY_LATE_GAME_FRAME
      ? ENEMY_LATE_TRAIN_INTERVAL
      : ENEMY_TRAIN_CHECK_INTERVAL;
  if (world.difficulty === 'hard') {
    trainInterval = Math.floor(trainInterval * 0.75);
  } else if (world.difficulty === 'nightmare') {
    trainInterval = Math.floor(trainInterval * 0.5);
  } else if (world.difficulty === 'ultraNightmare') {
    trainInterval = Math.floor(trainInterval * 0.33);
  } else if (world.difficulty === 'easy') {
    trainInterval = Math.floor(trainInterval * 1.25);
  }
  // AI personality train speed multiplier
  const pConfig = resolvePersonality(world.aiPersonality, world.frameCount);
  trainInterval = Math.max(30, Math.round(trainInterval / pConfig.trainSpeedMult));
  if (world.frameCount % trainInterval !== 0) return;

  const nestEids = getEnemyNests(world);
  if (nestEids.length === 0) return;

  const res = world.enemyResources;

  // Analyze player army to decide composition
  const playerSnipers = countPlayerUnitsOfKind(world, EntityKind.Sniper);
  const playerBrawlers = countPlayerUnitsOfKind(world, EntityKind.Brawler);

  // Counter logic: gators counter brawlers, snakes counter snipers
  // Default to 50/50 if player has no army
  let _gatorWeight = 0.5;
  const totalPlayerCombat = playerSnipers + playerBrawlers;
  if (totalPlayerCombat > 0) {
    // More snipers -> train more gators (gators are strong vs brawlers, but snakes counter snipers)
    // Actually from DAMAGE_MULTIPLIERS: Snake is strong vs Sniper, Gator is strong vs Brawler
    const sniperRatio = playerSnipers / totalPlayerCombat;
    // If player has many snipers, train more snakes (which counter snipers)
    _gatorWeight = 1.0 - sniperRatio * 0.7; // Bias toward snakes when snipers dominate
  }

  // Queue training at each nest that isn't already training
  // Early game (before mid-game): only train 1 unit per check, max 1 in queue
  // Mid game: normal training (max 2 in queue)
  // Late game: aggressive training (max 3 in queue)
  const maxQueueSize =
    world.frameCount >= ENEMY_LATE_GAME_FRAME
      ? 3
      : world.frameCount >= ENEMY_MID_GAME_FRAME
        ? 2
        : 1;
  for (const nestEid of nestEids) {
    const slots = trainingQueueSlots.get(nestEid) ?? [];
    if (slots.length >= maxQueueSize) continue;

    // Decide what to train from unlocked units (evolution system + personality bias)
    const personality = resolvePersonality(world.aiPersonality, world.frameCount);
    const unitKind = pickEnemyUnit(
      world.gameRng,
      world.enemyEvolution.unlockedUnits,
      personality.trainingPreference,
    );
    const costs = ENEMY_UNIT_COSTS[unitKind];
    if (!costs) continue;
    const costClams = costs.clams;
    const costTwigs = costs.twigs;

    if (res.clams < costClams || res.twigs < costTwigs) continue;

    // Deduct cost and queue
    res.clams -= costClams;
    res.twigs -= costTwigs;

    slots.push(unitKind);
    trainingQueueSlots.set(nestEid, slots);
    TrainingQueue.count[nestEid] = slots.length;

    // Start timer if this is the first in queue
    if (slots.length === 1) {
      TrainingQueue.timer[nestEid] = ENEMY_TRAIN_TIME;
    }
  }
}

/**
 * Process enemy training queues - tick timers and spawn units.
 * Mirrors the player trainingSystem but for enemy nests.
 */
export function enemyTrainingQueueProcess(world: GameWorld): void {
  const buildings = query(world.ecs, [
    Position,
    TrainingQueue,
    Building,
    FactionTag,
    IsBuilding,
    Health,
    Sprite,
  ]);

  for (let i = 0; i < buildings.length; i++) {
    const eid = buildings[i];
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (Health.current[eid] <= 0) continue;
    if (Building.progress[eid] < 100) continue;

    const slots = trainingQueueSlots.get(eid) ?? [];
    if (slots.length === 0) continue;

    // Nest production multiplier: spawn multiple units per cycle in late game
    const prodMult = world.enemyEvolution.nestProductionMultiplier;
    // Nest build rate modifier from difficulty (lower = slower production)
    const buildRateMult = world.nestBuildRateMult ?? 1.0;
    // When multiplier >= 5 (continuous mode), use very short train timer
    const baseTrainTime =
      prodMult >= 5 ? Math.max(30, Math.floor(ENEMY_TRAIN_TIME / 4)) : ENEMY_TRAIN_TIME;
    const effectiveTrainTime = Math.round(baseTrainTime / buildRateMult);

    TrainingQueue.timer[eid]--;
    if (TrainingQueue.timer[eid] <= 0) {
      const unitKind = slots[0] as EntityKind;

      const bx = Position.x[eid];
      const by = Position.y[eid];
      const spriteH = Sprite.height[eid];

      // Spawn 1 unit per cycle normally, or up to prodMult units in late game
      const spawnCount = Math.min(prodMult, slots.length);
      for (let s = 0; s < spawnCount; s++) {
        const kind = s === 0 ? unitKind : (slots[s] as EntityKind);
        const sx = bx + (world.gameRng.next() > 0.5 ? 1 : -1) * (30 + s * 10);
        const sy = by + spriteH / 2 + 20 + s * 5;

        const newEid = spawnEntity(world, kind, sx, sy, Faction.Enemy);
        if (newEid < 0) break;

        // Spawn pop animation + dust particles
        triggerSpawnPop(newEid);
        spawnDustBurst(world, sx, sy);
      }

      // Shift queue by the number actually spawned
      for (let s = 0; s < spawnCount; s++) {
        slots.shift();
      }
      trainingQueueSlots.set(eid, slots);
      TrainingQueue.count[eid] = slots.length;

      if (slots.length > 0) {
        TrainingQueue.timer[eid] = effectiveTrainTime;
      }
    }
  }
}
