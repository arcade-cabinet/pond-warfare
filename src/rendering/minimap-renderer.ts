/**
 * Minimap Renderer
 *
 * Minimap rendering for the HUD sidebar.
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

import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  BUILDING_SIGHT_RADIUS,
  EXPLORED_SCALE,
  MINIMAP_SIZE,
  PALETTE,
  UNIT_SIGHT_RADIUS,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '@/constants';
import { EntityTypeTag, FactionTag, Health, IsResource, Position, Resource } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import type { MinimapPing } from '@/types';
import { BUILDING_KINDS, EntityKind, Faction } from '@/types';
import { hasComponent } from 'bitecs';

/**
 * Render the minimap.
 *
 * @param minimapCtx    - The 2D context of the 200x200 minimap canvas.
 * @param world         - Game world state.
 * @param entityEids    - All live entity IDs.
 * @param exploredCanvas - The explored-area canvas (drawn at low opacity).
 * @param minimapPings  - Active alert pings to render.
 * @param playerEids    - Player-owned entity IDs for visibility checks.
 * @param bgCanvas      - The full-world background terrain canvas (drawn scaled as base layer).
 */
export function drawMinimap(
  minimapCtx: CanvasRenderingContext2D,
  _world: GameWorld,
  entityEids: number[],
  exploredCanvas: HTMLCanvasElement,
  minimapPings: MinimapPing[],
  playerEids?: number[],
  bgCanvas?: HTMLCanvasElement,
): void {
  const mc = minimapCtx;
  const sx = MINIMAP_SIZE / WORLD_WIDTH;
  const sy = MINIMAP_SIZE / WORLD_HEIGHT;

  // Base layer: draw scaled terrain background if available, otherwise solid fill
  if (bgCanvas) {
    mc.drawImage(bgCanvas, 0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
  } else {
    mc.fillStyle = PALETTE.waterDeep;
    mc.fillRect(0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
  }

  // Draw explored areas with subtle tint (previously seen but not currently visible)
  mc.globalAlpha = 0.12;
  mc.drawImage(exploredCanvas, 0, 0, MINIMAP_SIZE, MINIMAP_SIZE);
  mc.globalAlpha = 1;

  // Draw current visibility circles — brighter than explored tint
  if (playerEids) {
    mc.globalAlpha = 0.25;
    mc.fillStyle = '#1e3a5f';
    for (const eid of playerEids) {
      if (Health.current[eid] <= 0) continue;
      const ex = Position.x[eid] * sx;
      const ey = Position.y[eid] * sy;
      const kind = EntityTypeTag.kind[eid] as EntityKind;
      const rad = (BUILDING_KINDS.has(kind) ? BUILDING_SIGHT_RADIUS : UNIT_SIGHT_RADIUS) * sx;
      mc.beginPath();
      mc.arc(ex, ey, rad, 0, Math.PI * 2);
      mc.fill();
    }
    mc.globalAlpha = 1;
  }

  // Sample explored canvas to check visibility for enemy entities
  const exploredCtx = exploredCanvas.getContext('2d', { willReadFrequently: true });
  let exploredData: ImageData | null = null;
  const ew = exploredCanvas.width;
  const eh = exploredCanvas.height;
  if (exploredCtx) {
    exploredData = exploredCtx.getImageData(0, 0, ew, eh);
  }

  // LOD: skip drawing some entities when count is high
  const entityTotal = entityEids.length;
  const lodStride = entityTotal > 400 ? 4 : entityTotal > 200 ? 2 : 1;

  // Draw entity dots
  for (let lodIdx = 0; lodIdx < entityEids.length; lodIdx++) {
    // Skip entities for LOD (always draw player units and buildings)
    const eid = entityEids[lodIdx];
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    const faction = FactionTag.faction[eid] as Faction;
    const def = ENTITY_DEFS[kind];

    // LOD: skip non-essential entities at high counts (always draw player, buildings, nests)
    if (
      lodStride > 1 &&
      lodIdx % lodStride !== 0 &&
      faction !== Faction.Player &&
      !def.isBuilding
    ) {
      continue;
    }

    const ex = Position.x[eid];
    const ey = Position.y[eid];

    // Fog of war: hide non-player entities unless currently visible to a player unit
    // Buildings show if the area was ever explored (like WC2 reveals buildings permanently)
    // Units only show if a player unit can currently see them
    if (faction !== Faction.Player) {
      // Check explored canvas first - if never explored, always hide
      if (exploredData) {
        const epx = Math.floor(ex / EXPLORED_SCALE);
        const epy = Math.floor(ey / EXPLORED_SCALE);
        if (epx >= 0 && epx < ew && epy >= 0 && epy < eh) {
          const idx = (epy * ew + epx) * 4;
          if (exploredData.data[idx] < 10) continue; // Never explored
        }
      }

      // For non-building units, require CURRENT visibility (within player sight range)
      const isBuilding = BUILDING_KINDS.has(kind);
      if (!isBuilding && playerEids) {
        let visible = false;
        for (const pid of playerEids) {
          if (Health.current[pid] <= 0) continue;
          const pkind = EntityTypeTag.kind[pid] as EntityKind;
          const sightRad = BUILDING_KINDS.has(pkind) ? BUILDING_SIGHT_RADIUS : UNIT_SIGHT_RADIUS;
          const dx = Position.x[pid] - ex;
          const dy = Position.y[pid] - ey;
          if (dx * dx + dy * dy < sightRad * sightRad) {
            visible = true;
            break;
          }
        }
        if (!visible) continue; // Not currently in any player unit's sight
      }
    }

    // Resource depletion: dim resources based on remaining amount
    const isResource = hasComponent(_world.ecs, eid, IsResource);
    if (isResource) {
      const maxAmount = def.resourceAmount ?? 1;
      const alpha = Math.max(0.2, Resource.amount[eid] / maxAmount);
      mc.globalAlpha = alpha;
    }

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

    // PredatorNest: pulsing/blinking red dots to draw player attention
    if (kind === EntityKind.PredatorNest) {
      const pulse = 0.5 + 0.5 * Math.sin(_world.frameCount * 0.1);
      mc.globalAlpha = 0.4 + pulse * 0.6;
      const pSize = dotSize + pulse * 2;
      mc.fillRect(ex * sx - pSize / 2, ey * sy - pSize / 2, pSize, pSize);
      mc.globalAlpha = 1;
    } else {
      mc.fillRect(ex * sx - dotSize / 2, ey * sy - dotSize / 2, dotSize, dotSize);
    }

    // Reset alpha after drawing resource dots
    if (isResource) {
      mc.globalAlpha = 1;
    }
  }

  // Draw animated radar-style pings
  for (const p of minimapPings) {
    const alpha = p.life / p.maxLife;
    const radius = 4 + Math.sin(p.life * 0.2) * 2;
    mc.strokeStyle = `rgba(239, 68, 68, ${alpha})`;
    mc.lineWidth = 1.5;
    mc.strokeRect(p.x * sx - radius, p.y * sy - radius, radius * 2, radius * 2);
  }
}

/**
 * Update the minimap camera-viewport indicator DOM element.
 *
 * @param element - The minimap-cam div element.
 * @param world   - Game world state (camera position, viewport size).
 */
export function updateMinimapViewport(element: HTMLElement, world: GameWorld): void {
  const sx = MINIMAP_SIZE / WORLD_WIDTH;
  const sy = MINIMAP_SIZE / WORLD_HEIGHT;

  element.classList.remove('hidden');
  element.style.left = `${world.camX * sx}px`;
  element.style.top = `${world.camY * sy}px`;
  element.style.width = `${world.viewWidth * sx}px`;
  element.style.height = `${world.viewHeight * sy}px`;
}
