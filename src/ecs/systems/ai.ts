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

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  ENEMY_ARMY_ATTACK_THRESHOLD,
  ENEMY_ATTACK_CHECK_INTERVAL,
  ENEMY_BUILD_CHECK_INTERVAL,
  ENEMY_BUILD_RADIUS,
  ENEMY_BURROW_COST_CLAMS,
  ENEMY_BURROW_COST_TWIGS,
  ENEMY_GATHERER_COST,
  ENEMY_GATHERER_RADIUS,
  ENEMY_GATHERER_SPAWN_INTERVAL,
  ENEMY_GATOR_COST_CLAMS,
  ENEMY_GATOR_COST_TWIGS,
  ENEMY_MAX_GATHERERS_PER_NEST,
  ENEMY_NEST_COST_CLAMS,
  ENEMY_NEST_COST_TWIGS,
  ENEMY_RALLY_RADIUS,
  ENEMY_RETREAT_HP_PERCENT,
  ENEMY_SCOUT_INTERVAL,
  ENEMY_SNAKE_COST_CLAMS,
  ENEMY_SNAKE_COST_TWIGS,
  ENEMY_TOWER_COST_CLAMS,
  ENEMY_TOWER_COST_TWIGS,
  ENEMY_TRAIN_CHECK_INTERVAL,
  ENEMY_TRAIN_TIME,
  TILE_SIZE,
  WAVE_INTERVAL,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  Carrying,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Resource,
  Sprite,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { canPlaceBuilding } from '@/input/selection';
import { EntityKind, Faction, UnitState } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Get all alive enemy nests */
function getEnemyNests(world: GameWorld): number[] {
  const nests = query(world.ecs, [Position, Health, EntityTypeTag, FactionTag, IsBuilding]);
  const result: number[] = [];
  for (let i = 0; i < nests.length; i++) {
    const eid = nests[i];
    if (
      EntityTypeTag.kind[eid] === EntityKind.PredatorNest &&
      FactionTag.faction[eid] === Faction.Enemy &&
      Health.current[eid] > 0 &&
      Building.progress[eid] >= 100
    ) {
      result.push(eid);
    }
  }
  return result;
}

/** Find the player lodge (first alive one) */
function findPlayerLodge(world: GameWorld): number {
  const buildings = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, IsBuilding]);
  for (let i = 0; i < buildings.length; i++) {
    const eid = buildings[i];
    if (
      EntityTypeTag.kind[eid] === EntityKind.Lodge &&
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0
    ) {
      return eid;
    }
  }
  return -1;
}

/** Count alive enemy combat units (not gatherers, not buildings) */
function countEnemyArmy(world: GameWorld): number {
  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  let count = 0;
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (hasComponent(world.ecs, eid, IsResource)) continue;
    if (Health.current[eid] <= 0) continue;
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    if (kind === EntityKind.Gatherer) continue;
    count++;
  }
  return count;
}

/** Get alive enemy combat units */
function getEnemyArmyUnits(world: GameWorld): number[] {
  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  const result: number[] = [];
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (hasComponent(world.ecs, eid, IsResource)) continue;
    if (Health.current[eid] <= 0) continue;
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    if (kind === EntityKind.Gatherer) continue;
    result.push(eid);
  }
  return result;
}

/** Count player units of a specific kind */
function countPlayerUnitsOfKind(world: GameWorld, targetKind: EntityKind): number {
  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  let count = 0;
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (EntityTypeTag.kind[eid] === targetKind) count++;
  }
  return count;
}

/** Count alive enemy buildings of a specific kind */
function _countEnemyBuildings(world: GameWorld, kind: EntityKind): number {
  const buildings = query(world.ecs, [Position, Health, EntityTypeTag, FactionTag, IsBuilding]);
  let count = 0;
  for (let i = 0; i < buildings.length; i++) {
    const eid = buildings[i];
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (EntityTypeTag.kind[eid] !== kind) continue;
    if (Health.current[eid] <= 0) continue;
    count++;
  }
  return count;
}

/** Find a valid placement position near a nest */
function findBuildPosition(
  world: GameWorld,
  nestEid: number,
  kind: EntityKind,
): { x: number; y: number } | null {
  const nx = Position.x[nestEid];
  const ny = Position.y[nestEid];
  const def = ENTITY_DEFS[kind];
  const spriteW = def.spriteSize * def.spriteScale;
  const spriteH = def.spriteSize * def.spriteScale;

  // Try random positions near the nest, snapping to tile grid
  for (let attempt = 0; attempt < 12; attempt++) {
    const angle = Math.random() * Math.PI * 2;
    const dist = 80 + Math.random() * ENEMY_BUILD_RADIUS;
    const bx = Math.round((nx + Math.cos(angle) * dist) / TILE_SIZE) * TILE_SIZE;
    const by = Math.round((ny + Math.sin(angle) * dist) / TILE_SIZE) * TILE_SIZE;

    if (canPlaceBuilding(world, bx, by, spriteW, spriteH)) {
      return { x: bx, y: by };
    }
  }
  return null;
}

/**
 * Set a newly spawned building to 1 HP / 1% progress (construction site)
 * and assign nearby idle enemy gatherers to build it.
 */
function startEnemyConstruction(world: GameWorld, buildingEid: number): void {
  // Set building to construction state (1 HP, 1% progress)
  Building.progress[buildingEid] = 1;
  Health.current[buildingEid] = 1;

  const bx = Position.x[buildingEid];
  const by = Position.y[buildingEid];

  // Find nearby idle enemy gatherers and assign them to build
  const allUnits = query(world.ecs, [
    Position,
    Health,
    FactionTag,
    EntityTypeTag,
    UnitStateMachine,
  ]);
  let assigned = 0;
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (EntityTypeTag.kind[eid] !== EntityKind.Gatherer) continue;
    if (Health.current[eid] <= 0) continue;

    const state = UnitStateMachine.state[eid] as UnitState;
    // Only redirect idle gatherers or those returning resources
    if (state !== UnitState.Idle && state !== UnitState.ReturnMove) continue;

    const dx = Position.x[eid] - bx;
    const dy = Position.y[eid] - by;
    const dSq = dx * dx + dy * dy;
    if (dSq > 600 * 600) continue; // Only nearby gatherers

    UnitStateMachine.targetEntity[eid] = buildingEid;
    UnitStateMachine.targetX[eid] = bx;
    UnitStateMachine.targetY[eid] = by;
    UnitStateMachine.state[eid] = UnitState.BuildMove;

    const speed = Velocity.speed[eid] || ENTITY_DEFS[EntityKind.Gatherer]?.speed || 2.0;
    world.yukaManager.addUnit(eid, Position.x[eid], Position.y[eid], speed, bx, by);

    assigned++;
    if (assigned >= 2) break; // Send at most 2 gatherers per construction
  }
}

/** Find the weakest alive player building */
function findWeakestPlayerBuilding(world: GameWorld): number {
  const buildings = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, IsBuilding]);
  let weakest = -1;
  let lowestHp = Infinity;
  for (let i = 0; i < buildings.length; i++) {
    const eid = buildings[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (Health.current[eid] < lowestHp) {
      lowestHp = Health.current[eid];
      weakest = eid;
    }
  }
  return weakest;
}

// ---------------------------------------------------------------------------
// Main AI System
// ---------------------------------------------------------------------------

export function aiSystem(world: GameWorld): void {
  const isPeaceful = world.frameCount < world.peaceTimer;

  // --- Enemy economy: gatherer spawning ---
  enemyGathererSpawning(world, isPeaceful);

  // --- Enemy building construction ---
  enemyBuildingConstruction(world, isPeaceful);

  // --- Enemy army training (replaces old wave timer) ---
  enemyArmyTraining(world, isPeaceful);

  // --- Enemy training queue processing ---
  enemyTrainingQueueProcess(world);

  // --- Enemy attack decision-making ---
  enemyAttackDecision(world, isPeaceful);

  // --- Retreat damaged units ---
  enemyRetreatLogic(world);

  // --- Scout logic ---
  enemyScoutLogic(world, isPeaceful);

  // --- Nest defense reinforcement ---
  nestDefenseReinforcement(world);

  // --- Boss wave (kept from original) ---
  bossWaveLogic(world, isPeaceful);
}

// ---------------------------------------------------------------------------
// Sub-systems
// ---------------------------------------------------------------------------

/** Spawn enemy gatherers at nests to collect resources (task #11) */
function enemyGathererSpawning(world: GameWorld, isPeaceful: boolean): void {
  if (isPeaceful) return;
  if (world.frameCount % ENEMY_GATHERER_SPAWN_INTERVAL !== 0) return;

  const nestEids = getEnemyNests(world);
  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, Carrying]);
  const resourceNodes = query(world.ecs, [Position, Resource, IsResource]);

  for (const nestEid of nestEids) {
    if (world.enemyResources.clams < ENEMY_GATHERER_COST) continue;

    const nx = Position.x[nestEid];
    const ny = Position.y[nestEid];

    // Count nearby enemy gatherers
    let gathererCount = 0;
    for (let j = 0; j < allUnits.length; j++) {
      const u = allUnits[j];
      if (FactionTag.faction[u] !== Faction.Enemy) continue;
      if (EntityTypeTag.kind[u] !== EntityKind.Gatherer) continue;
      if (hasComponent(world.ecs, u, IsBuilding)) continue;
      if (Health.current[u] <= 0) continue;

      const dx = Position.x[u] - nx;
      const dy = Position.y[u] - ny;
      const dSq = dx * dx + dy * dy;
      if (dSq < ENEMY_GATHERER_RADIUS * ENEMY_GATHERER_RADIUS) {
        gathererCount++;
      }
    }

    if (gathererCount >= ENEMY_MAX_GATHERERS_PER_NEST) continue;

    // Find nearest resource node
    let closestResource = -1;
    let minResDist = Infinity;
    for (let j = 0; j < resourceNodes.length; j++) {
      const r = resourceNodes[j];
      if (Resource.amount[r] <= 0) continue;
      const dx = Position.x[r] - nx;
      const dy = Position.y[r] - ny;
      const dSq = dx * dx + dy * dy;
      if (dSq < minResDist) {
        minResDist = dSq;
        closestResource = r;
      }
    }

    if (closestResource === -1) continue;

    const sx = nx + (Math.random() - 0.5) * 60;
    const sy = ny + 30 + (Math.random() - 0.5) * 30;

    const gEid = spawnEntity(world, EntityKind.Gatherer, sx, sy, Faction.Enemy);
    if (gEid < 0) continue;

    world.enemyResources.clams -= ENEMY_GATHERER_COST;

    UnitStateMachine.targetEntity[gEid] = closestResource;
    UnitStateMachine.targetX[gEid] = Position.x[closestResource];
    UnitStateMachine.targetY[gEid] = Position.y[closestResource];
    UnitStateMachine.state[gEid] = UnitState.GatherMove;

    const speed = Velocity.speed[gEid] || ENTITY_DEFS[EntityKind.Gatherer]?.speed || 2.0;
    world.yukaManager.addUnit(
      gEid,
      sx,
      sy,
      speed,
      Position.x[closestResource],
      Position.y[closestResource],
    );
  }
}

/**
 * Enemy AI building construction (task #12).
 * Priority: Tower (if none near nest) > Burrow (for food cap) > Nest (expansion)
 */
function enemyBuildingConstruction(world: GameWorld, isPeaceful: boolean): void {
  if (isPeaceful) return;
  if (world.frameCount % ENEMY_BUILD_CHECK_INTERVAL !== 0) return;

  const nestEids = getEnemyNests(world);
  if (nestEids.length === 0) return;

  const res = world.enemyResources;

  // Evaluate what to build: pick the first nest that needs something
  for (const nestEid of nestEids) {
    const nx = Position.x[nestEid];
    const ny = Position.y[nestEid];

    // Count towers near this nest
    const buildings = query(world.ecs, [Position, Health, EntityTypeTag, FactionTag, IsBuilding]);
    let nearbyTowers = 0;
    let nearbyBurrows = 0;
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      if (FactionTag.faction[b] !== Faction.Enemy) continue;
      if (Health.current[b] <= 0) continue;
      const dx = Position.x[b] - nx;
      const dy = Position.y[b] - ny;
      const dSq = dx * dx + dy * dy;
      if (dSq > 400 * 400) continue;
      if (EntityTypeTag.kind[b] === EntityKind.Tower) nearbyTowers++;
      if (EntityTypeTag.kind[b] === EntityKind.Burrow) nearbyBurrows++;
    }

    // Priority 1: Build a tower if none near this nest
    if (
      nearbyTowers < 1 &&
      res.clams >= ENEMY_TOWER_COST_CLAMS &&
      res.twigs >= ENEMY_TOWER_COST_TWIGS
    ) {
      const pos = findBuildPosition(world, nestEid, EntityKind.Tower);
      if (pos) {
        res.clams -= ENEMY_TOWER_COST_CLAMS;
        res.twigs -= ENEMY_TOWER_COST_TWIGS;
        const bEid = spawnEntity(world, EntityKind.Tower, pos.x, pos.y, Faction.Enemy);
        if (bEid >= 0) startEnemyConstruction(world, bEid);
        return; // One build action per check
      }
    }

    // Priority 2: Build a burrow if none near this nest (food cap for more units)
    if (
      nearbyBurrows < 1 &&
      res.clams >= ENEMY_BURROW_COST_CLAMS &&
      res.twigs >= ENEMY_BURROW_COST_TWIGS
    ) {
      const pos = findBuildPosition(world, nestEid, EntityKind.Burrow);
      if (pos) {
        res.clams -= ENEMY_BURROW_COST_CLAMS;
        res.twigs -= ENEMY_BURROW_COST_TWIGS;
        const bEid = spawnEntity(world, EntityKind.Burrow, pos.x, pos.y, Faction.Enemy);
        if (bEid >= 0) startEnemyConstruction(world, bEid);
        return;
      }
    }
  }

  // Priority 3: Expansion nest if we have resources and few nests
  if (
    nestEids.length < 3 &&
    res.clams >= ENEMY_NEST_COST_CLAMS &&
    res.twigs >= ENEMY_NEST_COST_TWIGS
  ) {
    // Build near a random existing nest
    const sourceNest = nestEids[Math.floor(Math.random() * nestEids.length)];
    const pos = findBuildPosition(world, sourceNest, EntityKind.PredatorNest);
    if (pos) {
      res.clams -= ENEMY_NEST_COST_CLAMS;
      res.twigs -= ENEMY_NEST_COST_TWIGS;
      const bEid = spawnEntity(world, EntityKind.PredatorNest, pos.x, pos.y, Faction.Enemy);
      if (bEid >= 0) startEnemyConstruction(world, bEid);
    }
  }
}

/**
 * Enemy army training via TrainingQueue (task #13).
 * Replaces old free wave spawning with resource-based training.
 * Adapts unit composition to counter the player's army.
 */
function enemyArmyTraining(world: GameWorld, isPeaceful: boolean): void {
  if (isPeaceful) return;
  if (world.frameCount % ENEMY_TRAIN_CHECK_INTERVAL !== 0) return;

  const nestEids = getEnemyNests(world);
  if (nestEids.length === 0) return;

  const res = world.enemyResources;

  // Analyze player army to decide composition
  const playerSnipers = countPlayerUnitsOfKind(world, EntityKind.Sniper);
  const playerBrawlers = countPlayerUnitsOfKind(world, EntityKind.Brawler);

  // Counter logic: gators counter brawlers, snakes counter snipers
  // Default to 50/50 if player has no army
  let gatorWeight = 0.5;
  const totalPlayerCombat = playerSnipers + playerBrawlers;
  if (totalPlayerCombat > 0) {
    // More snipers -> train more gators (gators are strong vs brawlers, but snakes counter snipers)
    // Actually from DAMAGE_MULTIPLIERS: Snake is strong vs Sniper, Gator is strong vs Brawler
    const sniperRatio = playerSnipers / totalPlayerCombat;
    // If player has many snipers, train more snakes (which counter snipers)
    gatorWeight = 1.0 - sniperRatio * 0.7; // Bias toward snakes when snipers dominate
  }

  // Queue training at each nest that isn't already training
  for (const nestEid of nestEids) {
    const slots = trainingQueueSlots.get(nestEid) ?? [];
    if (slots.length >= 3) continue; // Max 3 in queue

    // Decide what to train
    const trainGator = Math.random() < gatorWeight;
    let unitKind: EntityKind;
    let costClams: number;
    let costTwigs: number;

    if (trainGator) {
      unitKind = EntityKind.Gator;
      costClams = ENEMY_GATOR_COST_CLAMS;
      costTwigs = ENEMY_GATOR_COST_TWIGS;
    } else {
      unitKind = EntityKind.Snake;
      costClams = ENEMY_SNAKE_COST_CLAMS;
      costTwigs = ENEMY_SNAKE_COST_TWIGS;
    }

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
function enemyTrainingQueueProcess(world: GameWorld): void {
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

    TrainingQueue.timer[eid]--;
    if (TrainingQueue.timer[eid] <= 0) {
      const unitKind = slots[0] as EntityKind;

      const bx = Position.x[eid];
      const by = Position.y[eid];
      const spriteH = Sprite.height[eid];
      const sx = bx + (Math.random() > 0.5 ? 1 : -1) * 30;
      const sy = by + spriteH / 2 + 20;

      const newEid = spawnEntity(world, unitKind, sx, sy, Faction.Enemy);
      if (newEid < 0) {
        TrainingQueue.timer[eid] = ENEMY_TRAIN_TIME;
        continue;
      }

      // Shift queue
      slots.shift();
      trainingQueueSlots.set(eid, slots);
      TrainingQueue.count[eid] = slots.length;

      if (slots.length > 0) {
        TrainingQueue.timer[eid] = ENEMY_TRAIN_TIME;
      }
    }
  }
}

/**
 * Enemy attack decision-making (task #14).
 * Attacks when army exceeds threshold, targets weakest player building,
 * groups units before sending them.
 */
function enemyAttackDecision(world: GameWorld, isPeaceful: boolean): void {
  if (isPeaceful) return;
  if (world.frameCount % ENEMY_ATTACK_CHECK_INTERVAL !== 0) return;

  const armySize = countEnemyArmy(world);
  if (armySize < ENEMY_ARMY_ATTACK_THRESHOLD) return;

  // Find target: weakest player building
  const target = findWeakestPlayerBuilding(world);
  if (target === -1) return;

  const targetX = Position.x[target];
  const targetY = Position.y[target];

  // Get idle or near-nest army units to send
  const armyUnits = getEnemyArmyUnits(world);
  const idleUnits: number[] = [];
  for (const eid of armyUnits) {
    const state = UnitStateMachine.state[eid] as UnitState;
    // Only mobilize idle units or units near nests (not already attacking)
    if (state === UnitState.Idle) {
      idleUnits.push(eid);
    }
  }

  // Only attack if we can send enough idle units (grouping)
  if (idleUnits.length < Math.min(ENEMY_ARMY_ATTACK_THRESHOLD, 3)) return;

  audio.alert();

  // Send them as a group
  for (const eid of idleUnits) {
    UnitStateMachine.targetEntity[eid] = target;
    UnitStateMachine.targetX[eid] = targetX + (Math.random() - 0.5) * ENEMY_RALLY_RADIUS;
    UnitStateMachine.targetY[eid] = targetY + (Math.random() - 0.5) * ENEMY_RALLY_RADIUS;
    UnitStateMachine.state[eid] = UnitState.AttackMove;

    const speed = Velocity.speed[eid] || 1.5;
    world.yukaManager.addEnemy(eid, Position.x[eid], Position.y[eid], speed, targetX, targetY);
  }
}

/** Retreat damaged enemy units below HP threshold (task #14) */
function enemyRetreatLogic(world: GameWorld): void {
  // Check every 60 frames for performance
  if (world.frameCount % 60 !== 0) return;

  const armyUnits = getEnemyArmyUnits(world);
  const nestEids = getEnemyNests(world);
  if (nestEids.length === 0) return;

  for (const eid of armyUnits) {
    const state = UnitStateMachine.state[eid] as UnitState;
    // Only check units that are fighting or attack-moving
    if (state !== UnitState.Attacking && state !== UnitState.AttackMove) continue;

    const hpRatio = Health.max[eid] > 0 ? Health.current[eid] / Health.max[eid] : 1;
    if (hpRatio >= ENEMY_RETREAT_HP_PERCENT) continue;

    // Retreat to nearest nest
    const ex = Position.x[eid];
    const ey = Position.y[eid];
    let nearestNest = nestEids[0];
    let minDist = Infinity;
    for (const nestEid of nestEids) {
      const dx = Position.x[nestEid] - ex;
      const dy = Position.y[nestEid] - ey;
      const dSq = dx * dx + dy * dy;
      if (dSq < minDist) {
        minDist = dSq;
        nearestNest = nestEid;
      }
    }

    // Flee toward nest
    UnitStateMachine.targetEntity[eid] = -1;
    UnitStateMachine.targetX[eid] = Position.x[nearestNest];
    UnitStateMachine.targetY[eid] = Position.y[nearestNest];
    UnitStateMachine.state[eid] = UnitState.Move;

    const speed = Velocity.speed[eid] || 1.5;
    world.yukaManager.addUnit(eid, ex, ey, speed, Position.x[nearestNest], Position.y[nearestNest]);
  }
}

/** Send scout snakes to explore the map (task #14) */
function enemyScoutLogic(world: GameWorld, isPeaceful: boolean): void {
  if (isPeaceful) return;
  if (world.frameCount % ENEMY_SCOUT_INTERVAL !== 0) return;

  const nestEids = getEnemyNests(world);
  if (nestEids.length === 0) return;

  const res = world.enemyResources;
  if (res.clams < ENEMY_SNAKE_COST_CLAMS || res.twigs < ENEMY_SNAKE_COST_TWIGS) return;

  // Pick a random nest to spawn from
  const sourceNest = nestEids[Math.floor(Math.random() * nestEids.length)];
  const nx = Position.x[sourceNest];
  const ny = Position.y[sourceNest];

  const sx = nx + (Math.random() - 0.5) * 60;
  const sy = ny + 30;

  const scoutEid = spawnEntity(world, EntityKind.Snake, sx, sy, Faction.Enemy);
  if (scoutEid < 0) return;

  res.clams -= ENEMY_SNAKE_COST_CLAMS;
  res.twigs -= ENEMY_SNAKE_COST_TWIGS;

  // Send scout to a random location on the map, biased toward player lodge
  const lodgeEid = findPlayerLodge(world);
  let scoutX: number;
  let scoutY: number;
  if (lodgeEid !== -1 && Math.random() > 0.3) {
    // 70% chance to scout toward the lodge area
    scoutX = Position.x[lodgeEid] + (Math.random() - 0.5) * 600;
    scoutY = Position.y[lodgeEid] + (Math.random() - 0.5) * 600;
  } else {
    // Random map exploration
    scoutX = 200 + Math.random() * (WORLD_WIDTH - 400);
    scoutY = 200 + Math.random() * (WORLD_HEIGHT - 400);
  }

  UnitStateMachine.targetX[scoutEid] = scoutX;
  UnitStateMachine.targetY[scoutEid] = scoutY;
  UnitStateMachine.state[scoutEid] = UnitState.AttackMovePatrol;
  UnitStateMachine.hasAttackMoveTarget[scoutEid] = 1;
  UnitStateMachine.attackMoveTargetX[scoutEid] = scoutX;
  UnitStateMachine.attackMoveTargetY[scoutEid] = scoutY;

  const speed = Velocity.speed[scoutEid] || ENTITY_DEFS[EntityKind.Snake]?.speed || 2.0;
  world.yukaManager.addEnemy(scoutEid, sx, sy, speed, scoutX, scoutY);
}

/** Nest defense reinforcement - spawn defenders when nest is under attack */
function nestDefenseReinforcement(world: GameWorld): void {
  if (world.frameCount % 600 !== 0) return;

  const nestEids = getEnemyNests(world);
  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);

  for (const nestEid of nestEids) {
    if (Health.current[nestEid] >= Health.max[nestEid] * 0.5) continue;

    const nx = Position.x[nestEid];
    const ny = Position.y[nestEid];

    // Count nearby enemy defenders
    let defenderCount = 0;
    for (let j = 0; j < allUnits.length; j++) {
      const u = allUnits[j];
      if (FactionTag.faction[u] !== Faction.Enemy) continue;
      if (hasComponent(world.ecs, u, IsBuilding)) continue;
      if (Health.current[u] <= 0) continue;

      const dx = Position.x[u] - nx;
      const dy = Position.y[u] - ny;
      const dSq = dx * dx + dy * dy;
      if (dSq < 300 * 300) {
        defenderCount++;
      }
    }

    if (defenderCount >= 4) continue;

    // Cost check: defenders still cost resources now
    const trainGator = Math.random() > 0.5;
    const costClams = trainGator ? ENEMY_GATOR_COST_CLAMS : ENEMY_SNAKE_COST_CLAMS;
    const costTwigs = trainGator ? ENEMY_GATOR_COST_TWIGS : ENEMY_SNAKE_COST_TWIGS;
    if (world.enemyResources.clams < costClams || world.enemyResources.twigs < costTwigs) continue;

    world.enemyResources.clams -= costClams;
    world.enemyResources.twigs -= costTwigs;

    const unitKind = trainGator ? EntityKind.Gator : EntityKind.Snake;
    const sx = nx + (Math.random() - 0.5) * 60;
    const sy = ny + 30;

    const defEid = spawnEntity(world, unitKind, sx, sy, Faction.Enemy);
    if (defEid < 0) continue;

    // Find nearest player unit to attack
    let closestTarget = -1;
    let minDistSq = 400 * 400;
    for (let j = 0; j < allUnits.length; j++) {
      const u = allUnits[j];
      if (FactionTag.faction[u] !== Faction.Player) continue;
      if (Health.current[u] <= 0) continue;

      const dx = Position.x[u] - nx;
      const dy = Position.y[u] - ny;
      const dSq = dx * dx + dy * dy;
      if (dSq < minDistSq) {
        minDistSq = dSq;
        closestTarget = u;
      }
    }

    const defSpeed = Velocity.speed[defEid] || ENTITY_DEFS[unitKind]?.speed || 1.5;

    if (closestTarget !== -1) {
      UnitStateMachine.targetEntity[defEid] = closestTarget;
      UnitStateMachine.targetX[defEid] = Position.x[closestTarget];
      UnitStateMachine.targetY[defEid] = Position.y[closestTarget];
      UnitStateMachine.state[defEid] = UnitState.AttackMove;

      world.yukaManager.addEnemy(
        defEid,
        sx,
        sy,
        defSpeed,
        Position.x[closestTarget],
        Position.y[closestTarget],
      );
    } else {
      world.yukaManager.addEnemy(defEid, sx, sy, defSpeed, nx, ny);
    }
  }
}

/** Boss wave logic - kept from original, spawns boss crocs periodically */
function bossWaveLogic(world: GameWorld, isPeaceful: boolean): void {
  if (isPeaceful) return;
  if (world.frameCount <= world.peaceTimer + 10 * WAVE_INTERVAL) return;
  if (world.frameCount % (WAVE_INTERVAL * 3) !== 0) return;

  const nestEids = getEnemyNests(world);
  const lodgeEid = findPlayerLodge(world);

  for (const nestEid of nestEids) {
    const nx = Position.x[nestEid];
    const ny = Position.y[nestEid];
    const sx = nx + (Math.random() - 0.5) * 60;
    const sy = ny + 30;

    const eid = spawnEntity(world, EntityKind.BossCroc, sx, sy, Faction.Enemy);
    if (eid < 0) continue;

    audio.alert();
    world.floatingTexts.push({
      x: sx,
      y: sy - 40,
      text: 'BOSS CROC!',
      color: '#ef4444',
      life: 120,
    });
    world.minimapPings.push({ x: sx, y: sy, life: 180, maxLife: 180 });
    world.shakeTimer = Math.max(world.shakeTimer, 15);

    if (lodgeEid !== -1) {
      UnitStateMachine.targetEntity[eid] = lodgeEid;
      UnitStateMachine.targetX[eid] = Position.x[lodgeEid];
      UnitStateMachine.targetY[eid] = Position.y[lodgeEid];
      UnitStateMachine.state[eid] = UnitState.AttackMove;

      const speed = Velocity.speed[eid] || ENTITY_DEFS[EntityKind.BossCroc]?.speed || 1.2;
      world.yukaManager.addEnemy(eid, sx, sy, speed, Position.x[lodgeEid], Position.y[lodgeEid]);
    }
  }
}
