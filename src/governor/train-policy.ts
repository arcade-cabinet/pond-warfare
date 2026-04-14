import { ENTITY_DEFS } from '@/config/entity-defs';
import { EntityKind } from '@/types';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';
import { hasCurrentRunTrack } from './current-run-upgrades';
import { getGovernorCombatUnits, getGovernorGatherUnits } from './roster-units';

type GovernorUnitRole = 'generalist' | 'combat' | 'support' | 'recon';

function unitCount(role: GovernorUnitRole): number {
  if (role === 'generalist') return getGovernorGatherUnits(store.unitRoster.value).length;
  if (role === 'combat') return getGovernorCombatUnits(store.unitRoster.value).length;
  return store.unitRoster.value
    .filter((group) => group.role === role)
    .reduce((sum, group) => sum + group.units.length, 0);
}

function woundedCombatUnitCount(): number {
  return getGovernorCombatUnits(store.unitRoster.value).filter((unit) => unit.hp < unit.maxHp).length;
}

function lodgeHpRatio(): number {
  const lodge = store.buildingRoster.value.find((building) => building.kind === EntityKind.Lodge);
  if (!lodge || lodge.maxHp <= 0) return 1;
  return lodge.hp / lodge.maxHp;
}

function hasBuilding(kind: EntityKind): boolean {
  return store.buildingRoster.value.some((building) => building.kind === kind);
}

function hasCompletedBuilding(kind: EntityKind): boolean {
  return store.buildingRoster.value.some((building) => building.kind === kind && building.hp >= building.maxHp);
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
  if (stage >= 6 && !hasCompletedBuilding(EntityKind.Armory)) return 3;
  if (
    stage >= 6 &&
    hasCompletedBuilding(EntityKind.Armory) &&
    !hasBuilding(EntityKind.Tower)
  ) {
    return 2;
  }
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

function nearBuildBudget(kind: EntityKind, fishSlack: number, logSlack: number): boolean {
  const def = ENTITY_DEFS[kind];
  const fishCost = def.fishCost ?? 0;
  const logCost = def.logCost ?? 0;
  return store.fish.value >= Math.max(0, fishCost - fishSlack) && store.logs.value >= Math.max(0, logCost - logSlack);
}

function combatFloorForBuildSavings(): number {
  if (hasCurrentRunTrack('defense_tower_damage')) return 1;
  return Math.max(3, getGovernorCombatTarget() - 2);
}

export function getGovernorReservedBuildKind(): EntityKind | null {
  const stage = currentStage();
  const waveCountdown = nextWaveCountdown();
  const threats = Math.max(0, Math.trunc(store.baseThreatCount.value || 0));
  const lodgeHp = lodgeHpRatio();
  const towerDamageTrackActive = hasCurrentRunTrack('defense_tower_damage');
  const wallHpTrackActive = hasCurrentRunTrack('defense_wall_hp');
  const demolishTrackActive = hasCurrentRunTrack('siege_demolish_power');

  const canStartWallSavings =
    stage >= 6 &&
    wallHpTrackActive &&
    !hasBuilding(EntityKind.Wall) &&
    unitCount('generalist') >= 1 &&
    unitCount('combat') >= 1 &&
    lodgeHp >= 0.92 &&
    threats <= 1 &&
    (waveCountdown === null || waveCountdown > 8);

  if (canStartWallSavings) {
    return EntityKind.Wall;
  }

  const armoryFishCost = ENTITY_DEFS[EntityKind.Armory].fishCost ?? 0;
  const canStartArmorySavings =
    stage >= 6 &&
    !hasCompletedBuilding(EntityKind.Armory) &&
    !towerDamageTrackActive &&
    !wallHpTrackActive &&
    !demolishTrackActive &&
    unitCount('generalist') >= 3 &&
    nearBuildBudget(EntityKind.Armory, 50, 30) &&
    lodgeHp >= 0.92 &&
    threats <= 2 &&
    (waveCountdown === null || waveCountdown > 10);

  if (canStartArmorySavings) {
    return EntityKind.Armory;
  }

  if (unitCount('combat') < combatFloorForBuildSavings()) return null;

  const canStartTowerSavings =
    stage >= 6 &&
    !hasBuilding(EntityKind.Tower) &&
    unitCount('generalist') >= 2 &&
    (
      (
        hasCompletedBuilding(EntityKind.Armory) &&
        lodgeHp >= 0.88 &&
        threats <= 2 &&
        (waveCountdown === null || waveCountdown > 12)
      ) ||
      (
        towerDamageTrackActive &&
        lodgeHp >= 0.9 &&
        threats <= 1 &&
        (waveCountdown === null || waveCountdown > 8)
      )
    );

  if (
    canStartTowerSavings &&
    nearBuildBudget(EntityKind.Tower, 60, 70)
  ) {
    return EntityKind.Tower;
  }

  if (canStartTowerSavings) {
    return EntityKind.Tower;
  }

  return null;
}

export function shouldTrainSupportUnit(): boolean {
  if (unitCount('support') > 0) return false;
  const combatUnits = unitCount('combat');
  const combatTarget = getGovernorCombatTarget();
  if (hasCurrentRunTrack('utility_heal_power') && currentStage() >= 6) {
    const nearCombatTarget = combatUnits >= Math.max(3, combatTarget - 1);
    if (nearCombatTarget && (woundedCombatUnitCount() >= 1 || hasImmediatePressure())) {
      return true;
    }
  }
  return combatUnits >= Math.max(4, combatTarget);
}

export function shouldTrainReconUnit(): boolean {
  if (unitCount('recon') > 0) return false;
  return unitCount('combat') >= Math.max(3, getGovernorCombatTarget() - 1);
}
