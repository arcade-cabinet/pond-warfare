/**
 * Projectile System Tests
 *
 * Validates movement toward target, damage on arrival, and cleanup.
 */

import { addComponent, addEntity, hasComponent } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { PROJECTILE_SPEED } from '@/constants';
import { Health, IsProjectile, Position } from '@/ecs/components';
import { projectileSystem, spawnProjectile } from '@/ecs/systems/projectile';
import { createGameWorld, type GameWorld } from '@/ecs/world';

/** Create a simple target entity with health. */
function createTarget(world: GameWorld, x: number, y: number, hp: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = hp;
  Health.max[eid] = hp;

  return eid;
}

describe('projectileSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 1;
    // Ensure clear weather so wind drift doesn't offset projectiles
    world.weather.current = 'clear';
  });

  it('should move projectile toward target position', () => {
    const target = createTarget(world, 500, 100, 100);
    const projEid = spawnProjectile(world, 100, 100, 500, 100, target, 10, -1);

    const startX = Position.x[projEid];

    projectileSystem(world);

    // Projectile should have moved toward target (rightward)
    expect(Position.x[projEid]).toBeGreaterThan(startX);
    // Y should stay roughly the same (straight horizontal shot)
    expect(Position.y[projEid]).toBeCloseTo(100, 0);
  });

  it('should deal damage on arrival', () => {
    const target = createTarget(world, 100, 100, 100);
    // Spawn projectile very close to the target (within PROJECTILE_SPEED)
    spawnProjectile(world, 100 + PROJECTILE_SPEED - 1, 100, 100, 100, target, 25, -1);

    projectileSystem(world);

    // Target should have taken damage
    expect(Health.current[target]).toBeLessThan(100);
  });

  it('should not apply projectile damage multipliers twice on impact', () => {
    const target = createTarget(world, 100, 100, 100);
    // Projectile damage is already pre-scaled before impact.
    spawnProjectile(world, 100 + PROJECTILE_SPEED - 1, 100, 100, 100, target, 6, -1, 0.75);

    projectileSystem(world);

    expect(Health.current[target]).toBe(94);
  });

  it('should be removed after impact', () => {
    const target = createTarget(world, 100, 100, 100);
    // Spawn projectile at the target position (immediate impact)
    const projEid = spawnProjectile(world, 100, 100, 100, 100, target, 10, -1);

    projectileSystem(world);

    // Projectile should have been removed (no longer has IsProjectile)
    expect(hasComponent(world.ecs, projEid, IsProjectile)).toBe(false);
  });
});
