import { query } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { spawnEntity } from '@/ecs/archetypes';
import { EntityTypeTag, FactionTag, Health } from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { MUDPAW_KIND } from '@/game/live-unit-kinds';
import { BuildGoal } from '@/governor/goals/build-goal';
import { EntityKind, Faction } from '@/types';
import type { RosterBuilding, RosterGroup } from '@/ui/roster-types';
import * as store from '@/ui/store';

let world: GameWorld;

vi.mock('@/game', () => ({
  game: {
    get world() {
      return world;
    },
  },
}));
vi.mock('@/audio/audio-system', () => ({
  audio: new Proxy({}, { get: () => vi.fn() }),
}));

describe('BuildGoal', () => {
  beforeEach(() => {
    world = createGameWorld();
    store.unitRoster.value = [];
    store.buildingRoster.value = [];
    store.fish.value = 220;
    store.logs.value = 150;
  });

  it('places an armory wing near the lodge when resources are available', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 320, 460, Faction.Player);
    const mudpaw = spawnEntity(world, MUDPAW_KIND, 280, 430, Faction.Player);

    world.resources.fish = 220;
    world.resources.logs = 150;
    world.gameRng = {
      next: (() => {
        const values = [0, 0.5];
        let index = 0;
        return () => values[index++] ?? 0.5;
      })(),
    } as typeof world.gameRng;

    store.buildingRoster.value = [
      {
        eid: lodge,
        kind: EntityKind.Lodge,
        hp: 1500,
        maxHp: 1500,
        queueItems: [],
        queueProgress: 0,
        canTrain: [MUDPAW_KIND],
      } satisfies RosterBuilding,
    ];
    store.unitRoster.value = [
      {
        role: 'generalist',
        idleCount: 1,
        automationEnabled: false,
        units: [{ eid: mudpaw, kind: MUDPAW_KIND, task: 'idle', targetName: '', hp: 30, maxHp: 30, hasOverride: false }],
      } satisfies RosterGroup,
    ];

    new BuildGoal().activate();

    const armory = Array.from(query(world.ecs, [EntityTypeTag, FactionTag, Health])).find(
      (eid) =>
        EntityTypeTag.kind[eid] === EntityKind.Armory &&
        FactionTag.faction[eid] === Faction.Player &&
        Health.current[eid] > 0,
    );

    expect(armory).toBeDefined();
  });
});
