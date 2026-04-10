import { isMudpawKind } from '@/game/live-unit-kinds';
import type { RosterGroup, RosterUnit } from '@/ui/roster-types';

export function isMudpawUnit(unit: Pick<RosterUnit, 'kind' | 'label'>): boolean {
  return isMudpawKind(unit.kind) && (unit.label ?? 'Mudpaw') === 'Mudpaw';
}

export function getGovernorGatherUnits(groups: RosterGroup[]): RosterUnit[] {
  return groups
    .filter((group) => group.role === 'generalist')
    .flatMap((group) => group.units)
    .filter(isMudpawUnit);
}

export function getGovernorCombatUnits(groups: RosterGroup[]): RosterUnit[] {
  return groups.flatMap((group) =>
    group.units.filter((unit) => group.role === 'combat' || isMudpawUnit(unit)),
  );
}
