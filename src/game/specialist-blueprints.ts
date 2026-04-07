import { Health } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import type { PrestigeState } from '@/config/prestige-logic';
import { getSpecialistBlueprints } from '@/config/prestige-logic';

export interface SpecialistBlueprintCap {
  unitId: string;
  cap: number;
  upgradeId: string;
}

export function getSpecialistBlueprintCaps(
  prestigeState: PrestigeState,
): SpecialistBlueprintCap[] {
  return getSpecialistBlueprints(prestigeState).map((entry) => ({
    unitId: entry.unitId,
    cap: entry.cap,
    upgradeId: entry.upgradeId,
  }));
}

export function initializeSpecialistBlueprintCaps(
  world: GameWorld,
  prestigeState: PrestigeState,
): void {
  world.specialistBlueprintCaps = {};
  for (const entry of getSpecialistBlueprintCaps(prestigeState)) {
    world.specialistBlueprintCaps[entry.unitId] = entry.cap;
  }
}

export function getSpecialistBlueprintCap(
  world: Pick<GameWorld, 'specialistBlueprintCaps'>,
  unitId: string,
): number {
  return world.specialistBlueprintCaps[unitId] ?? 0;
}

export function getActiveSpecialistCount(
  world: Pick<GameWorld, 'specialistAssignments'>,
  unitId: string,
): number {
  let count = 0;
  for (const [eid, assignment] of world.specialistAssignments.entries()) {
    if (assignment.runtimeId !== unitId) continue;
    if (Health.current[eid] > 0) count++;
  }
  return count;
}

export function getRemainingSpecialistCapacity(
  world: Pick<GameWorld, 'specialistAssignments' | 'specialistBlueprintCaps'>,
  unitId: string,
): number {
  return Math.max(0, getSpecialistBlueprintCap(world, unitId) - getActiveSpecialistCount(world, unitId));
}
