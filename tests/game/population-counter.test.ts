import { hasComponent, query } from 'bitecs';
import { describe, expect, it } from 'vitest';
import { spawnEntity } from '@/ecs/archetypes';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  PrestigeAutoDeploy,
} from '@/ecs/components';
import { createGameWorld } from '@/ecs/world';
import { deploySpecialistsAtMatchStart } from '@/game/init-entities/specialist-init';
import { computePopulation } from '@/game/population-counter';
import { EntityKind, Faction } from '@/types';

describe('computePopulation', () => {
  it('does not count prestige auto-deploy specialists against food cap', () => {
    const world = createGameWorld();
    const lodge = spawnEntity(world, EntityKind.Lodge, 300, 500, Faction.Player);
    spawnEntity(world, EntityKind.Gatherer, 280, 540, Faction.Player);
    spawnEntity(world, EntityKind.Clambed, 320, 420, Faction.Neutral);

    deploySpecialistsAtMatchStart(
      world,
      {
        rank: 1,
        pearls: 0,
        totalPearlsEarned: 10,
        upgradeRanks: { auto_deploy_fisher: 1 },
      },
      lodge,
    );

    const fisher = Array.from(query(world.ecs, [FactionTag, EntityTypeTag, Health])).find(
      (eid) =>
        FactionTag.faction[eid] === Faction.Player &&
        EntityTypeTag.kind[eid] === EntityKind.Gatherer &&
        hasComponent(world.ecs, eid, PrestigeAutoDeploy),
    );

    expect(fisher).toBeDefined();

    computePopulation(world);

    expect(world.resources.food).toBe(1);
    expect(world.resources.maxFood).toBe(8);
  });
});
