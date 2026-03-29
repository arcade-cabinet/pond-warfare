/**
 * Fog of War System
 *
 * Ported from updateLogic() lines 1195-1206 of the original HTML game.
 *
 * Responsibilities:
 * - Every 10 frames, iterate all player entities
 * - For each player entity, draw a reveal circle on the explored canvas
 * - Buildings get a larger reveal radius (16) than units (10)
 * - The explored canvas uses a scaled-down coordinate space (entity position / 16)
 *
 * NOTE: The actual fog rendering (fog texture overlay, real-time sight circles)
 * is handled by the rendering system. This system only updates the persistent
 * "explored" state that reveals previously visited areas with a dimmer visibility.
 */

import { hasComponent, query } from 'bitecs';
import { EXPLORED_SCALE } from '@/constants';
import { FactionTag, Health, IsBuilding, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { Faction } from '@/types';

/**
 * Reference to the explored canvas 2D context. Set once via initFogOfWar().
 * The original game used this.exploredCtx directly on the GAME object.
 */
let exploredCtx: CanvasRenderingContext2D | null = null;

/**
 * Initialize the fog-of-war system with the explored canvas context.
 * Must be called once during game initialization before the system runs.
 */
export function initFogOfWar(ctx: CanvasRenderingContext2D): void {
  exploredCtx = ctx;
}

/** Reset fog-of-war state. Useful in tests to clear module-level state between runs. */
export function resetFogOfWar(): void {
  exploredCtx = null;
}

export function fogOfWarSystem(world: GameWorld): void {
  if (world.frameCount % 10 !== 0) return;

  // If exploredCtx is not initialized, skip (non-fatal - rendering may not be ready)
  if (!exploredCtx) return;

  const entities = query(world.ecs, [Position, Health, FactionTag]);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;

    // Buildings get a larger reveal radius
    const isBuilding = hasComponent(world.ecs, eid, IsBuilding);
    const rad = isBuilding ? 16 : 10;

    // Scale position down to explored canvas coordinates
    const ex = Math.floor(Position.x[eid] / EXPLORED_SCALE);
    const ey = Math.floor(Position.y[eid] / EXPLORED_SCALE);

    // Draw reveal circle with low opacity for gradual reveal
    exploredCtx.fillStyle = 'rgba(255,255,255,0.15)';
    exploredCtx.beginPath();
    exploredCtx.arc(ex, ey, rad, 0, Math.PI * 2);
    exploredCtx.fill();
  }
}
