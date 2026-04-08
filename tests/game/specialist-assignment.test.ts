import { addComponent, addEntity } from 'bitecs';
import { describe, expect, it } from 'vitest';
import { Position } from '@/ecs/components';
import { createGameWorld } from '@/ecs/world';
import {
  beginSpecialistAssignment,
  getSpecialistAssignment,
  getSpecialistMenuMode,
  placePendingSpecialistAssignment,
  registerSpecialistEntity,
} from '@/game/specialist-assignment';

function createPositionedEntity(x: number, y: number): { eid: number; world: ReturnType<typeof createGameWorld> } {
  const world = createGameWorld();
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  Position.x[eid] = x;
  Position.y[eid] = y;
  return { eid, world };
}

describe('specialist assignment', () => {
  it('registers a single-zone specialist with default area on spawn', () => {
    const { world, eid } = createPositionedEntity(120, 240);

    registerSpecialistEntity(world, eid, 'fisher');

    expect(getSpecialistMenuMode(world, eid)).toBe('single_zone');
    expect(getSpecialistAssignment(world, eid)).toMatchObject({
      canonicalId: 'fisher',
      centerX: 120,
      centerY: 240,
      anchorX: 120,
      anchorY: 240,
      operatingRadius: 160,
    });
  });

  it('applies Pearl radius bonuses when registering specialists', () => {
    const { world, eid } = createPositionedEntity(120, 240);
    world.specialistZoneBonuses.fisher = { operating_radius: 48 };

    registerSpecialistEntity(world, eid, 'fisher');

    expect(getSpecialistAssignment(world, eid)?.operatingRadius).toBe(208);
  });

  it('begins assignment mode with the correct prompt', () => {
    const { world, eid } = createPositionedEntity(50, 75);
    registerSpecialistEntity(world, eid, 'guard');

    expect(beginSpecialistAssignment(world, eid)).toBe('Tap terrain to set operating area');
    expect(world.pendingSpecialistAssignment).toEqual({ eid, mode: 'single_zone' });
  });

  it('clamps dual-zone engagement placement to projection range', () => {
    const { world, eid } = createPositionedEntity(100, 100);
    registerSpecialistEntity(world, eid, 'ranger');
    beginSpecialistAssignment(world, eid);

    expect(placePendingSpecialistAssignment(world, 500, 100)).toBe(true);

    const assignment = getSpecialistAssignment(world, eid);
    expect(assignment?.mode).toBe('dual_zone');
    expect(assignment?.anchorX).toBe(100);
    expect(assignment?.anchorY).toBe(100);
    expect(assignment?.projectionRange).toBe(220);
    expect(assignment?.engagementX).toBeCloseTo(320);
    expect(assignment?.engagementY).toBeCloseTo(100);
    expect(world.pendingSpecialistAssignment).toBeNull();
  });

  it('uses upgraded projection range for dual-zone specialists', () => {
    const { world, eid } = createPositionedEntity(100, 100);
    world.specialistZoneBonuses.ranger = { projection_range: 60 };
    registerSpecialistEntity(world, eid, 'ranger');
    beginSpecialistAssignment(world, eid);

    expect(placePendingSpecialistAssignment(world, 500, 100)).toBe(true);

    const assignment = getSpecialistAssignment(world, eid);
    expect(assignment?.projectionRange).toBe(280);
    expect(assignment?.engagementX).toBeCloseTo(380);
  });

  it('applies siege range upgrades to Bombardier projection range', () => {
    const { world, eid } = createPositionedEntity(100, 100);
    world.playerSiegeRangeMultiplier = 1.05;

    registerSpecialistEntity(world, eid, 'bombardier');

    expect(getSpecialistAssignment(world, eid)?.projectionRange).toBe(263);
  });
});
