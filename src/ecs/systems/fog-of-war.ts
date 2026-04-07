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
 * - Weather: fog reduces vision range by 40%
 *
 * NOTE: The actual fog rendering (fog texture overlay, real-time sight circles)
 * is handled by the rendering system. This system only updates the persistent
 * "explored" state that reveals previously visited areas with a dimmer visibility.
 */

import { hasComponent, query } from 'bitecs';
import { EXPLORED_SCALE } from '@/constants';
import { EntityTypeTag, FactionTag, Health, IsBuilding, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { isLookoutKind } from '@/game/live-unit-kinds';
import { EntityKind, Faction } from '@/types';
import { getWeatherVisionMult } from './weather';

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
  if (exploredCtx) exploredCtx.clearRect(0, 0, exploredCtx.canvas.width, exploredCtx.canvas.height);
  exploredCtx = null;
}

export function fogOfWarSystem(world: GameWorld): void {
  if (world.frameCount % 10 !== 0) return;

  // If exploredCtx is not initialized, skip (non-fatal - rendering may not be ready)
  if (!exploredCtx) return;

  // Weather vision modifier (fog reduces all reveal radii)
  const visionMult = getWeatherVisionMult(world);

  const entities = query(world.ecs, [Position, Health, FactionTag]);

  for (let i = 0; i < entities.length; i++) {
    const eid = entities[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;

    // Buildings get a larger reveal radius; the Lookout chassis and ScoutPost get extra
    const isBuilding = hasComponent(world.ecs, eid, IsBuilding);
    const kind = hasComponent(world.ecs, eid, EntityTypeTag)
      ? (EntityTypeTag.kind[eid] as EntityKind)
      : undefined;
    let rad = isBuilding ? 16 : 10;
    if (kind !== undefined && isLookoutKind(kind)) rad = 16;
    if (kind === EntityKind.ScoutPost) rad = 24;
    // Cartography: +25% fog reveal radius for all units
    if (world.tech.cartography) rad = Math.ceil(rad * 1.25);

    // Apply weather vision modifier (fog reduces vision range)
    rad = Math.ceil(rad * visionMult);

    // Scale position down to explored canvas coordinates
    const ex = Math.floor(Position.x[eid] / EXPLORED_SCALE);
    const ey = Math.floor(Position.y[eid] / EXPLORED_SCALE);

    // Draw reveal circle with low opacity for gradual reveal
    exploredCtx.fillStyle = 'rgba(255,255,255,0.15)';
    exploredCtx.beginPath();
    exploredCtx.arc(ex, ey, rad, 0, Math.PI * 2);
    exploredCtx.fill();
  }

  // Root Network: all player buildings share the largest vision radius
  if (world.tech.rootNetwork) {
    // Find the max reveal radius among all player buildings
    let maxBuildingRad = 16;
    for (let i = 0; i < entities.length; i++) {
      const eid = entities[i];
      if (FactionTag.faction[eid] !== Faction.Player) continue;
      if (Health.current[eid] <= 0) continue;
      if (!hasComponent(world.ecs, eid, IsBuilding)) continue;
      const kind = hasComponent(world.ecs, eid, EntityTypeTag)
        ? (EntityTypeTag.kind[eid] as EntityKind)
        : undefined;
      let rad = 16;
      if (kind === EntityKind.ScoutPost) rad = 24;
      if (world.tech.cartography) rad = Math.ceil(rad * 1.25);
      rad = Math.ceil(rad * visionMult);
      if (rad > maxBuildingRad) maxBuildingRad = rad;
    }

    // Draw shared vision for ALL player buildings at max radius
    for (let i = 0; i < entities.length; i++) {
      const eid = entities[i];
      if (FactionTag.faction[eid] !== Faction.Player) continue;
      if (Health.current[eid] <= 0) continue;
      if (!hasComponent(world.ecs, eid, IsBuilding)) continue;

      const ex = Math.floor(Position.x[eid] / EXPLORED_SCALE);
      const ey = Math.floor(Position.y[eid] / EXPLORED_SCALE);

      exploredCtx.fillStyle = 'rgba(255,255,255,0.15)';
      exploredCtx.beginPath();
      exploredCtx.arc(ex, ey, maxBuildingRad, 0, Math.PI * 2);
      exploredCtx.fill();
    }
  }

  // Co-op shared fog: reveal areas around partner's units
  if (world.coopMode && world.partnerUnitPositions.length > 0) {
    for (const pos of world.partnerUnitPositions) {
      let rad = pos.isBuilding ? 16 : 10;
      if (world.tech.cartography) rad = Math.ceil(rad * 1.25);
      rad = Math.ceil(rad * visionMult);
      const ex = Math.floor(pos.x / EXPLORED_SCALE);
      const ey = Math.floor(pos.y / EXPLORED_SCALE);
      exploredCtx.fillStyle = 'rgba(255,255,255,0.15)';
      exploredCtx.beginPath();
      exploredCtx.arc(ex, ey, rad, 0, Math.PI * 2);
      exploredCtx.fill();
    }
  }

  // Compute explored percentage every 60 frames (for campaign objectives)
  if (world.frameCount % 60 === 0) {
    const cw = exploredCtx.canvas.width;
    const ch = exploredCtx.canvas.height;
    if (cw > 0 && ch > 0) {
      // Sample a grid of pixels rather than reading the entire canvas
      const step = 4;
      const imgData = exploredCtx.getImageData(0, 0, cw, ch);
      const data = imgData.data;
      let explored = 0;
      let total = 0;
      for (let sy = 0; sy < ch; sy += step) {
        for (let sx = 0; sx < cw; sx += step) {
          total++;
          // Check alpha channel (index 3) - any non-zero alpha means explored
          const idx = (sy * cw + sx) * 4 + 3;
          if (data[idx] > 10) explored++;
        }
      }
      world.exploredPercent = total > 0 ? Math.round((explored / total) * 100) : 0;
    }
  }
}
