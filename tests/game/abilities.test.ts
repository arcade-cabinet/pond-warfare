import { hasComponent, query } from 'bitecs';
import { afterEach, describe, expect, it } from 'vitest';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
} from '@/ecs/components';
import { createGameWorld } from '@/ecs/world';
import { useAirdrop } from '@/game/abilities';
import { airdropCooldown, airdropsRemaining } from '@/ui/store';
import { EntityKind, Faction } from '@/types';
import { spawnEntity } from '@/ecs/archetypes';

afterEach(() => {
  airdropsRemaining.value = 0;
  airdropCooldown.value = 0;
});

describe('useAirdrop', () => {
  it('spawns a canonical manual relief bundle at the Lodge', () => {
    const world = createGameWorld();
    world.airdropsRemaining = 2;
    const initialFish = world.resources.fish;
    const initialLogs = world.resources.logs;
    const lodge = spawnEntity(world, EntityKind.Lodge, 320, 400, Faction.Player);

    expect(useAirdrop(world)).toBe(true);

    const playerUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]).filter(
      (eid) =>
        FactionTag.faction[eid] === Faction.Player &&
        !hasComponent(world.ecs, eid, IsBuilding) &&
        Health.current[eid] > 0 &&
        eid !== lodge,
    );

    const spawnedKinds = playerUnits.map((eid) => EntityTypeTag.kind[eid]).sort((a, b) => a - b);
    expect(spawnedKinds).toEqual([
      EntityKind.Gatherer,
      EntityKind.Gatherer,
      EntityKind.Healer,
    ]);

    expect(world.resources.fish - initialFish).toBe(200);
    expect(world.resources.logs - initialLogs).toBe(100);
    expect(world.airdropsRemaining).toBe(1);
    expect(world.airdropCooldownUntil).toBe(600);
  });

  it('fails cleanly when no player Lodge exists', () => {
    const world = createGameWorld();
    world.airdropsRemaining = 1;
    const initialFish = world.resources.fish;
    const initialLogs = world.resources.logs;

    expect(useAirdrop(world)).toBe(false);
    expect(world.resources.fish).toBe(initialFish);
    expect(world.resources.logs).toBe(initialLogs);
    expect(world.airdropsRemaining).toBe(1);
  });
});
