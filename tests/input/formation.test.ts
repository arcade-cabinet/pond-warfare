import { addComponent, addEntity } from 'bitecs';
import { describe, expect, it } from 'vitest';
import { EntityTypeTag } from '@/ecs/components';
import { createGameWorld } from '@/ecs/world';
import {
  LOOKOUT_KIND,
  MEDIC_KIND,
  MUDPAW_KIND,
  SABOTEUR_KIND,
  SAPPER_KIND,
} from '@/game/live-unit-kinds';
import { calculateFormationPositions } from '@/input/selection/formation';

function createTaggedUnit(world: ReturnType<typeof createGameWorld>, kind: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, EntityTypeTag);
  EntityTypeTag.kind[eid] = kind;
  return eid;
}

describe('calculateFormationPositions', () => {
  it('puts live frontline units on the front row', () => {
    const world = createGameWorld();
    const sapper = createTaggedUnit(world, SAPPER_KIND);
    const saboteur = createTaggedUnit(world, SABOTEUR_KIND);

    const positions = calculateFormationPositions([sapper, saboteur], 500, 500);
    const sapperPos = positions.find((entry) => entry.eid === sapper);
    const saboteurPos = positions.find((entry) => entry.eid === saboteur);

    expect(sapperPos?.y).toBe(500);
    expect(saboteurPos?.y).toBe(500);
  });

  it('keeps Lookout ahead of support-only units and behind the frontline', () => {
    const world = createGameWorld();
    const sapper = createTaggedUnit(world, SAPPER_KIND);
    const lookout = createTaggedUnit(world, LOOKOUT_KIND);
    const mudpaw = createTaggedUnit(world, MUDPAW_KIND);
    const medic = createTaggedUnit(world, MEDIC_KIND);

    const positions = calculateFormationPositions([sapper, lookout, mudpaw, medic], 500, 500);
    const sapperPos = positions.find((entry) => entry.eid === sapper);
    const lookoutPos = positions.find((entry) => entry.eid === lookout);
    const mudpawPos = positions.find((entry) => entry.eid === mudpaw);
    const medicPos = positions.find((entry) => entry.eid === medic);

    expect(sapperPos?.y).toBe(500);
    expect(lookoutPos?.y).toBeGreaterThan(sapperPos?.y ?? 0);
    expect(lookoutPos?.y).toBeLessThan(mudpawPos?.y ?? Infinity);
    expect(medicPos?.y).toBe(mudpawPos?.y);
  });
});
