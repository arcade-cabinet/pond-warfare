import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Goal } from 'yuka';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  TaskOverride,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { MUDPAW_KIND, SAPPER_KIND } from '@/game/live-unit-kinds';
import { EntityKind, Faction, UnitState } from '@/types';
import type { RosterGroup, RosterUnit } from '@/ui/roster-types';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';

let world: GameWorld;

vi.mock('@/game', () => ({
  game: {
    get world() {
      return world;
    },
    syncUIStore: vi.fn(),
  },
}));

function createUnit(kind: EntityKind, x = 100, y = 100): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, TaskOverride);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 30;
  Health.max[eid] = 30;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  UnitStateMachine.state[eid] = UnitState.Idle;
  TaskOverride.active[eid] = 0;
  TaskOverride.task[eid] = 0;
  TaskOverride.targetEntity[eid] = 0;
  return eid;
}

function createBuilding(kind: EntityKind, current: number, max: number, x = 200, y = 200): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = current;
  Health.max[eid] = max;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  return eid;
}

function rosterUnit(eid: number, kind: EntityKind, task: string): RosterUnit {
  return {
    eid,
    kind,
    task: task as 'idle',
    targetName: '',
    hp: 30,
    maxHp: 30,
    hasOverride: false,
  };
}

function rosterGroup(role: RosterGroup['role'], units: RosterUnit[]): RosterGroup {
  return {
    role,
    idleCount: units.filter((unit) => unit.task === 'idle').length,
    automationEnabled: false,
    units,
  };
}

describe('DefendGoal repair routing', () => {
  beforeEach(() => {
    world = createGameWorld();
    store.unitRoster.value = [];
    store.buildingRoster.value = [];
    storeV3.progressionLevel.value = 6;
    storeV3.currentRunPurchasedNodeIds.value = [];
  });

  it('retasks a log-gathering Mudpaw to repair a damaged tower during repair-speed runs', async () => {
    const { DefendGoal } = await import('@/governor/goals/defend-goal');

    createBuilding(EntityKind.Lodge, 500, 500, 220, 220);
    const tower = createBuilding(EntityKind.Tower, 90, 150, 260, 180);
    const mudpaw = createUnit(MUDPAW_KIND, 180, 180);
    const sapper = createUnit(SAPPER_KIND, 160, 200);
    world.resources.logs = 40;
    storeV3.currentRunPurchasedNodeIds.value = ['defense_repair_speed_t0'];
    store.unitRoster.value = [
      rosterGroup('generalist', [rosterUnit(mudpaw, MUDPAW_KIND, 'gathering-logs')]),
      rosterGroup('combat', [rosterUnit(sapper, SAPPER_KIND, 'idle')]),
    ];

    const goal = new DefendGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(UnitStateMachine.state[mudpaw]).toBe(UnitState.RepairMove);
    expect(UnitStateMachine.targetEntity[mudpaw]).toBe(tower);
    expect(TaskOverride.active[mudpaw]).toBe(0);
    expect(UnitStateMachine.state[sapper]).toBe(UnitState.AttackMovePatrol);
  });

  it('keeps a lone Mudpaw on defense instead of peeling it off to repair', async () => {
    const { DefendGoal } = await import('@/governor/goals/defend-goal');

    createBuilding(EntityKind.Lodge, 500, 500, 220, 220);
    createBuilding(EntityKind.Tower, 90, 150, 260, 180);
    const mudpaw = createUnit(MUDPAW_KIND, 180, 180);
    world.resources.logs = 40;
    storeV3.currentRunPurchasedNodeIds.value = ['defense_repair_speed_t0'];
    store.unitRoster.value = [rosterGroup('generalist', [rosterUnit(mudpaw, MUDPAW_KIND, 'idle')])];

    const goal = new DefendGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(UnitStateMachine.state[mudpaw]).toBe(UnitState.AttackMovePatrol);
    expect(UnitStateMachine.targetEntity[mudpaw]).not.toBe(0);
  });
});
