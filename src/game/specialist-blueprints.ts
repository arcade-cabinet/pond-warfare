import { Health } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import type { PrestigeState } from '@/config/prestige-logic';
import { getSpecialistBlueprints, getSpecialistZoneBonuses } from '@/config/prestige-logic';
import type { SpecialistZoneStat } from '@/config/v3-types';

export interface SpecialistBlueprintCap {
  unitId: string;
  cap: number;
  upgradeId: string;
}

export type SpecialistZoneBonusMap = Record<string, Partial<Record<SpecialistZoneStat, number>>>;

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

export function initializeSpecialistZoneBonuses(
  world: GameWorld,
  prestigeState: PrestigeState,
): void {
  world.specialistZoneBonuses = {};
  for (const entry of getSpecialistZoneBonuses(prestigeState)) {
    const current = world.specialistZoneBonuses[entry.unitId] ?? {};
    current[entry.stat] = (current[entry.stat] ?? 0) + entry.value;
    world.specialistZoneBonuses[entry.unitId] = current;
  }
}

export function initializeSpecialistProgression(
  world: GameWorld,
  prestigeState: PrestigeState,
): void {
  initializeSpecialistBlueprintCaps(world, prestigeState);
  initializeSpecialistZoneBonuses(world, prestigeState);
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

export function getSpecialistZoneBonus(
  world: Pick<GameWorld, 'specialistZoneBonuses'>,
  unitId: string,
  stat: SpecialistZoneStat,
): number {
  return world.specialistZoneBonuses[unitId]?.[stat] ?? 0;
}
