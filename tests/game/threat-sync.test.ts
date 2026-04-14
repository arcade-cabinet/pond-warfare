import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { EntityTypeTag, FactionTag, Health, Position } from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { syncThreatAndObjectives } from '@/game/threat-sync';
import { EntityKind, Faction } from '@/types';
import * as store from '@/ui/store';

let world: GameWorld;

function spawnActor(kind: EntityKind, faction: Faction, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 100;
  Health.max[eid] = 100;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = kind;
  return eid;
}

describe('syncThreatAndObjectives', () => {
  beforeEach(() => {
    world = createGameWorld();
    store.baseThreatCount.value = 0;
    store.baseUnderAttack.value = false;
    store.waveCountdown.value = -1;
    store.globalProductionQueue.value = [];
    store.totalEnemyNests.value = 0;
    store.destroyedEnemyNests.value = 0;
    store.nestJustDestroyed.value = false;
  });

  it('counts only enemies within 400px of the lodge as base threats', () => {
    spawnActor(EntityKind.Lodge, Faction.Player, 200, 200);
    spawnActor(EntityKind.Gator, Faction.Enemy, 440, 200);
    spawnActor(EntityKind.Gator, Faction.Enemy, 620, 200);

    syncThreatAndObjectives(world);

    expect(store.baseThreatCount.value).toBe(1);
    expect(store.baseUnderAttack.value).toBe(true);
  });

  it('clears base-under-attack when nearby enemies leave the lodge radius', () => {
    spawnActor(EntityKind.Lodge, Faction.Player, 200, 200);
    const enemy = spawnActor(EntityKind.Gator, Faction.Enemy, 440, 200);

    syncThreatAndObjectives(world);

    expect(store.baseThreatCount.value).toBe(1);
    expect(store.baseUnderAttack.value).toBe(true);

    Position.x[enemy] = 620;
    Position.y[enemy] = 200;

    syncThreatAndObjectives(world);

    expect(store.baseThreatCount.value).toBe(0);
    expect(store.baseUnderAttack.value).toBe(false);
  });
});
