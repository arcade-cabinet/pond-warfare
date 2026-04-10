import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { EntityTypeTag, FactionTag, Health } from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import {
  getPlayerLodgeRepairAmount,
  LODGE_REPAIR_LOG_COST,
  repairPlayerLodge,
} from '@/game/lodge-repair';
import { EntityKind, Faction } from '@/types';

function createPlayerLodge(world: GameWorld, hp = 1200, maxHp = 1500): number {
  const lodge = addEntity(world.ecs);
  addComponent(world.ecs, lodge, Health);
  addComponent(world.ecs, lodge, FactionTag);
  addComponent(world.ecs, lodge, EntityTypeTag);
  Health.current[lodge] = hp;
  Health.max[lodge] = maxHp;
  FactionTag.faction[lodge] = Faction.Player;
  EntityTypeTag.kind[lodge] = EntityKind.Lodge;
  return lodge;
}

describe('repairPlayerLodge', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.resources.logs = 100;
  });

  it('fails when no player lodge exists', () => {
    expect(repairPlayerLodge(world)).toEqual({ success: false, reason: 'no_lodge' });
  });

  it('uses the repair-speed multiplier when healing the lodge', () => {
    const lodge = createPlayerLodge(world, 1200, 1500);
    world.playerRepairSpeedMultiplier = 1.08;

    const result = repairPlayerLodge(world);

    expect(result).toEqual({ success: true, lodgeEid: lodge, healAmount: 108 });
    expect(Health.current[lodge]).toBe(1308);
    expect(world.resources.logs).toBe(100 - LODGE_REPAIR_LOG_COST);
    expect(getPlayerLodgeRepairAmount(world)).toBe(108);
  });

  it('caps healing at the lodge max hp', () => {
    const lodge = createPlayerLodge(world, 1450, 1500);
    world.playerRepairSpeedMultiplier = 1.5;

    const result = repairPlayerLodge(world);

    expect(result).toEqual({ success: true, lodgeEid: lodge, healAmount: 50 });
    expect(Health.current[lodge]).toBe(1500);
  });
});
