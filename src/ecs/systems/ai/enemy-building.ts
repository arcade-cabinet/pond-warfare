/**
 * AI System - Enemy Building
 *
 * Building construction decisions and placement (task #12).
 * Priority: Tower (if none near nest) > Burrow (for food cap) > Nest (expansion)
 */

import { query } from 'bitecs';
import { resolvePersonality } from '@/config/ai-personalities';
import {
  ENEMY_BUILD_CHECK_INTERVAL,
  ENEMY_BURROW_COST_FISH,
  ENEMY_BURROW_COST_LOGS,
  ENEMY_LATE_BUILD_INTERVAL,
  ENEMY_LATE_GAME_FRAME,
  ENEMY_MAX_NESTS_LATE,
  ENEMY_MID_GAME_FRAME,
  ENEMY_NEST_COST_FISH,
  ENEMY_NEST_COST_LOGS,
  ENEMY_TOWER_COST_FISH,
  ENEMY_TOWER_COST_LOGS,
} from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';
import { findBuildPosition, getEnemyNests, startEnemyConstruction } from './helpers';

/** Enemy AI building construction tick */
export function enemyBuildingTick(world: GameWorld): void {
  const isPeaceful = world.frameCount < world.peaceTimer;
  if (isPeaceful) return;
  // Scale building frequency: faster checks in late game
  const buildInterval =
    world.frameCount >= ENEMY_LATE_GAME_FRAME
      ? ENEMY_LATE_BUILD_INTERVAL
      : ENEMY_BUILD_CHECK_INTERVAL;
  if (world.frameCount % buildInterval !== 0) return;

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

    // AI personality: scale tower cap by towerBuildRate (e.g. turtle builds more)
    const personality = resolvePersonality(world.aiPersonality, world.frameCount);
    const maxTowersNear = Math.max(1, Math.round(1 * personality.towerBuildRate));

    // Priority 1: Build a tower if under cap near this nest (mid-game onward)
    if (
      world.frameCount >= ENEMY_MID_GAME_FRAME &&
      nearbyTowers < maxTowersNear &&
      res.fish >= ENEMY_TOWER_COST_FISH &&
      res.logs >= ENEMY_TOWER_COST_LOGS
    ) {
      const pos = findBuildPosition(world, nestEid, EntityKind.Tower);
      if (pos) {
        const bEid = spawnEntity(world, EntityKind.Tower, pos.x, pos.y, Faction.Enemy);
        if (bEid < 0) return;
        res.fish -= ENEMY_TOWER_COST_FISH;
        res.logs -= ENEMY_TOWER_COST_LOGS;
        startEnemyConstruction(world, bEid);
        return; // One build action per check
      }
    }

    // Priority 2: Build a burrow if none near this nest (food cap for more units).
    // Skip if any enemy burrow is still under construction to avoid wasting resources.
    let burrowUnderConstruction = false;
    for (let i = 0; i < buildings.length; i++) {
      const b = buildings[i];
      if (
        FactionTag.faction[b] === Faction.Enemy &&
        (EntityTypeTag.kind[b] as EntityKind) === EntityKind.Burrow &&
        Building.progress[b] < 100
      ) {
        burrowUnderConstruction = true;
        break;
      }
    }
    if (
      !burrowUnderConstruction &&
      nearbyBurrows < 1 &&
      res.fish >= ENEMY_BURROW_COST_FISH &&
      res.logs >= ENEMY_BURROW_COST_LOGS
    ) {
      const pos = findBuildPosition(world, nestEid, EntityKind.Burrow);
      if (pos) {
        const bEid = spawnEntity(world, EntityKind.Burrow, pos.x, pos.y, Faction.Enemy);
        if (bEid < 0) return;
        res.fish -= ENEMY_BURROW_COST_FISH;
        res.logs -= ENEMY_BURROW_COST_LOGS;
        startEnemyConstruction(world, bEid);
        return;
      }
    }
  }

  // Priority 3: Expansion nest if we have resources and few nests
  // Late game allows more expansion nests for increased pressure
  // AI personality: scale nest cap by expansionRate
  const personalityExp = resolvePersonality(world.aiPersonality, world.frameCount);
  const baseMaxNests = world.frameCount >= ENEMY_LATE_GAME_FRAME ? ENEMY_MAX_NESTS_LATE : 3;
  const maxNests = Math.max(1, Math.round(baseMaxNests * personalityExp.expansionRate));
  if (
    nestEids.length < maxNests &&
    res.fish >= ENEMY_NEST_COST_FISH &&
    res.logs >= ENEMY_NEST_COST_LOGS
  ) {
    // Build near a random existing nest
    const sourceNest = nestEids[Math.floor(world.gameRng.next() * nestEids.length)];
    const pos = findBuildPosition(world, sourceNest, EntityKind.PredatorNest);
    if (pos) {
      const bEid = spawnEntity(world, EntityKind.PredatorNest, pos.x, pos.y, Faction.Enemy);
      if (bEid >= 0) {
        res.fish -= ENEMY_NEST_COST_FISH;
        res.logs -= ENEMY_NEST_COST_LOGS;
        startEnemyConstruction(world, bEid);
      }
    }
  }
}
