import { EntityKind } from '@/types';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';
import { getGovernorCombatUnits, getGovernorGatherUnits } from './roster-units';

type GovernorUnitRole = 'gatherer' | 'combat' | 'support' | 'scout';

function unitCount(role: GovernorUnitRole): number {
  if (role === 'gatherer') return getGovernorGatherUnits(store.unitRoster.value).length;
  if (role === 'combat') return getGovernorCombatUnits(store.unitRoster.value).length;
  return store.unitRoster.value
    .filter((group) => group.role === role)
    .reduce((sum, group) => sum + group.units.length, 0);
}

function lodgeHpRatio(): number {
  const lodge = store.buildingRoster.value.find((building) => building.kind === EntityKind.Lodge);
  if (!lodge || lodge.maxHp <= 0) return 1;
  return lodge.hp / lodge.maxHp;
}

function nextWaveCountdown(): number | null {
  return store.waveCountdown.value === -1 ? null : store.waveCountdown.value;
}

function hasImmediatePressure(): boolean {
  const waveCountdown = nextWaveCountdown();
  return (
    store.baseThreatCount.value >= 2 ||
    lodgeHpRatio() < 0.95 ||
    (waveCountdown !== null && waveCountdown <= 18)
  );
}

function currentStage(): number {
  return Math.max(1, Math.trunc(storeV3.progressionLevel.value || 1));
}

export function getGovernorMudpawTarget(): number {
  if (hasImmediatePressure()) return 2;

  const stage = currentStage();
  if (stage >= 6) return 1;
  if (stage >= 4) return 3;
  return 4;
}

export function getGovernorCombatTarget(): number {
  const stage = currentStage();
  if (hasImmediatePressure()) return stage >= 5 ? 5 : 4;
  if (stage >= 6) return 5;
  if (stage >= 4) return 4;
  return 3;
}

export function shouldTrainSupportUnit(): boolean {
  if (unitCount('support') > 0) return false;
  return unitCount('combat') >= Math.max(4, getGovernorCombatTarget());
}

export function shouldTrainScoutUnit(): boolean {
  if (unitCount('scout') > 0) return false;
  return unitCount('combat') >= Math.max(3, getGovernorCombatTarget() - 1);
}
