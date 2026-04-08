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
import * as storeV3 from '@/ui/store-v3';

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
    store.food.value = 2;
    store.maxFood.value = 8;
    storeV3.progressionLevel.value = 1;
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
    expect(world.selection).toEqual([mudpaw]);
  });

  it('assigns two Mudpaws to key stage-six build follow-up and places a tower after a completed armory', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 320, 460, Faction.Player);
    const builderA = spawnEntity(world, MUDPAW_KIND, 260, 430, Faction.Player);
    const builderB = spawnEntity(world, MUDPAW_KIND, 300, 430, Faction.Player);
    const armory = spawnEntity(world, EntityKind.Armory, 360, 420, Faction.Player);

    Health.current[armory] = Health.max[armory];
    world.resources.fish = 260;
    world.resources.logs = 320;
    store.fish.value = 260;
    store.logs.value = 320;
    store.food.value = 2;
    store.maxFood.value = 8;
    storeV3.progressionLevel.value = 6;
    world.gameRng = {
      next: (() => {
        const values = [0.25, 0.5];
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
      {
        eid: armory,
        kind: EntityKind.Armory,
        hp: Health.current[armory],
        maxHp: Health.max[armory],
        queueItems: [],
        queueProgress: 0,
        canTrain: [],
      } satisfies RosterBuilding,
    ];
    store.unitRoster.value = [
      {
        role: 'generalist',
        idleCount: 2,
        automationEnabled: false,
        units: [
          { eid: builderA, kind: MUDPAW_KIND, task: 'idle', targetName: '', hp: 30, maxHp: 30, hasOverride: false },
          { eid: builderB, kind: MUDPAW_KIND, task: 'idle', targetName: '', hp: 30, maxHp: 30, hasOverride: false },
        ],
      } satisfies RosterGroup,
    ];

    new BuildGoal().activate();

    const tower = Array.from(query(world.ecs, [EntityTypeTag, FactionTag, Health])).find(
      (eid) =>
        EntityTypeTag.kind[eid] === EntityKind.Tower &&
        FactionTag.faction[eid] === Faction.Player &&
        Health.current[eid] > 0,
    );

    expect(tower).toBeDefined();
    expect(world.selection).toEqual([builderA, builderB]);
  });

  it('prefers the first stage-six tower over a burrow when both are buildable', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 320, 460, Faction.Player);
    const builderA = spawnEntity(world, MUDPAW_KIND, 260, 430, Faction.Player);
    const builderB = spawnEntity(world, MUDPAW_KIND, 300, 430, Faction.Player);
    const armory = spawnEntity(world, EntityKind.Armory, 360, 420, Faction.Player);

    Health.current[armory] = Health.max[armory];
    world.resources.fish = 260;
    world.resources.logs = 320;
    store.fish.value = 260;
    store.logs.value = 320;
    store.food.value = 7;
    store.maxFood.value = 8;
    storeV3.progressionLevel.value = 6;
    world.gameRng = {
      next: (() => {
        const values = [0.25, 0.5];
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
      {
        eid: armory,
        kind: EntityKind.Armory,
        hp: Health.current[armory],
        maxHp: Health.max[armory],
        queueItems: [],
        queueProgress: 0,
        canTrain: [],
      } satisfies RosterBuilding,
    ];
    store.unitRoster.value = [
      {
        role: 'generalist',
        idleCount: 2,
        automationEnabled: false,
        units: [
          { eid: builderA, kind: MUDPAW_KIND, task: 'idle', targetName: '', hp: 30, maxHp: 30, hasOverride: false },
          { eid: builderB, kind: MUDPAW_KIND, task: 'idle', targetName: '', hp: 30, maxHp: 30, hasOverride: false },
        ],
      } satisfies RosterGroup,
    ];

    new BuildGoal().activate();

    const placedKinds = Array.from(query(world.ecs, [EntityTypeTag, FactionTag, Health]))
      .filter((eid) => FactionTag.faction[eid] === Faction.Player && Health.current[eid] > 0)
      .map((eid) => EntityTypeTag.kind[eid]);

    expect(placedKinds).toContain(EntityKind.Tower);
    expect(placedKinds).not.toContain(EntityKind.Burrow);
  });
});
