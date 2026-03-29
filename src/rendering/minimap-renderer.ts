/**
 * Minimap Renderer
 *
 * Faithful port of minimap rendering (lines 1479-1501 of pond_craft.html).
 *
 * Draws colored dots for all entities on a 200x200 canvas:
 * - Cyan (#38bdf8) for player entities
 * - Red (#ef4444) for enemy entities
 * - Dark red (#7f1d1d) for predator nests
 * - Green (reedGreen) for cattails
 * - White (#cbd5e1) for clambeds
 * - White (#fff) fallback for anything else
 *
 * Also draws explored area tint, animated radar-style pings,
 * and updates the camera viewport indicator.
 */

import type { GameWorld } from '@/ecs/world';
import type { MinimapPing } from '@/types';
import { EntityKind, Faction } from '@/types';
import {
  PALETTE,
  WORLD_WIDTH,
  WORLD_HEIGHT,
  MINIMAP_SIZE,
} from '@/constants';
import { Position, FactionTag, EntityTypeTag } from '@/ecs/components';
import { ENTITY_DEFS } from '@/config/entity-defs';

/**
 * Render the minimap.
 *
 * @param minimapCtx    - The 2D context of the 200x200 minimap canvas.
 * @param world         - Game world state.
 * @param entityEids    - All live entity IDs.
 * @param exploredCanvas - The explored-area canvas (drawn at low opacity).
 * @param minimapPings  - Active alert pings to render.
 */
export function drawMinimap(
  minimapCtx: CanvasRenderingContext2D,
  world: GameWorld,
  entityEids: number[],
  exploredCanvas: HTMLCanvasElement,
  minimapPings: MinimapPing[],
): void {
  const mc = minimapCtx;
  const sx = MINIMAP_SIZE / WORLD_WIDTH;
  const sy = MINIMAP_SIZE / WORLD_HEIGHT;

  // Base fill: deep water
  mc.fillStyle = PALETTE.waterDeep;
  mc.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);

  // Draw explored areas with subtle tint
  mc.globalAlpha = 0.15;
  mc.drawImage(exploredCanvas, 0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
  mc.globalAlpha = 1;

  // Draw entity dots
  for (const eid of entityEids) {
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    const faction = FactionTag.faction[eid] as Faction;
    const def = ENTITY_DEFS[kind];

    // Choose color
    if (kind === EntityKind.Cattail) {
      mc.fillStyle = PALETTE.reedGreen;
    } else if (kind === EntityKind.Clambed) {
      mc.fillStyle = PALETTE.clamShell;
    } else if (faction === Faction.Player) {
      mc.fillStyle = '#38bdf8';
    } else if (kind === EntityKind.PredatorNest) {
      mc.fillStyle = '#7f1d1d';
    } else if (faction === Faction.Enemy) {
      mc.fillStyle = '#ef4444';
    } else {
      mc.fillStyle = '#fff';
    }

    const dotSize = def.isBuilding ? 4 : 2;
    const ex = Position.x[eid];
    const ey = Position.y[eid];
    mc.fillRect(
      ex * sx - dotSize / 2,
      ey * sy - dotSize / 2,
      dotSize,
      dotSize,
    );
  }

  // Draw animated radar-style pings
  for (const p of minimapPings) {
    const alpha = p.life / p.maxLife;
    const radius = 4 + Math.sin(p.life * 0.2) * 2;
    mc.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
    mc.lineWidth = 1.5;
    mc.strokeRect(
      p.x * sx - radius,
      p.y * sy - radius,
      radius * 2,
      radius * 2,
    );
  }
}

/**
 * Update the minimap camera-viewport indicator DOM element.
 *
 * @param element - The minimap-cam div element.
 * @param world   - Game world state (camera position, viewport size).
 */
export function updateMinimapViewport(
  element: HTMLElement,
  world: GameWorld,
): void {
  const sx = MINIMAP_SIZE / WORLD_WIDTH;
  const sy = MINIMAP_SIZE / WORLD_HEIGHT;

  element.classList.remove('hidden');
  element.style.left = `${world.camX * sx}px`;
  element.style.top = `${world.camY * sy}px`;
  element.style.width = `${world.viewWidth * sx}px`;
  element.style.height = `${world.viewHeight * sy}px`;
}
