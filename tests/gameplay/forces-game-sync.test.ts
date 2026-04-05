/** Forces Roster Sync -- validates roster stays in sync with ECS state. */

import { beforeEach, describe, expect, it } from 'vitest';
import { spawnEntity } from '@/ecs/archetypes';
import { Health, TaskOverride, UnitStateMachine } from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { syncRosters } from '@/game/roster-sync';
import { EntityKind, Faction, UnitState } from '@/types';
import * as store from '@/ui/store';

describe('Forces roster sync', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    store.unitRoster.value = [];
    store.buildingRoster.value = [];
  });

  it('syncs player units into role-based groups', () => {
    spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    spawnEntity(world, EntityKind.Gatherer, 120, 100, Faction.Player);
    spawnEntity(world, EntityKind.Brawler, 200, 200, Faction.Player);

    syncRosters(world);

    const roster = store.unitRoster.value;
    expect(roster.length).toBe(2);
    const gatherers = roster.find((g) => g.role === 'gatherer');
    const combat = roster.find((g) => g.role === 'combat');
    expect(gatherers?.units.length).toBe(2);
    expect(combat?.units.length).toBe(1);
  });

  it('derives task from unit state machine', () => {
    const gatherer = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    UnitStateMachine.state[gatherer] = UnitState.GatherMove;
    const brawler = spawnEntity(world, EntityKind.Brawler, 200, 200, Faction.Player);
    UnitStateMachine.state[brawler] = UnitState.AttackMovePatrol;
    syncRosters(world);
    const roster = store.unitRoster.value;
    expect(roster.find((g) => g.role === 'gatherer')?.units[0]?.task).toBe('gathering-fish');
    expect(roster.find((g) => g.role === 'combat')?.units[0]?.task).toBe('patrolling');
  });

  it('tracks idle count per group', () => {
    const g1 = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    const g2 = spawnEntity(world, EntityKind.Gatherer, 120, 100, Faction.Player);
    UnitStateMachine.state[g1] = UnitState.Idle;
    UnitStateMachine.state[g2] = UnitState.GatherMove;

    syncRosters(world);

    const gatherers = store.unitRoster.value.find((g) => g.role === 'gatherer');
    expect(gatherers?.idleCount).toBe(1);
  });

  it('reflects HP changes after re-sync', () => {
    const brawler = spawnEntity(world, EntityKind.Brawler, 200, 200, Faction.Player);
    syncRosters(world);
    const hpBefore = store.unitRoster.value.find((g) => g.role === 'combat')?.units[0]?.hp ?? 0;
    expect(hpBefore).toBeGreaterThan(0);
    Health.current[brawler] = 20;
    syncRosters(world);
    const hpAfter = store.unitRoster.value.find((g) => g.role === 'combat')?.units[0]?.hp ?? 0;
    expect(hpAfter).toBe(20);
    expect(hpAfter).toBeLessThan(hpBefore);
  });

  it('excludes dead units from roster', () => {
    const g = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    syncRosters(world);
    expect(store.unitRoster.value.length).toBe(1);
    Health.current[g] = 0;
    syncRosters(world);
    expect(store.unitRoster.value.length).toBe(0);
  });

  it('includes newly spawned units after sync', () => {
    syncRosters(world);
    expect(store.unitRoster.value.length).toBe(0);
    spawnEntity(world, EntityKind.Sniper, 300, 300, Faction.Player);
    syncRosters(world);
    const combat = store.unitRoster.value.find((g) => g.role === 'combat');
    expect(combat?.units.length).toBe(1);
    expect(combat?.units[0].kind).toBe(EntityKind.Sniper);
  });

  it('excludes enemy units from player roster', () => {
    spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    spawnEntity(world, EntityKind.Gator, 500, 500, Faction.Enemy);
    syncRosters(world);
    const totalUnits = store.unitRoster.value.reduce((sum, g) => sum + g.units.length, 0);
    expect(totalUnits).toBe(1);
  });

  it('marks units with TaskOverride', () => {
    const g = spawnEntity(world, EntityKind.Gatherer, 100, 100, Faction.Player);
    TaskOverride.active[g] = 1;
    syncRosters(world);
    const unit = store.unitRoster.value.find((r) => r.role === 'gatherer')?.units[0];
    expect(unit?.hasOverride).toBe(true);
  });

  it('syncs buildings into buildingRoster', () => {
    spawnEntity(world, EntityKind.Lodge, 500, 500, Faction.Player);
    syncRosters(world);
    expect(store.buildingRoster.value.length).toBe(1);
    expect(store.buildingRoster.value[0].kind).toBe(EntityKind.Lodge);
  });
});
