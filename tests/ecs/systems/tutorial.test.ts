/**
 * Tutorial System Tests
 *
 * Validates that tutorial steps advance based on frame count and
 * that the tutorial only runs during the first game.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { EntityTypeTag, FactionTag, Health, Position } from '@/ecs/components';
import { tutorialSystem } from '@/ecs/systems/tutorial';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

/** Create a player Commander unit. */
function createCommander(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 100;
  Health.max[eid] = 100;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = EntityKind.Commander;

  return eid;
}

describe('tutorialSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.isFirstGame = true;
    world.tutorialShownSteps = new Set();
  });

  it('should advance tutorial step with frame count', () => {
    createCommander(world, 500, 500);

    // First step triggers at frame 60
    world.frameCount = 60;
    tutorialSystem(world);

    // The first tutorial step (index 0) should be marked as shown
    expect(world.tutorialShownSteps.has(0)).toBe(true);
    // A floating text should have been added
    expect(world.floatingTexts.length).toBe(1);
    expect(world.floatingTexts[0].text).toContain('Welcome');
  });

  it('should only run when isFirstGame is true', () => {
    world.isFirstGame = false;
    createCommander(world, 500, 500);

    // Advance past tutorial step frame
    world.frameCount = 60;
    tutorialSystem(world);

    // No tutorial steps should trigger
    expect(world.tutorialShownSteps.size).toBe(0);
    expect(world.floatingTexts.length).toBe(0);
  });
});
