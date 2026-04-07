import { query } from 'bitecs';
import { describe, expect, it } from 'vitest';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  Patrol,
  Position,
  TaskOverride,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { createGameWorld } from '@/ecs/world';
import {
  BOMBARDIER_KIND,
  FISHER_KIND,
  GUARD_KIND,
  LOOKOUT_KIND,
} from '@/game/live-unit-kinds';
import { deploySpecialistsAtMatchStart } from '@/game/init-entities/specialist-init';
import { EntityKind, Faction, UnitState } from '@/types';

function findPlayerUnit(world: ReturnType<typeof createGameWorld>, kind: EntityKind): number {
  const eid = Array.from(query(world.ecs, [FactionTag, EntityTypeTag, Health])).find(
    (candidate) =>
      FactionTag.faction[candidate] === Faction.Player &&
      EntityTypeTag.kind[candidate] === kind &&
      Health.current[candidate] > 0,
  );
  if (eid == null) {
    throw new Error(`No living player unit found for kind ${kind}`);
  }
  return eid;
}

describe('deploySpecialistsAtMatchStart', () => {
  it('applies fisher stats and gather override targeting fish nodes', () => {
    const world = createGameWorld();
    const lodge = spawnEntity(world, EntityKind.Lodge, 300, 500, Faction.Player);
    const fishNode = spawnEntity(world, EntityKind.Clambed, 320, 420, Faction.Neutral);

    deploySpecialistsAtMatchStart(
      world,
      {
        rank: 1,
        pearls: 0,
        totalPearlsEarned: 10,
        upgradeRanks: { blueprint_fisher: 1 },
      },
      lodge,
    );

    const fisher = findPlayerUnit(world, FISHER_KIND);
    expect(Health.max[fisher]).toBe(25);
    expect(Health.current[fisher]).toBe(25);
    expect(Combat.damage[fisher]).toBe(0);
    expect(Velocity.speed[fisher]).toBeCloseTo(2.0);
    expect(TaskOverride.active[fisher]).toBe(1);
    expect(TaskOverride.task[fisher]).toBe(UnitState.GatherMove);
    expect(TaskOverride.resourceKind[fisher]).toBe(EntityKind.Clambed);
    expect(TaskOverride.targetEntity[fisher]).toBe(fishNode);
    expect(UnitStateMachine.state[fisher]).toBe(UnitState.GatherMove);
    expect(UnitStateMachine.targetEntity[fisher]).toBe(fishNode);
  });

  it('applies guard stats on the canonical combat chassis and anchors it to the lodge defense area', () => {
    const world = createGameWorld();
    const lodge = spawnEntity(world, EntityKind.Lodge, 300, 500, Faction.Player);

    deploySpecialistsAtMatchStart(
      world,
      {
        rank: 1,
        pearls: 0,
        totalPearlsEarned: 10,
        upgradeRanks: { blueprint_guard: 1 },
      },
      lodge,
    );

    const guard = findPlayerUnit(world, GUARD_KIND);
    expect(Health.max[guard]).toBe(80);
    expect(Combat.damage[guard]).toBe(6);
    expect(Velocity.speed[guard]).toBeCloseTo(1.2);
    expect(TaskOverride.active[guard]).toBe(1);
    expect(TaskOverride.task[guard]).toBe(UnitState.AttackMovePatrol);
    expect(TaskOverride.targetEntity[guard]).toBe(lodge);
    expect(UnitStateMachine.state[guard]).toBe(UnitState.AttackMovePatrol);
    expect(UnitStateMachine.targetEntity[guard]).toBe(lodge);
  });

  it('starts lookout patrols across the upper map instead of leaving them idle', () => {
    const world = createGameWorld();
    const lodge = spawnEntity(world, EntityKind.Lodge, 300, 500, Faction.Player);

    deploySpecialistsAtMatchStart(
      world,
      {
        rank: 1,
        pearls: 0,
        totalPearlsEarned: 10,
        upgradeRanks: { blueprint_lookout: 1 },
      },
      lodge,
    );

    const lookout = findPlayerUnit(world, LOOKOUT_KIND);
    const route = world.patrolWaypoints.get(lookout) ?? [];

    expect(Health.max[lookout]).toBe(15);
    expect(Combat.damage[lookout]).toBe(0);
    expect(Velocity.speed[lookout]).toBeCloseTo(3.0);
    expect(TaskOverride.active[lookout]).toBe(1);
    expect(Patrol.active[lookout]).toBe(1);
    expect(UnitStateMachine.state[lookout]).toBe(UnitState.PatrolMove);
    expect(route.length).toBeGreaterThanOrEqual(3);
    expect(UnitStateMachine.targetY[lookout]).toBeLessThan(Position.y[lookout]);
  });

  it('applies dual-zone range upgrades to Bombardier spawn state', () => {
    const world = createGameWorld();
    const lodge = spawnEntity(world, EntityKind.Lodge, 300, 500, Faction.Player);

    deploySpecialistsAtMatchStart(
      world,
      {
        rank: 2,
        pearls: 0,
        totalPearlsEarned: 20,
        upgradeRanks: {
          blueprint_bombardier: 1,
          bombardier_engagement_radius: 2,
          bombardier_projection_range: 1,
        },
      },
      lodge,
    );

    const bombardier = findPlayerUnit(world, BOMBARDIER_KIND);
    const assignment = world.specialistAssignments.get(bombardier);

    expect(Combat.attackRange[bombardier]).toBe(340);
    expect(assignment?.engagementRadius).toBe(206);
    expect(assignment?.projectionRange).toBe(274);
  });
});
