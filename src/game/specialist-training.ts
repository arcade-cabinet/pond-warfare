import { ENTITY_DEFS } from '@/config/entity-defs';
import { getUnitDef } from '@/config/config-loader';
import type { SpecialistDef } from '@/config/v3-types';
import type { GameWorld } from '@/ecs/world';
import { Position } from '@/ecs/components';
import { getSpecialistSpawnPositions } from '@/ecs/systems/specialist-deploy';
import { spawnSpecialistUnit, getSpecialistSpawnKind } from '@/game/init-entities/specialist-spawn';
import {
  getActiveSpecialistCount,
  getRemainingSpecialistCapacity,
  getSpecialistBlueprintCap,
} from '@/game/specialist-blueprints';
import { pushGameEvent } from '@/ui/game-events';

export interface SpecialistSpawnCost {
  fish: number;
  logs: number;
  rocks: number;
  food: number;
}

export function getSpecialistSpawnCost(runtimeId: string): SpecialistSpawnCost {
  const def = getUnitDef(runtimeId) as SpecialistDef;
  const kind = getSpecialistSpawnKind(runtimeId);
  const unitDef = kind == null ? null : ENTITY_DEFS[kind];
  return {
    fish: def.cost?.fish ?? 0,
    logs: def.cost?.logs ?? 0,
    rocks: def.cost?.rocks ?? 0,
    food: unitDef?.foodCost ?? 1,
  };
}

export function canSpawnSpecialistFromLodge(
  world: GameWorld,
  runtimeId: string,
): boolean {
  const remaining = getRemainingSpecialistCapacity(world, runtimeId);
  if (remaining <= 0) return false;

  const cost = getSpecialistSpawnCost(runtimeId);
  return (
    world.resources.fish >= cost.fish &&
    world.resources.logs >= cost.logs &&
    world.resources.rocks >= cost.rocks &&
    world.resources.food + cost.food <= world.resources.maxFood
  );
}

export function spawnSpecialistFromLodge(
  world: GameWorld,
  lodgeEid: number,
  runtimeId: string,
  label: string,
): boolean {
  if (!canSpawnSpecialistFromLodge(world, runtimeId)) return false;

  const cost = getSpecialistSpawnCost(runtimeId);
  world.resources.fish -= cost.fish;
  world.resources.logs -= cost.logs;
  world.resources.rocks -= cost.rocks;
  world.resources.food += cost.food;

  const lodgeX = Position.x[lodgeEid];
  const lodgeY = Position.y[lodgeEid];
  const activeCount = getActiveSpecialistCount(world, runtimeId);
  const positions = getSpecialistSpawnPositions(lodgeX, lodgeY, activeCount + 1);
  const pos = positions[activeCount] ?? { x: lodgeX, y: lodgeY + 60 };
  const eid = spawnSpecialistUnit(world, runtimeId, lodgeEid, pos.x, pos.y, 'blueprint');
  if (eid == null) {
    world.resources.fish += cost.fish;
    world.resources.logs += cost.logs;
    world.resources.rocks += cost.rocks;
    world.resources.food = Math.max(0, world.resources.food - cost.food);
    return false;
  }

  world.stats.unitsTrained += 1;
  const active = getActiveSpecialistCount(world, runtimeId);
  const cap = getSpecialistBlueprintCap(world, runtimeId);
  pushGameEvent(`${label} deployed (${active}/${cap})`, '#c4b5fd', world.frameCount);
  return true;
}
