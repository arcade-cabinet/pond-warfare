/**
 * Attack Alerts System Tests
 *
 * Validates building attacks fire major alerts, cooldown prevents spam,
 * and unit attacks near Lodge fire minor alerts.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { EntityTypeTag, FactionTag, Health, IsBuilding, Position } from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { MUDPAW_KIND } from '@/game/live-unit-kinds';
import { checkAttackAlert, resetAttackAlerts } from '@/systems/attack-alerts';
import { EntityKind, Faction } from '@/types';

// Mock audio to prevent errors
vi.mock('@/audio/audio-system', () => ({
  audio: new Proxy({}, { get: () => vi.fn() }),
}));

function createPlayerBuilding(world: GameWorld, kind: EntityKind, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, IsBuilding);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 500;
  Health.max[eid] = 500;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  return eid;
}

function createPlayerUnit(world: GameWorld, kind: EntityKind, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 30;
  Health.max[eid] = 30;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  return eid;
}

describe('Attack Alerts', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 1000;
    resetAttackAlerts();
  });

  it('building attack fires major alert with floating text', () => {
    const buildingEid = createPlayerBuilding(world, EntityKind.Armory, 200, 200);

    checkAttackAlert(world, buildingEid);

    expect(world.floatingTexts).toHaveLength(1);
    expect(world.floatingTexts[0].text).toBe('BASE UNDER ATTACK!');
    expect(world.minimapPings).toHaveLength(1);
  });

  it('cooldown prevents spam — second alert within 600 frames is blocked', () => {
    const buildingEid = createPlayerBuilding(world, EntityKind.Armory, 200, 200);

    checkAttackAlert(world, buildingEid);
    expect(world.floatingTexts).toHaveLength(1);

    // Advance only 100 frames (within 600 frame cooldown)
    world.frameCount = 1100;
    checkAttackAlert(world, buildingEid);

    // No second alert
    expect(world.floatingTexts).toHaveLength(1);
  });

  it('unit attack near Lodge fires minor alert', () => {
    // Place a Lodge at (400, 400)
    createPlayerBuilding(world, EntityKind.Lodge, 400, 400);

    // Place a unit within LODGE_PROXIMITY (300) of the Lodge
    const unitEid = createPlayerUnit(world, MUDPAW_KIND, 450, 420);

    checkAttackAlert(world, unitEid);

    expect(world.floatingTexts).toHaveLength(1);
    expect(world.floatingTexts[0].text).toBe('Units under attack!');
    expect(world.minimapPings).toHaveLength(1);
  });

  it('unit attack far from Lodge does not fire alert', () => {
    // Place a Lodge at (400, 400)
    createPlayerBuilding(world, EntityKind.Lodge, 400, 400);

    // Place a unit far away (> 300 from Lodge)
    const unitEid = createPlayerUnit(world, MUDPAW_KIND, 1000, 1000);

    checkAttackAlert(world, unitEid);

    // No alert — unit is too far from Lodge
    expect(world.floatingTexts).toHaveLength(0);
  });
});
