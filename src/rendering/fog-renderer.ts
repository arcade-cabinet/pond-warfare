/**
 * Fog of War Renderer
 *
 * Faithful port of fog rendering (lines 1431-1447 of pond_craft.html).
 *
 * Draws an animated drifting fog pattern (using a tiling noise texture),
 * then punches out vision circles around player entities using
 * destination-out compositing with radial gradients. Buildings get a
 * larger vision radius (250) than units (150).
 */

import { BUILDING_SIGHT_RADIUS, FOG_TEXTURE_SIZE, UNIT_SIGHT_RADIUS } from '@/constants';
import { EntityTypeTag, FactionTag, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

/** Entity kinds that are buildings (get larger vision radius). */
const BUILDING_KINDS = new Set([
  EntityKind.Lodge,
  EntityKind.Burrow,
  EntityKind.Armory,
  EntityKind.Tower,
  EntityKind.PredatorNest,
]);

export interface FogRendererState {
  fogCtx: CanvasRenderingContext2D;
  fogPattern: CanvasPattern;
}

/**
 * Render fog of war onto the fog canvas.
 *
 * @param state       - Fog canvas context and repeating pattern.
 * @param world       - Game world state (camera, frameCount, etc).
 * @param playerEids  - Array of entity IDs belonging to the player faction.
 * @param shakeX      - Screen shake X offset.
 * @param shakeY      - Screen shake Y offset.
 */
export function drawFog(
  state: FogRendererState,
  world: GameWorld,
  playerEids: number[],
  shakeX: number,
  shakeY: number,
): void {
  const { fogCtx: fc, fogPattern } = state;
  const { camX, camY, viewWidth: w, viewHeight: h, frameCount } = world;

  fc.clearRect(0, 0, w, h);

  // --- Draw drifting fog pattern (source-over) ---
  fc.globalCompositeOperation = 'source-over';
  fc.save();

  const size = FOG_TEXTURE_SIZE; // 256
  const driftX = -(camX * 0.2 + frameCount * 0.1) % size;
  const driftY = -(camY * 0.2 + frameCount * 0.05) % size;
  fc.translate(driftX, driftY);
  fc.fillStyle = fogPattern;
  fc.fillRect(-size, -size, w + size * 2, h + size * 2);

  fc.restore();

  // --- Punch out vision circles (destination-out) ---
  fc.globalCompositeOperation = 'destination-out';

  for (const eid of playerEids) {
    const ex = Position.x[eid];
    const ey = Position.y[eid];

    // Frustum cull: skip entities far off-screen
    if (ex + 400 < camX || ex - 400 > camX + w || ey + 400 < camY || ey - 400 > camY + h) {
      continue;
    }

    // Only draw vision for player-faction entities
    if (FactionTag.faction[eid] !== Faction.Player) continue;

    const sx = ex - camX + shakeX;
    const sy = ey - camY + shakeY;
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    const rad = BUILDING_KINDS.has(kind) ? BUILDING_SIGHT_RADIUS : UNIT_SIGHT_RADIUS;

    const grad = fc.createRadialGradient(sx, sy, rad * 0.2, sx, sy, rad);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.6, 'rgba(0,0,0,0.8)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    fc.fillStyle = grad;
    fc.beginPath();
    fc.arc(sx, sy, rad, 0, Math.PI * 2);
    fc.fill();
  }

  // Reset composite operation
  fc.globalCompositeOperation = 'source-over';
}
