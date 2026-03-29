/**
 * Dynamic Lighting Renderer
 *
 * Dynamic lighting overlay using Canvas2D.
 *
 * Only active when ambientDarkness > 0.05. Draws radial gradient lights:
 * - Lodges / towers: warm yellow (251, 191, 36), radii 150 / 120
 * - Predator nests: red (239, 68, 68), radius 100
 * - Player units: pale yellow (253, 230, 138), radius 60
 * - Fireflies: green (163, 230, 53) with sine-wave phase animation
 *
 * The light canvas is composited via CSS `mix-blend-mode: screen`.
 */

import { Building, EntityTypeTag, FactionTag, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { BUILDING_KINDS, EntityKind, Faction, type Firefly } from '@/types';

/**
 * Render dynamic lighting onto the light canvas.
 *
 * @param lightCtx     - The 2D context of the light overlay canvas.
 * @param world        - Game world state.
 * @param entityEids   - All live entity IDs to consider for light emission.
 * @param fireflies    - Array of firefly visual objects.
 * @param shakeX       - Screen shake X offset.
 * @param shakeY       - Screen shake Y offset.
 */
export function drawLighting(
  lightCtx: CanvasRenderingContext2D,
  world: GameWorld,
  entityEids: number[],
  fireflies: Firefly[],
  shakeX: number,
  shakeY: number,
): void {
  const { camX, camY, viewWidth: w, viewHeight: h, ambientDarkness, frameCount } = world;
  const lc = lightCtx;

  lc.clearRect(0, 0, w, h);

  if (ambientDarkness <= 0.05) return;

  lc.save();
  lc.translate(-Math.floor(camX) + Math.floor(shakeX), -Math.floor(camY) + Math.floor(shakeY));

  // --- Entity lights ---
  for (const eid of entityEids) {
    const ex = Position.x[eid];
    const ey = Position.y[eid];

    // Frustum cull
    if (ex + 200 < camX || ex - 200 > camX + w || ey + 200 < camY || ey - 200 > camY + h) {
      continue;
    }

    let rad = 0;
    let rgb = '';
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    const faction = FactionTag.faction[eid] as Faction;

    if (kind === EntityKind.Lodge && Building.progress[eid] >= 100) {
      rad = 150;
      rgb = '251, 191, 36';
    } else if (kind === EntityKind.Tower && Building.progress[eid] >= 100) {
      rad = 120;
      rgb = '251, 191, 36';
    } else if (kind === EntityKind.PredatorNest) {
      rad = 100;
      rgb = '239, 68, 68';
    } else if (faction === Faction.Player && !BUILDING_KINDS.has(kind)) {
      rad = 60;
      rgb = '253, 230, 138';
    }

    if (rad > 0) {
      const lGrad = lc.createRadialGradient(ex, ey, rad * 0.1, ex, ey, rad);
      const pulse = 0.8 + Math.sin(frameCount * 0.05 + ex) * 0.1;
      lGrad.addColorStop(0, `rgba(${rgb}, ${ambientDarkness * pulse})`);
      lGrad.addColorStop(1, `rgba(${rgb}, 0)`);
      lc.fillStyle = lGrad;
      lc.beginPath();
      lc.arc(ex, ey, rad, 0, Math.PI * 2);
      lc.fill();
    }
  }

  // --- Fireflies ---
  for (const f of fireflies) {
    if (f.x < camX || f.x > camX + w || f.y < camY || f.y > camY + h) {
      continue;
    }

    const alpha = (Math.sin(f.phase) * 0.5 + 0.5) * ambientDarkness;

    // Inner glow (solid)
    lc.beginPath();
    lc.arc(f.x, f.y, 2, 0, Math.PI * 2);
    lc.fillStyle = `rgba(163, 230, 53, ${alpha})`;
    lc.fill();

    // Outer glow (softer)
    lc.beginPath();
    lc.arc(f.x, f.y, 6, 0, Math.PI * 2);
    lc.fillStyle = `rgba(163, 230, 53, ${alpha * 0.3})`;
    lc.fill();
  }

  lc.restore();
}
