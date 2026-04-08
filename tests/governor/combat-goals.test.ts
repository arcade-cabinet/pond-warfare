/**
 * Combat Goal Tests
 *
 * Validates that combat-goal reassignment keeps normal governor units mobile
 * without hijacking prestige-locked specialists.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Goal } from 'yuka';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  SnapshotHarnessSpecialist,
  TaskOverride,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { SAPPER_KIND } from '@/game/live-unit-kinds';
import { EntityKind, Faction, UnitState } from '@/types';
import type { RosterGroup, RosterUnit } from '@/ui/roster-types';
import * as store from '@/ui/store';

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

function createEnemy(kind = EntityKind.Gator, x = 200, y = 200): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 40;
  Health.max[eid] = 40;
  FactionTag.faction[eid] = Faction.Enemy;
  EntityTypeTag.kind[eid] = kind;
  return eid;
}

function rosterUnit(eid: number, kind: EntityKind, task: string, hasOverride = false): RosterUnit {
  return { eid, kind, task: task as 'idle', targetName: '', hp: 30, maxHp: 30, hasOverride };
}

function rosterGroup(role: RosterGroup['role'], units: RosterUnit[]): RosterGroup {
  return {
    role,
    idleCount: units.filter((u) => u.task === 'idle').length,
    automationEnabled: false,
    units,
  };
}

function createPlayerLodge(x = 200, y = 200): number {
  const lodge = addEntity(world.ecs);
  addComponent(world.ecs, lodge, Position);
  addComponent(world.ecs, lodge, Health);
  addComponent(world.ecs, lodge, FactionTag);
  addComponent(world.ecs, lodge, EntityTypeTag);
  Position.x[lodge] = x;
  Position.y[lodge] = y;
  Health.current[lodge] = 500;
  Health.max[lodge] = 500;
  FactionTag.faction[lodge] = Faction.Player;
  EntityTypeTag.kind[lodge] = EntityKind.Lodge;
  return lodge;
}

describe('DefendGoal', () => {
  beforeEach(() => {
    world = createGameWorld();
    store.unitRoster.value = [];
  });

  it('skips locked specialist units with overrides', async () => {
    const { DefendGoal } = await import('@/governor/goals/defend-goal');

    createPlayerLodge();
    const regular = createUnit(SAPPER_KIND);
    const specialist = createUnit(SAPPER_KIND, 120, 120);
    addComponent(world.ecs, specialist, SnapshotHarnessSpecialist);

    store.unitRoster.value = [
      rosterGroup('combat', [
        rosterUnit(regular, SAPPER_KIND, 'idle'),
        rosterUnit(specialist, SAPPER_KIND, 'patrolling', true),
      ]),
    ];

    const goal = new DefendGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(TaskOverride.active[regular]).toBe(1);
    expect(UnitStateMachine.state[regular]).toBe(UnitState.AttackMovePatrol);
    expect(TaskOverride.active[specialist]).toBe(0);
    expect(UnitStateMachine.state[specialist]).toBe(UnitState.Idle);
  });

  it('can recall regular attackers without touching prestige-locked specialists', async () => {
    const { DefendGoal } = await import('@/governor/goals/defend-goal');

    const lodge = createPlayerLodge(220, 220);
    const regular = createUnit(SAPPER_KIND);
    TaskOverride.active[regular] = 1;
    TaskOverride.task[regular] = UnitState.AttackMove;
    UnitStateMachine.state[regular] = UnitState.AttackMove;

    const specialist = createUnit(SAPPER_KIND, 120, 120);
    addComponent(world.ecs, specialist, SnapshotHarnessSpecialist);
    TaskOverride.active[specialist] = 1;
    TaskOverride.task[specialist] = UnitState.AttackMove;
    UnitStateMachine.state[specialist] = UnitState.AttackMove;

    store.unitRoster.value = [
      rosterGroup('combat', [
        rosterUnit(regular, SAPPER_KIND, 'attacking', true),
        rosterUnit(specialist, SAPPER_KIND, 'attacking', true),
      ]),
    ];

    const goal = new DefendGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(TaskOverride.targetEntity[regular]).toBe(lodge);
    expect(UnitStateMachine.state[regular]).toBe(UnitState.AttackMovePatrol);
    expect(TaskOverride.targetEntity[specialist]).toBe(0);
    expect(UnitStateMachine.state[specialist]).toBe(UnitState.AttackMove);
  });
});

describe('AttackGoal', () => {
  beforeEach(() => {
    world = createGameWorld();
    store.unitRoster.value = [];
  });

  it('does not retask locked specialist units during an attack order', async () => {
    const { AttackGoal, MIN_ATTACK_ARMY } = await import('@/governor/goals/attack-goal');

    const regularA = createUnit(SAPPER_KIND, 100, 100);
    const regularB = createUnit(SAPPER_KIND, 120, 100);
    const regularC = createUnit(SAPPER_KIND, 140, 100);
    const specialist = createUnit(SAPPER_KIND, 160, 100);
    addComponent(world.ecs, specialist, SnapshotHarnessSpecialist);
    const closeEnemy = createEnemy(EntityKind.Gator, 200, 200);
    createEnemy(EntityKind.Snake, 260, 220);

    store.unitRoster.value = [
      rosterGroup('combat', [
        rosterUnit(regularA, SAPPER_KIND, 'idle'),
        rosterUnit(regularB, SAPPER_KIND, 'idle'),
        rosterUnit(regularC, SAPPER_KIND, 'defending'),
        rosterUnit(specialist, SAPPER_KIND, 'patrolling', true),
      ]),
    ];

    expect(MIN_ATTACK_ARMY).toBe(3);
    const goal = new AttackGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(TaskOverride.active[regularA]).toBe(1);
    expect(TaskOverride.active[regularB]).toBe(1);
    expect(TaskOverride.active[regularC]).toBe(1);
    expect(TaskOverride.targetEntity[regularA]).toBe(closeEnemy);
    expect(TaskOverride.targetEntity[regularB]).toBe(closeEnemy);
    expect(TaskOverride.targetEntity[regularC]).toBe(closeEnemy);
    expect(TaskOverride.active[specialist]).toBe(0);
  });

  it('can retarget regular attackers while leaving prestige-locked specialists alone', async () => {
    const { AttackGoal } = await import('@/governor/goals/attack-goal');

    const regularA = createUnit(SAPPER_KIND, 100, 100);
    const regularB = createUnit(SAPPER_KIND, 120, 100);
    const regularC = createUnit(SAPPER_KIND, 140, 100);
    TaskOverride.active[regularA] = 1;
    TaskOverride.task[regularA] = UnitState.AttackMove;
    TaskOverride.active[regularB] = 1;
    TaskOverride.task[regularB] = UnitState.AttackMovePatrol;

    const specialist = createUnit(SAPPER_KIND, 160, 100);
    addComponent(world.ecs, specialist, SnapshotHarnessSpecialist);
    TaskOverride.active[specialist] = 1;
    TaskOverride.task[specialist] = UnitState.AttackMove;

    const closeEnemy = createEnemy(EntityKind.Gator, 200, 200);
    createEnemy(EntityKind.Snake, 260, 220);

    store.unitRoster.value = [
      rosterGroup('combat', [
        rosterUnit(regularA, SAPPER_KIND, 'attacking', true),
        rosterUnit(regularB, SAPPER_KIND, 'defending', true),
        rosterUnit(regularC, SAPPER_KIND, 'idle'),
        rosterUnit(specialist, SAPPER_KIND, 'attacking', true),
      ]),
    ];

    const goal = new AttackGoal();
    goal.activate();

    expect(goal.status).toBe(Goal.STATUS.COMPLETED);
    expect(TaskOverride.targetEntity[regularA]).toBe(closeEnemy);
    expect(TaskOverride.targetEntity[regularB]).toBe(closeEnemy);
    expect(TaskOverride.targetEntity[regularC]).toBe(closeEnemy);
    expect(TaskOverride.targetEntity[specialist]).toBe(0);
  });
});
