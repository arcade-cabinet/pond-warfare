/**
 * Fog of War System Tests
 *
 * Validates that player units reveal explored areas and that
 * the system only runs on the correct frame interval.
 */

import { addComponent, addEntity } from 'bitecs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EntityTypeTag, FactionTag, Health, Position } from '@/ecs/components';
import { fogOfWarSystem, initFogOfWar, resetFogOfWar } from '@/ecs/systems/fog-of-war';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

/** Create a player unit at a given position. */
function createPlayerUnit(world: GameWorld, kind: EntityKind, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 50;
  Health.max[eid] = 50;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;

  return eid;
}

describe('fogOfWarSystem', () => {
  let world: GameWorld;
  let mockCtx: {
    fillStyle: string;
    beginPath: ReturnType<typeof vi.fn>;
    arc: ReturnType<typeof vi.fn>;
    fill: ReturnType<typeof vi.fn>;
    clearRect: ReturnType<typeof vi.fn>;
    canvas: { width: number; height: number };
    getImageData: ReturnType<typeof vi.fn>;
  };

  beforeEach(() => {
    world = createGameWorld();
    // System runs every 10 frames
    world.frameCount = 10;

    // Create a mock canvas context
    mockCtx = {
      fillStyle: '',
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      clearRect: vi.fn(),
      canvas: { width: 160, height: 160 },
      getImageData: vi.fn().mockReturnValue({ data: new Uint8ClampedArray(160 * 160 * 4) }),
    };

    initFogOfWar(mockCtx as unknown as CanvasRenderingContext2D);
  });

  afterEach(() => {
    resetFogOfWar();
  });

  it('should reveal area around player units', () => {
    createPlayerUnit(world, EntityKind.Gatherer, 320, 320);

    fogOfWarSystem(world);

    // The system should have drawn a reveal circle (arc + fill)
    expect(mockCtx.beginPath).toHaveBeenCalled();
    expect(mockCtx.arc).toHaveBeenCalled();
    expect(mockCtx.fill).toHaveBeenCalled();
  });

  it('should not reveal areas when no context is initialized', () => {
    resetFogOfWar(); // Remove the context

    createPlayerUnit(world, EntityKind.Gatherer, 320, 320);

    // Should not throw and should not call any canvas methods
    fogOfWarSystem(world);

    // Since context is null, arc should not be called (it was reset)
    expect(mockCtx.arc).not.toHaveBeenCalled();
  });

  it('should give Scout units a larger reveal radius than normal units', () => {
    createPlayerUnit(world, EntityKind.Scout, 320, 320);

    fogOfWarSystem(world);

    // Scout reveal radius should be 16 (same as buildings, vs 10 for normal units)
    const arcCalls = mockCtx.arc.mock.calls;
    expect(arcCalls.length).toBeGreaterThanOrEqual(1);
    const lastArc = arcCalls[arcCalls.length - 1];
    // arc(x, y, radius, startAngle, endAngle) — radius is arg index 2
    expect(lastArc[2]).toBe(16);
  });

  it('should give normal units a smaller reveal radius than Scout', () => {
    createPlayerUnit(world, EntityKind.Gatherer, 320, 320);

    fogOfWarSystem(world);

    const arcCalls = mockCtx.arc.mock.calls;
    expect(arcCalls.length).toBeGreaterThanOrEqual(1);
    const lastArc = arcCalls[arcCalls.length - 1];
    expect(lastArc[2]).toBe(10);
  });

  it('should not reveal areas around enemy units', () => {
    const eid = addEntity(world.ecs);
    addComponent(world.ecs, eid, Position);
    addComponent(world.ecs, eid, Health);
    addComponent(world.ecs, eid, FactionTag);
    addComponent(world.ecs, eid, EntityTypeTag);

    Position.x[eid] = 320;
    Position.y[eid] = 320;
    Health.current[eid] = 50;
    Health.max[eid] = 50;
    FactionTag.faction[eid] = Faction.Enemy;
    EntityTypeTag.kind[eid] = EntityKind.Scout;

    fogOfWarSystem(world);

    expect(mockCtx.arc).not.toHaveBeenCalled();
  });

  it('should not reveal areas around dead units', () => {
    const eid = addEntity(world.ecs);
    addComponent(world.ecs, eid, Position);
    addComponent(world.ecs, eid, Health);
    addComponent(world.ecs, eid, FactionTag);
    addComponent(world.ecs, eid, EntityTypeTag);

    Position.x[eid] = 320;
    Position.y[eid] = 320;
    Health.current[eid] = 0;
    Health.max[eid] = 50;
    FactionTag.faction[eid] = Faction.Player;
    EntityTypeTag.kind[eid] = EntityKind.Scout;

    fogOfWarSystem(world);

    expect(mockCtx.arc).not.toHaveBeenCalled();
  });

  it('should apply cartography tech bonus to Scout reveal radius', () => {
    world.tech.cartography = true;
    createPlayerUnit(world, EntityKind.Scout, 320, 320);

    fogOfWarSystem(world);

    const arcCalls = mockCtx.arc.mock.calls;
    expect(arcCalls.length).toBeGreaterThanOrEqual(1);
    const lastArc = arcCalls[arcCalls.length - 1];
    // 16 * 1.25 = 20, ceil = 20
    expect(lastArc[2]).toBe(20);
  });
});
