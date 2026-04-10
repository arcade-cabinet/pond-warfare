import { hasComponent, query } from 'bitecs';
import { describe, expect, it } from 'vitest';
import { spawnEntity } from '@/ecs/archetypes';
import {
  AutonomousSpecialist,
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
} from '@/ecs/components';
import { createGameWorld } from '@/ecs/world';
import { buildActionPanel } from '@/game/action-panel';
import {
  getSpecialistBlueprintCap,
  initializeSpecialistBlueprintCaps,
  initializeSpecialistProgression,
} from '@/game/specialist-blueprints';
import { MUDPAW_KIND } from '@/game/live-unit-kinds';
import { computePopulation } from '@/game/population-counter';
import { EntityKind, Faction } from '@/types';
import { actionButtons } from '@/ui/action-panel';

describe('specialist blueprints', () => {
  it('initializes field caps from Pearl specialist upgrades', () => {
    const world = createGameWorld();
    initializeSpecialistBlueprintCaps(world, {
      rank: 1,
      pearls: 0,
      totalPearlsEarned: 10,
      upgradeRanks: {
        blueprint_fisher: 2,
        blueprint_shaman: 1,
      },
    });

    expect(getSpecialistBlueprintCap(world, 'fisher')).toBe(2);
    expect(getSpecialistBlueprintCap(world, 'shaman')).toBe(1);
    expect(getSpecialistBlueprintCap(world, 'logger')).toBe(0);
  });

  it('lets the Lodge train a blueprint specialist instead of auto-spawning it at match start', () => {
    const world = createGameWorld();
    world.resources.fish = 200;
    world.resources.logs = 50;
    world.resources.rocks = 50;
    world.commanderModifiers.passiveFisherCostReduction = 0.5;

    const lodge = spawnEntity(world, EntityKind.Lodge, 320, 400, Faction.Player);
    Building.progress[lodge] = 100;
    initializeSpecialistBlueprintCaps(world, {
      rank: 1,
      pearls: 0,
      totalPearlsEarned: 10,
      upgradeRanks: { blueprint_fisher: 1 },
    });
    computePopulation(world);

    world.selection = [];
    buildActionPanel(world);

    const fisherButton = actionButtons.value.find((button) => button.title === 'Fisher');
    expect(fisherButton).toBeDefined();
    expect(fisherButton?.affordable).toBe(true);
    expect(fisherButton?.cost).toContain('6F');

    fisherButton?.onClick();

    const fisher = Array.from(query(world.ecs, [FactionTag, EntityTypeTag, Health])).find(
      (eid) =>
        FactionTag.faction[eid] === Faction.Player &&
        EntityTypeTag.kind[eid] === MUDPAW_KIND &&
        hasComponent(world.ecs, eid, AutonomousSpecialist),
    );

    expect(fisher).toBeDefined();
    expect(world.resources.fish).toBe(194);
    expect(world.resources.food).toBe(1);
    expect(world.stats.unitsTrained).toBe(1);
    expect(world.specialistAssignments.get(fisher ?? -1)?.runtimeId).toBe('fisher');

    buildActionPanel(world);
    const cappedFisherButton = actionButtons.value.find((button) => button.title === 'Fisher');
    expect(cappedFisherButton?.affordable).toBe(false);
    expect(cappedFisherButton?.requires).toContain('Open cap');
  });

  it('initializes specialist zone bonuses from Pearl specialist upgrades', () => {
    const world = createGameWorld();

    initializeSpecialistProgression(world, {
      rank: 2,
      pearls: 0,
      totalPearlsEarned: 30,
      upgradeRanks: {
        blueprint_ranger: 1,
        ranger_projection_range: 2,
        ranger_engagement_radius: 1,
      },
    });

    expect(getSpecialistBlueprintCap(world, 'ranger')).toBe(1);
    expect(world.specialistZoneBonuses.ranger?.projection_range).toBe(40);
    expect(world.specialistZoneBonuses.ranger?.engagement_radius).toBe(24);
  });
});
