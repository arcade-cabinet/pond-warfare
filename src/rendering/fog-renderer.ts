/**
 * Fog of War Renderer
 *
 * Fog of war rendering using Canvas2D overlay.
 *
 * Draws an animated drifting fog pattern (using a tiling noise texture),
 * then punches out vision circles around player entities using
 * destination-out compositing with wide radial gradients. Buildings get a
 * larger vision radius (250) than units (150).
 *
 * The gradient transition zone is 60% of the radius (from 40% to 100%)
 * so the fog edge is a gradual fade rather than a hard circle.
 */

import { BUILDING_SIGHT_RADIUS, FOG_TEXTURE_SIZE, UNIT_SIGHT_RADIUS } from '@/constants';
import { EntityTypeTag, FactionTag, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { BUILDING_KINDS, type EntityKind, Faction } from '@/types';

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
  const { camX, camY, frameCount } = world;
  const zoom = world.zoomLevel;
  // Canvas is sized to the full screen pixel dimensions
  const canvasW = fc.canvas.width;
  const canvasH = fc.canvas.height;
  // Logical view size (in world units)
  const w = world.viewWidth;
  const h = world.viewHeight;

  fc.clearRect(0, 0, canvasW, canvasH);

  // --- Draw drifting fog pattern (source-over) ---
  fc.globalCompositeOperation = 'source-over';
  fc.save();

  // Apply zoom transform so fog matches the zoomed game view
  fc.scale(zoom, zoom);

  const size = FOG_TEXTURE_SIZE; // 256
  const driftX = -(camX * 0.2 + frameCount * 0.1) % size;
  const driftY = -(camY * 0.2 + frameCount * 0.05) % size;
  fc.translate(driftX, driftY);
  fc.fillStyle = fogPattern;
  fc.fillRect(-size, -size, w + size * 2, h + size * 2);

  fc.restore();

  // --- Punch out vision circles (destination-out) ---
  fc.globalCompositeOperation = 'destination-out';
  fc.save();
  fc.scale(zoom, zoom);

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

    // Wide radial gradient: full visibility in center, gradual fade to fog.
    // Inner radius at 15% gives a small fully-clear core.
    // Stop at 40% begins the fade, 70% is half-transparent, 100% is fully fogged.
    const grad = fc.createRadialGradient(sx, sy, rad * 0.15, sx, sy, rad);
    grad.addColorStop(0, 'rgba(0,0,0,1)');
    grad.addColorStop(0.4, 'rgba(0,0,0,0.9)');
    grad.addColorStop(0.7, 'rgba(0,0,0,0.4)');
    grad.addColorStop(0.9, 'rgba(0,0,0,0.1)');
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    fc.fillStyle = grad;
    fc.beginPath();
    fc.arc(sx, sy, rad, 0, Math.PI * 2);
    fc.fill();
  }

  fc.restore();

  // Reset composite operation
  fc.globalCompositeOperation = 'source-over';
}
