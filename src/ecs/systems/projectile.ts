/**
 * Projectile System
 *
 * Ported from Projectile class (lines 313-343) of the original HTML game.
 *
 * Responsibilities:
 * - Move projectile entities toward their target position
 * - Apply homing: if target entity is alive, update target coordinates to track it
 * - Check if projectile has arrived (distance < speed) and deal damage on hit
 * - Add trail particles to world.particles while in flight
 * - Remove projectile entity on hit
 */

import { addComponent, addEntity, hasComponent, query, removeEntity } from 'bitecs';
import { PROJECTILE_SPEED } from '@/constants';
import { Health, IsProjectile, Position, ProjectileData } from '@/ecs/components';
import { takeDamage } from '@/ecs/systems/health';
import type { GameWorld } from '@/ecs/world';

/**
 * Helper to spawn a projectile entity. Used by combat system for snipers and towers.
 */
export function spawnProjectile(
  world: GameWorld,
  x: number,
  y: number,
  tx: number,
  ty: number,
  targetEnt: number,
  damage: number,
  owner: number,
  multiplier: number = 1.0,
): number {
  const eid = addEntity(world.ecs);

  addComponent(world.ecs, eid, Position);
  Position.x[eid] = x;
  Position.y[eid] = y;

  addComponent(world.ecs, eid, ProjectileData);
  ProjectileData.targetEntity[eid] = targetEnt;
  ProjectileData.targetX[eid] = tx;
  ProjectileData.targetY[eid] = ty;
  ProjectileData.damage[eid] = damage;
  ProjectileData.ownerEntity[eid] = owner;
  ProjectileData.speed[eid] = PROJECTILE_SPEED;
  ProjectileData.damageMultiplier[eid] = multiplier;

  addComponent(world.ecs, eid, IsProjectile);

  return eid;
}

export function projectileSystem(world: GameWorld): void {
  const projectiles = query(world.ecs, [Position, ProjectileData, IsProjectile]);

  for (let i = projectiles.length - 1; i >= 0; i--) {
    const eid = projectiles[i];

    const targetEnt = ProjectileData.targetEntity[eid];
    const speed = ProjectileData.speed[eid];

    // Homing: update target position if target is still alive
    if (
      targetEnt !== -1 &&
      hasComponent(world.ecs, targetEnt, Health) &&
      Health.current[targetEnt] > 0
    ) {
      ProjectileData.targetX[eid] = Position.x[targetEnt];
      ProjectileData.targetY[eid] = Position.y[targetEnt];
    }

    const tx = ProjectileData.targetX[eid];
    const ty = ProjectileData.targetY[eid];
    const px = Position.x[eid];
    const py = Position.y[eid];

    const dx = tx - px;
    const dy = ty - py;
    const dist = Math.sqrt(dx * dx + dy * dy);

    // Check if arrived (original: if (dist < this.speed))
    if (dist < speed) {
      // Deal damage on hit
      if (
        targetEnt !== -1 &&
        hasComponent(world.ecs, targetEnt, Health) &&
        Health.current[targetEnt] > 0
      ) {
        const owner = ProjectileData.ownerEntity[eid];
        const mult = ProjectileData.damageMultiplier[eid] ?? 1.0;
        takeDamage(world, targetEnt, ProjectileData.damage[eid], owner, mult);
      }

      // Remove projectile entity
      removeEntity(world.ecs, eid);
      continue;
    }

    // Add trail particle before moving
    world.particles.push({
      x: px,
      y: py,
      vx: 0,
      vy: 0,
      life: 8,
      color: 'rgba(156, 163, 175, 0.6)',
      size: 2,
    });

    // Move toward target
    Position.x[eid] += (dx / dist) * speed;
    Position.y[eid] += (dy / dist) * speed;
  }
}
