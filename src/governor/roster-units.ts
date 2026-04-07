import { EntityKind } from '@/types';
import type { RosterGroup, RosterUnit } from '@/ui/roster-types';

export function isMudpawUnit(unit: Pick<RosterUnit, 'kind' | 'label'>): boolean {
  return unit.kind === EntityKind.Gatherer && (unit.label ?? 'Mudpaw') === 'Mudpaw';
}

export function getGovernorGatherUnits(groups: RosterGroup[]): RosterUnit[] {
  return groups
    .filter((group) => group.role === 'gatherer')
    .flatMap((group) => group.units)
    .filter(isMudpawUnit);
}

export function getGovernorCombatUnits(groups: RosterGroup[]): RosterUnit[] {
  return groups.flatMap((group) =>
    group.units.filter((unit) => group.role === 'combat' || isMudpawUnit(unit)),
  );
}
