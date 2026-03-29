/**
 * Auto-Build System
 *
 * When auto-build is enabled (via the idle menu), evaluates build pressures
 * every 300 frames (~5 seconds) and assigns an idle gatherer to construct
 * the highest-priority affordable building near the player Lodge.
 *
 * Pressure scoring:
 * - Under attack with no tower: CRITICAL (120)
 * - Population cap reached: CRITICAL (100)
 * - No armory and peace ending: HIGH (80)
 * - Nearby resources depleting: MEDIUM (60)
 */

import { hasComponent, query } from 'bitecs';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { TILE_SIZE } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Resource,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { canPlaceBuilding } from '@/input/selection';
import { EntityKind, Faction, UnitState } from '@/types';

interface BuildCandidate {
  kind: EntityKind;
  score: number;
  reason: string;
}

/** Check if the player can afford a building of the given kind. */
function canAfford(world: GameWorld, kind: EntityKind): boolean {
  const def = ENTITY_DEFS[kind];
  const clamCost = def.clamCost ?? 0;
  const twigCost = def.twigCost ?? 0;
  return world.resources.clams >= clamCost && world.resources.twigs >= twigCost;
}

/** Find the player Lodge entity (first alive one). Returns -1 if none. */
function findPlayerLodge(world: GameWorld): number {
  const buildings = query(world.ecs, [Position, Health, IsBuilding, FactionTag, EntityTypeTag]);
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

/** Count player buildings of a given kind (including under-construction). */
function countPlayerBuildings(world: GameWorld, kind: EntityKind): number {
  const buildings = query(world.ecs, [Position, Health, IsBuilding, FactionTag, EntityTypeTag]);
  let count = 0;
  for (let i = 0; i < buildings.length; i++) {
    const eid = buildings[i];
    if (
      EntityTypeTag.kind[eid] === kind &&
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0
    ) {
      count++;
    }
  }
  return count;
}

/** Count enemy units within a given radius of a point. */
function countEnemiesNear(world: GameWorld, cx: number, cy: number, radius: number): number {
  const radiusSq = radius * radius;
  const candidates = world.spatialHash.query(cx, cy, radius);
  let count = 0;
  for (let i = 0; i < candidates.length; i++) {
    const eid = candidates[i];
    if (!hasComponent(world.ecs, eid, FactionTag)) continue;
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (!hasComponent(world.ecs, eid, Health) || Health.current[eid] <= 0) continue;
    const dx = Position.x[eid] - cx;
    const dy = Position.y[eid] - cy;
    if (dx * dx + dy * dy <= radiusSq) {
      count++;
    }
  }
  return count;
}

/** Count resource nodes within a radius of a point. */
function countResourcesNear(world: GameWorld, cx: number, cy: number, radius: number): number {
  const radiusSq = radius * radius;
  const resources = query(world.ecs, [Position, Health, IsResource, Resource]);
  let count = 0;
  for (let i = 0; i < resources.length; i++) {
    const eid = resources[i];
    if (Resource.amount[eid] <= 0) continue;
    const dx = Position.x[eid] - cx;
    const dy = Position.y[eid] - cy;
    if (dx * dx + dy * dy <= radiusSq) {
      count++;
    }
  }
  return count;
}

/** Evaluate which buildings should be auto-built, ranked by priority. */
function evaluateBuildPressures(world: GameWorld): BuildCandidate[] {
  const candidates: BuildCandidate[] = [];
  const lodge = findPlayerLodge(world);
  if (lodge === -1) return candidates;

  const lodgeX = Position.x[lodge];
  const lodgeY = Position.y[lodge];

  // Under attack: enemies near lodge and no tower
  const enemiesNearLodge = countEnemiesNear(world, lodgeX, lodgeY, 400);
  const hasTower = countPlayerBuildings(world, EntityKind.Tower) > 0;
  if (enemiesNearLodge > 0 && !hasTower) {
    candidates.push({ kind: EntityKind.Tower, score: 120, reason: 'Under attack' });
  }

  // Population cap pressure
  if (world.resources.food >= world.resources.maxFood && world.resources.maxFood > 0) {
    candidates.push({ kind: EntityKind.Burrow, score: 100, reason: 'Pop cap reached' });
  }

  // No military production and peace ending soon
  const hasArmory = countPlayerBuildings(world, EntityKind.Armory) > 0;
  if (!hasArmory && world.frameCount > world.peaceTimer * 0.5) {
    candidates.push({ kind: EntityKind.Armory, score: 80, reason: 'Need military' });
  }

  // Resources depleting near lodge
  const nearbyResources = countResourcesNear(world, lodgeX, lodgeY, 500);
  if (nearbyResources < 3) {
    candidates.push({ kind: EntityKind.Lodge, score: 60, reason: 'Resources depleting' });
  }

  // Filter by affordability and sort by score descending
  return candidates.filter((c) => canAfford(world, c.kind)).sort((a, b) => b.score - a.score);
}

/** Find a valid build position near the Lodge on a tile grid. */
function findBuildPosition(
  world: GameWorld,
  lodgeEid: number,
  kind: EntityKind,
): { x: number; y: number } | null {
  const def = ENTITY_DEFS[kind];
  const spriteW = def.spriteSize * def.spriteScale;
  const spriteH = def.spriteSize * def.spriteScale;
  const lx = Position.x[lodgeEid];
  const ly = Position.y[lodgeEid];

  // Search in expanding rings around the lodge
  for (let ring = 3; ring <= 8; ring++) {
    for (let dx = -ring; dx <= ring; dx++) {
      for (let dy = -ring; dy <= ring; dy++) {
        // Only check the perimeter of each ring to avoid rechecking inner cells
        if (Math.abs(dx) !== ring && Math.abs(dy) !== ring) continue;
        const bx = Math.round((lx + dx * TILE_SIZE) / TILE_SIZE) * TILE_SIZE;
        const by = Math.round((ly + dy * TILE_SIZE) / TILE_SIZE) * TILE_SIZE;
        if (canPlaceBuilding(world, bx, by, spriteW, spriteH)) {
          return { x: bx, y: by };
        }
      }
    }
  }
  return null;
}

/** Find the first idle player gatherer. Returns -1 if none. */
function findIdleGatherer(world: GameWorld): number {
  const units = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, UnitStateMachine]);
  for (let i = 0; i < units.length; i++) {
    const eid = units[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (EntityTypeTag.kind[eid] !== EntityKind.Gatherer) continue;
    if (UnitStateMachine.state[eid] !== UnitState.Idle) continue;
    return eid;
  }
  return -1;
}

/**
 * Auto-build system. Runs every 300 frames (~5 seconds) when auto-build
 * is enabled. Evaluates build pressures and assigns an idle gatherer to
 * construct the highest-priority affordable structure.
 */
export function autoBuildSystem(world: GameWorld): void {
  if (!world.autoBehaviors.build) return;
  if (world.frameCount % 300 !== 0) return;

  const candidates = evaluateBuildPressures(world);
  if (candidates.length === 0) return;

  const best = candidates[0];
  const gatherer = findIdleGatherer(world);
  if (gatherer === -1) return;

  const lodge = findPlayerLodge(world);
  if (lodge === -1) return;

  const pos = findBuildPosition(world, lodge, best.kind);
  if (!pos) return;

  const def = ENTITY_DEFS[best.kind];
  const clamCost = def.clamCost ?? 0;
  const twigCost = def.twigCost ?? 0;

  // Deduct resources and spawn the building
  world.resources.clams -= clamCost;
  world.resources.twigs -= twigCost;
  const buildingEid = spawnEntity(world, best.kind, pos.x, pos.y, Faction.Player);

  // Send the gatherer to build it
  UnitStateMachine.targetEntity[gatherer] = buildingEid;
  UnitStateMachine.targetX[gatherer] = pos.x;
  UnitStateMachine.targetY[gatherer] = pos.y;
  UnitStateMachine.state[gatherer] = UnitState.BuildMove;

  // Show floating text
  const kindName = ENTITY_DEFS[best.kind] ? entityKindLabel(best.kind) : 'Building';
  world.floatingTexts.push({
    x: pos.x,
    y: pos.y - 30,
    text: `Auto-building ${kindName} (${best.reason})`,
    color: '#40c8d0',
    life: 120,
  });
}

/** Simple label for an EntityKind used in floating text. */
function entityKindLabel(kind: EntityKind): string {
  const labels: Partial<Record<EntityKind, string>> = {
    [EntityKind.Lodge]: 'Lodge',
    [EntityKind.Burrow]: 'Burrow',
    [EntityKind.Armory]: 'Armory',
    [EntityKind.Tower]: 'Tower',
  };
  return labels[kind] ?? 'Building';
}
