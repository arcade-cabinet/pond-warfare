import { describe, expect, it, beforeEach } from 'vitest';
import { spawnEntity } from '@/ecs/archetypes';
import { Health } from '@/ecs/components';
import { createGameWorld } from '@/ecs/world';
import { prestigeAutoBehaviorSystem } from '@/ecs/systems/prestige-auto-behaviors';
import { EntityKind, Faction } from '@/types';
import * as storeV3 from '@/ui/store-v3';

describe('prestigeAutoBehaviorSystem', () => {
  beforeEach(() => {
    storeV3.prestigeState.value = {
      rank: 0,
      pearls: 0,
      totalPearlsEarned: 0,
      upgradeRanks: {},
    };
  });

  it('heals damaged friendly units near the Lodge when lodge_regen is unlocked', () => {
    const world = createGameWorld();
    const lodge = spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const nearby = spawnEntity(world, EntityKind.Brawler, 240, 200, Faction.Player);
    const far = spawnEntity(world, EntityKind.Brawler, 500, 200, Faction.Player);

    Health.current[lodge] = Health.max[lodge] = 400;
    Health.max[nearby] = 100;
    Health.current[nearby] = 80;
    Health.max[far] = 100;
    Health.current[far] = 80;

    world.frameCount = 60;
    storeV3.prestigeState.value = {
      rank: 1,
      pearls: 0,
      totalPearlsEarned: 10,
      upgradeRanks: { auto_heal_behavior: 1 },
    };

    prestigeAutoBehaviorSystem(world);

    expect(Health.current[nearby]).toBe(81);
    expect(Health.current[far]).toBe(80);
  });

  it('repairs the Lodge when lodge_self_repair is unlocked', () => {
    const world = createGameWorld();
    const lodge = spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);

    Health.max[lodge] = 400;
    Health.current[lodge] = 350;
    world.frameCount = 60;
    storeV3.prestigeState.value = {
      rank: 1,
      pearls: 0,
      totalPearlsEarned: 12,
      upgradeRanks: { auto_repair_behavior: 1 },
    };

    prestigeAutoBehaviorSystem(world);

    expect(Health.current[lodge]).toBe(352);
  });

  it('does nothing when no prestige auto-behaviors are unlocked', () => {
    const world = createGameWorld();
    const lodge = spawnEntity(world, EntityKind.Lodge, 200, 200, Faction.Player);
    const unit = spawnEntity(world, EntityKind.Brawler, 220, 200, Faction.Player);

    Health.max[lodge] = 400;
    Health.current[lodge] = 350;
    Health.max[unit] = 100;
    Health.current[unit] = 80;
    world.frameCount = 60;

    prestigeAutoBehaviorSystem(world);

    expect(Health.current[lodge]).toBe(350);
    expect(Health.current[unit]).toBe(80);
  });
});
