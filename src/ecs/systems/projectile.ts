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

import { query, addEntity, addComponent, removeEntity, hasComponent } from 'bitecs';
import type { GameWorld } from '@/ecs/world';
import {
  Position,
  ProjectileData,
  IsProjectile,
  Health,
} from '@/ecs/components';
import { PROJECTILE_SPEED, PALETTE } from '@/constants';
import { takeDamage } from '@/ecs/systems/health';


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
    // Original: if (this.target && this.target.hp > 0) { this.tx = this.target.x; this.ty = this.target.y; }
    if (
      targetEnt &&
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
      // Original: if (this.target && this.target.hp > 0) this.target.takeDamage(this.dmg, this.owner);
      if (
        targetEnt &&
        hasComponent(world.ecs, targetEnt, Health) &&
        Health.current[targetEnt] > 0
      ) {
        const owner = ProjectileData.ownerEntity[eid];
        takeDamage(world, targetEnt, ProjectileData.damage[eid], owner);
      }

      // Remove projectile entity
      removeEntity(world.ecs, eid);
      continue;
    }

    // Add trail particle before moving
    // Original: this.trail.push({x: this.x, y: this.y, life: 8});
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
    // Original: this.x += (dx/dist)*this.speed; this.y += (dy/dist)*this.speed;
    Position.x[eid] += (dx / dist) * speed;
    Position.y[eid] += (dy / dist) * speed;
  }
}
