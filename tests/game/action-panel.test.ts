import { beforeEach, describe, expect, it } from 'vitest';
import { spawnEntity } from '@/ecs/archetypes';
import { Building } from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { buildActionPanel } from '@/game/action-panel';
import { EntityKind, Faction } from '@/types';
import { actionButtons, queueItems } from '@/ui/action-panel';

describe('buildActionPanel', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    actionButtons.value = [];
    queueItems.value = [];
  });

  it('shows the stage-1 Mudpaw baseline from the Lodge command panel', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 320, 400, Faction.Player);
    Building.progress[lodge] = 100;
    world.selection = [];

    buildActionPanel(world);

    expect(actionButtons.value.map((button) => button.title)).toEqual(['Mudpaw']);
  });

  it('does not expose obsolete Armory training actions', () => {
    const armory = spawnEntity(world, EntityKind.Armory, 320, 400, Faction.Player);
    Building.progress[armory] = 100;
    world.selection = [armory];

    buildActionPanel(world);

    expect(actionButtons.value).toEqual([]);
    expect(queueItems.value).toEqual([]);
  });
});
