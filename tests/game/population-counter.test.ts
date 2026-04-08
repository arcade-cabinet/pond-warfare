import { addComponent, hasComponent, query } from 'bitecs';
import { describe, expect, it } from 'vitest';
import { spawnEntity } from '@/ecs/archetypes';
import {
  AutonomousSpecialist,
  EntityTypeTag,
  FactionTag,
  Health,
  LegacySpecialistSnapshot,
} from '@/ecs/components';
import { createGameWorld } from '@/ecs/world';
import { deploySpecialistsAtMatchStart } from '@/game/init-entities/specialist-init';
import { MUDPAW_KIND } from '@/game/live-unit-kinds';
import { computePopulation } from '@/game/population-counter';
import { EntityKind, Faction } from '@/types';

describe('computePopulation', () => {
  it('does not count snapshot-harness specialists against food cap', () => {
    const world = createGameWorld();
    const lodge = spawnEntity(world, EntityKind.Lodge, 300, 500, Faction.Player);
    spawnEntity(world, MUDPAW_KIND, 280, 540, Faction.Player);
    spawnEntity(world, EntityKind.Clambed, 320, 420, Faction.Neutral);

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

    const fisher = Array.from(query(world.ecs, [FactionTag, EntityTypeTag, Health])).find(
      (eid) =>
        FactionTag.faction[eid] === Faction.Player &&
        EntityTypeTag.kind[eid] === MUDPAW_KIND &&
        hasComponent(world.ecs, eid, LegacySpecialistSnapshot),
    );

    expect(fisher).toBeDefined();

    computePopulation(world);

    expect(world.resources.food).toBe(1);
    expect(world.resources.maxFood).toBe(8);
  });

  it('counts in-match autonomous specialists against food cap', () => {
    const world = createGameWorld();
    spawnEntity(world, EntityKind.Lodge, 300, 500, Faction.Player);
    const specialist = spawnEntity(world, MUDPAW_KIND, 280, 540, Faction.Player);
    addAutonomousSpecialist(world, specialist);

    computePopulation(world);

    expect(world.resources.food).toBe(1);
    expect(world.resources.maxFood).toBe(8);
  });
});

function addAutonomousSpecialist(
  world: ReturnType<typeof createGameWorld>,
  eid: number,
): void {
  world.specialistAssignments.set(eid, {
    runtimeId: 'fisher',
    canonicalId: 'fisher',
    label: 'Fisher',
    mode: 'single_zone',
    operatingRadius: 160,
    centerX: 280,
    centerY: 540,
    anchorX: 280,
    anchorY: 540,
    anchorRadius: 0,
    engagementRadius: 0,
    engagementX: 280,
    engagementY: 540,
    projectionRange: 0,
  });
  addComponent(world.ecs, eid, AutonomousSpecialist);
}
