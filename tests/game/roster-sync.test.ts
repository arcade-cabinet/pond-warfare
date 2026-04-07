import { beforeEach, describe, expect, it } from 'vitest';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  TaskOverride,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import {
  LOOKOUT_KIND,
  MEDIC_KIND,
  MUDPAW_KIND,
  SAPPER_KIND,
  SHAMAN_KIND,
} from '@/game/live-unit-kinds';
import { syncRosters } from '@/game/roster-sync';
import { EntityKind, Faction, UnitState } from '@/types';
import type { RosterGroup } from '@/ui/roster-types';
import * as store from '@/ui/store';

/** Find a roster group by role, throwing if missing (avoids non-null assertions). */
function findGroup(role: string): RosterGroup {
  const g = store.unitRoster.value.find((r) => r.role === role);
  if (!g) throw new Error(`Role "${role}" not found in roster`);
  return g;
}

describe('syncRosters', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 60;
    store.unitRoster.value = [];
    store.buildingRoster.value = [];
  });

  it('produces empty rosters for an empty world', () => {
    syncRosters(world);
    expect(store.unitRoster.value).toEqual([]);
    expect(store.buildingRoster.value).toEqual([]);
  });

  it('groups units by role correctly', () => {
    spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);
    spawnEntity(world, SAPPER_KIND, 200, 200, Faction.Player);
    spawnEntity(world, MEDIC_KIND, 300, 300, Faction.Player);
    spawnEntity(world, SHAMAN_KIND, 350, 350, Faction.Player);
    spawnEntity(world, LOOKOUT_KIND, 400, 400, Faction.Player);
    spawnEntity(world, EntityKind.Commander, 500, 500, Faction.Player);

    syncRosters(world);
    const roles = store.unitRoster.value.map((g) => g.role);
    expect(roles).toEqual(['generalist', 'combat', 'support', 'recon', 'commander']);
    expect(findGroup('generalist').units).toHaveLength(1);
    expect(findGroup('combat').units).toHaveLength(1);
    expect(findGroup('support').units).toHaveLength(2);
  });

  it('sorts idle units to top within a group', () => {
    const g1 = spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);
    const g2 = spawnEntity(world, MUDPAW_KIND, 200, 200, Faction.Player);
    const g3 = spawnEntity(world, MUDPAW_KIND, 300, 300, Faction.Player);
    UnitStateMachine.state[g1] = UnitState.Gathering;
    UnitStateMachine.state[g2] = UnitState.Idle;
    UnitStateMachine.state[g3] = UnitState.Gathering;

    syncRosters(world);
    const group = findGroup('generalist');
    expect(group.units[0].task).toBe('idle');
    expect(group.idleCount).toBe(1);
  });

  it('maps UnitState.Idle to idle task', () => {
    const eid = spawnEntity(world, SAPPER_KIND, 100, 100, Faction.Player);
    UnitStateMachine.state[eid] = UnitState.Idle;
    syncRosters(world);
    expect(findGroup('combat').units[0].task).toBe('idle');
  });

  it('maps GatherMove to gathering-fish when targeting Clambed', () => {
    const clambed = spawnEntity(world, EntityKind.Clambed, 150, 150, Faction.Neutral);
    const mudpaw = spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);
    UnitStateMachine.state[mudpaw] = UnitState.GatherMove;
    UnitStateMachine.targetEntity[mudpaw] = clambed;

    syncRosters(world);
    const unit = findGroup('generalist').units[0];
    expect(unit.label).toBe('Mudpaw');
    expect(unit.task).toBe('gathering-fish');
    expect(unit.targetName).toBe('Clambed');
  });

  it('maps GatherMove to gathering-logs when targeting Cattail', () => {
    const cattail = spawnEntity(world, EntityKind.Cattail, 150, 150, Faction.Neutral);
    const mudpaw = spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);
    UnitStateMachine.state[mudpaw] = UnitState.GatherMove;
    UnitStateMachine.targetEntity[mudpaw] = cattail;

    syncRosters(world);
    expect(findGroup('generalist').units[0].task).toBe('gathering-logs');
  });

  it('maps Attacking state to attacking task', () => {
    const eid = spawnEntity(world, SAPPER_KIND, 100, 100, Faction.Player);
    UnitStateMachine.state[eid] = UnitState.Attacking;
    syncRosters(world);
    expect(findGroup('combat').units[0].task).toBe('attacking');
  });

  it('maps AttackMovePatrol to patrolling task', () => {
    const eid = spawnEntity(world, SAPPER_KIND, 100, 100, Faction.Player);
    UnitStateMachine.state[eid] = UnitState.AttackMovePatrol;
    syncRosters(world);
    expect(findGroup('combat').units[0].task).toBe('patrolling');
  });

  it('detects TaskOverride on units', () => {
    const eid = spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);
    TaskOverride.active[eid] = 1;
    syncRosters(world);
    expect(store.unitRoster.value[0].units[0].hasOverride).toBe(true);
  });

  it('reads auto-behavior toggles from world', () => {
    spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);
    world.autoBehaviors.gatherer = true;
    syncRosters(world);
    expect(findGroup('generalist').autoEnabled).toBe(true);
  });

  it('excludes enemy units from roster', () => {
    spawnEntity(world, EntityKind.Gator, 100, 100, Faction.Enemy);
    spawnEntity(world, MUDPAW_KIND, 200, 200, Faction.Player);
    syncRosters(world);
    expect(store.unitRoster.value).toHaveLength(1);
    expect(store.unitRoster.value[0].role).toBe('generalist');
  });

  it('includes player buildings with queue data', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 500, 500, Faction.Player);
    Building.progress[lodge] = 100;
    TrainingQueue.count[lodge] = 1;
    TrainingQueue.timer[lodge] = 150;
    trainingQueueSlots.set(lodge, [MUDPAW_KIND]);

    syncRosters(world);
    const bldgs = store.buildingRoster.value;
    expect(bldgs).toHaveLength(1);
    expect(bldgs[0].kind).toBe(EntityKind.Lodge);
    expect(bldgs[0].queueItems).toEqual(['Mudpaw']);
    expect(bldgs[0].queueProgress).toBeCloseTo(0.5, 1);
    expect(bldgs[0].canTrain).toEqual([
      MUDPAW_KIND,
      MEDIC_KIND,
      EntityKind.Sapper,
      EntityKind.Saboteur,
    ]);

    trainingQueueSlots.delete(lodge);
  });

  it('uses specialist labels instead of collapsing autonomous gather specialists into a generic worker label', () => {
    const fisher = spawnEntity(world, MUDPAW_KIND, 100, 100, Faction.Player);
    const logger = spawnEntity(world, MUDPAW_KIND, 140, 100, Faction.Player);
    world.specialistAssignments.set(fisher, {
      runtimeId: 'fisher',
      canonicalId: 'fisher',
      label: 'Fisher',
      mode: 'single_zone',
      operatingRadius: 160,
      centerX: 100,
      centerY: 100,
      anchorX: 100,
      anchorY: 100,
      anchorRadius: 0,
      engagementRadius: 0,
      engagementX: 100,
      engagementY: 100,
      projectionRange: 0,
    });
    world.specialistAssignments.set(logger, {
      runtimeId: 'logger',
      canonicalId: 'logger',
      label: 'Logger',
      mode: 'single_zone',
      operatingRadius: 170,
      centerX: 140,
      centerY: 100,
      anchorX: 140,
      anchorY: 100,
      anchorRadius: 0,
      engagementRadius: 0,
      engagementX: 140,
      engagementY: 100,
      projectionRange: 0,
    });

    syncRosters(world);

    expect(findGroup('generalist').units.map((unit) => unit.label)).toEqual(['Fisher', 'Logger']);
  });
});
