import { hasComponent, query } from 'bitecs';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  TaskOverride,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { isLookoutKind, isMudpawKind, MEDIC_KIND, MUDPAW_KIND } from '@/game/live-unit-kinds';
import { getEntityDisplayName, getPlayerTrainableDisplayName } from '@/game/unit-display';
import { EntityKind, Faction, UnitState } from '@/types';
import type {
  RosterBuilding,
  RosterGroup,
  RosterUnit,
  UnitRole,
  UnitTask,
} from '@/ui/roster-types';
import * as store from '@/ui/store';

function roleFor(kind: EntityKind): UnitRole {
  if (isMudpawKind(kind)) return 'generalist';
  if (kind === EntityKind.Commander) return 'commander';
  if (kind === MEDIC_KIND || kind === EntityKind.Shaman) return 'support';
  if (isLookoutKind(kind)) return 'recon';
  return 'combat';
}

const GATHER_TASK: Partial<Record<EntityKind, UnitTask>> = {
  [EntityKind.Clambed]: 'gathering-fish',
  [EntityKind.Cattail]: 'gathering-logs',
  [EntityKind.PearlBed]: 'gathering-rocks',
};

const STATIC_TASK: Partial<Record<UnitState, UnitTask>> = {
  [UnitState.Idle]: 'idle',
  [UnitState.Move]: 'moving',
  [UnitState.BuildMove]: 'building',
  [UnitState.Building]: 'building',
  [UnitState.RepairMove]: 'building',
  [UnitState.Repairing]: 'building',
  [UnitState.AttackMove]: 'attacking',
  [UnitState.Attacking]: 'attacking',
  [UnitState.AttackMovePatrol]: 'patrolling',
};

function deriveTask(eid: number, state: UnitState): UnitTask {
  const s = STATIC_TASK[state];
  if (s) return s;
  if (
    state === UnitState.GatherMove ||
    state === UnitState.Gathering ||
    state === UnitState.ReturnMove
  ) {
    const t = UnitStateMachine.targetEntity[eid];
    return (t > 0 && GATHER_TASK[EntityTypeTag.kind[t] as EntityKind]) || 'gathering-fish';
  }
  return 'idle';
}

function targetNameFor(world: GameWorld, eid: number): string {
  const target = UnitStateMachine.targetEntity[eid];
  if (target <= 0) return '';
  return getEntityDisplayName(world, target) ?? '';
}

const AUTOMATION_KEY: Record<UnitRole, keyof GameWorld['autoBehaviors'] | null> = {
  generalist: 'generalist',
  combat: 'combat',
  support: 'support',
  recon: 'recon',
  commander: null,
};

const ROLE_ORDER: UnitRole[] = ['generalist', 'combat', 'support', 'recon', 'commander'];

const BUILDING_TRAIN_MAP: Partial<Record<EntityKind, EntityKind[]>> = {
  [EntityKind.Lodge]: [MUDPAW_KIND, MEDIC_KIND, EntityKind.Sapper, EntityKind.Saboteur],
};

/** Sync unit and building rosters from ECS into store signals. */
export function syncRosters(world: GameWorld): void {
  const allEnts = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  const groups = new Map<UnitRole, RosterUnit[]>();

  for (let i = 0; i < allEnts.length; i++) {
    const eid = allEnts[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    if (hasComponent(world.ecs, eid, IsResource)) continue;

    const kind = EntityTypeTag.kind[eid] as EntityKind;
    const role = roleFor(kind);
    const state = UnitStateMachine.state[eid] as UnitState;
    const unit: RosterUnit = {
      eid,
      kind,
      label: getEntityDisplayName(world, eid),
      task: deriveTask(eid, state),
      targetName: targetNameFor(world, eid),
      hp: Health.current[eid],
      maxHp: Health.max[eid],
      hasOverride: TaskOverride.active[eid] === 1,
    };
    let list = groups.get(role);
    if (!list) {
      list = [];
      groups.set(role, list);
    }
    list.push(unit);
  }

  const roster: RosterGroup[] = [];
  for (const role of ROLE_ORDER) {
    const units = groups.get(role) ?? [];
    if (units.length === 0) continue;
    units.sort((a, b) => (a.task === 'idle' ? 0 : 1) - (b.task === 'idle' ? 0 : 1));
    const automationKey = AUTOMATION_KEY[role];
    roster.push({
      role,
      units,
      idleCount: units.filter((u) => u.task === 'idle').length,
      automationEnabled: automationKey ? world.autoBehaviors[automationKey] : false,
    });
  }
  store.unitRoster.value = roster;

  // --- Buildings ---
  const bldgEnts = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, IsBuilding]);
  const buildings: RosterBuilding[] = [];
  for (let i = 0; i < bldgEnts.length; i++) {
    const eid = bldgEnts[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    const slots = trainingQueueSlots.get(eid) ?? [];
    const count = TrainingQueue.count[eid] ?? 0;
    const timer = TrainingQueue.timer[eid] ?? 0;
    const queueItems = slots.map((k) => getPlayerTrainableDisplayName(k as EntityKind));
    const progress = count > 0 && timer > 0 ? 1 - timer / 300 : count > 0 ? 1 : 0;
    buildings.push({
      eid,
      kind,
      hp: Health.current[eid],
      maxHp: Health.max[eid],
      queueItems,
      queueProgress: Math.max(0, Math.min(1, progress)),
      canTrain: BUILDING_TRAIN_MAP[kind] ?? [],
    });
  }
  store.buildingRoster.value = buildings;
}
