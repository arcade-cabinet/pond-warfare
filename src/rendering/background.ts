/**
 * Background Texture Generator
 *
 * buildBackground(): generates the procedural terrain with biome blending
 * using multi-octave value noise (fbm), splat blending between biome colors,
 * detail noise, and shore foam effects.
 *
 * The background canvas is sized to at least match the viewport so that
 * no black void is visible when the map is smaller than the screen.
 * Out-of-bounds pixels (outside the playable world) are filled with
 * procedural deep water.
 *
 * Fog texture and explored canvas utilities live in background-padding.ts.
 */

import type { PanelGrid } from '@/game/panel-grid';
import type { TerrainGrid } from '@/terrain/terrain-grid';
import { applyBiomeTint } from './background-biome';
import { biomeColor, fbm, type RGB, valueNoise } from './background-noise';
import { require2DContext } from './background-padding';

// Re-export fog/explored builders so existing imports from '@/rendering/background' keep working
export { buildExploredCanvas, buildFogTexture, require2DContext } from './background-padding';

/**
 * Generate the full-world procedural terrain background canvas.
 *
 * Uses multi-octave value noise to create a biome map with smooth
 * blending between biome colors, detail noise for texture variation,
 * and shore foam effects along water-land boundaries.
 *
 * When a TerrainGrid is provided, terrain tiles are tinted to reflect
 * their type (water=blue, mud=brown, rocks=grey, high ground=bright).
 *
 * The canvas extends to `max(worldW, viewW) x max(worldH, viewH)` so
 * the viewport never sees black void. Pixels outside the playable area
 * are filled with deep water noise.
 *
 * @param worldW  - World width in pixels (defaults to terrainGrid dims or 2560).
 * @param worldH  - World height in pixels (defaults to terrainGrid dims or 2560).
 * @param viewW   - Viewport width (optional, used to extend canvas).
 * @param viewH   - Viewport height (optional, used to extend canvas).
 * @param panelGrid - Optional PanelGrid for biome-aware tinting per panel.
 */
export function buildBackground(
  terrainGrid?: TerrainGrid,
  worldW?: number,
  worldH?: number,
  viewW?: number,
  viewH?: number,
  panelGrid?: PanelGrid | null,
): HTMLCanvasElement {
  const mapW = worldW ?? (terrainGrid ? terrainGrid.cols * 32 : 2560);
  const mapH = worldH ?? (terrainGrid ? terrainGrid.rows * 32 : 2560);

  // Canvas must be at least as large as the viewport to avoid black void.
  // Add padding so that when the camera centers a narrow map, the edges
  // outside the playable area still show terrain (deep water).
  const padX = viewW && viewW > mapW ? Math.ceil((viewW - mapW) / 2) : 0;
  const padY = viewH && viewH > mapH ? Math.ceil((viewH - mapH) / 2) : 0;
  const w = mapW + padX * 2;
  const h = mapH + padY * 2;

  // Paint at half resolution then upscale for performance.
  // Halves pixel count 4x with negligible visual difference on terrain.
  const RENDER_SCALE = 0.5;
  const renderW = Math.ceil(w * RENDER_SCALE);
  const renderH = Math.ceil(h * RENDER_SCALE);
  const invScale = 1 / RENDER_SCALE;

  const smallCanvas = document.createElement('canvas');
  smallCanvas.width = renderW;
  smallCanvas.height = renderH;
  const ctx = require2DContext(smallCanvas, { alpha: false });

  const bgCanvas = document.createElement('canvas');
  bgCanvas.width = w;
  bgCanvas.height = h;

  const imageData = ctx.createImageData(renderW, renderH);
  const pixels = imageData.data;

  const seed = 42;
  const detailSeed = 137;

  // Tile scale: map pixels across ~80 tiles of noise space
  const noiseScale = 80 / mapW;

  // Pre-compute the biome noise grid at a lower resolution and upsample
  // for performance. Use 4px blocks.
  const blockSize = 4;
  const gridW = Math.ceil(mapW / blockSize);
  const gridH = Math.ceil(mapH / blockSize);

  // Biome noise grid (covers only the playable area)
  const biomeGrid = new Float32Array(gridW * gridH);
  for (let gy = 0; gy < gridH; gy++) {
    for (let gx = 0; gx < gridW; gx++) {
      const wx = gx * blockSize * noiseScale;
      const wy = gy * blockSize * noiseScale;
      biomeGrid[gy * gridW + gx] = fbm(wx, wy, 5, seed);
    }
  }

  // Deep water base color for out-of-bounds pixels
  const DEEP_WATER: RGB = { r: 15, g: 32, b: 50 };

  // Render pixels at reduced resolution
  for (let y = 0; y < renderH; y++) {
    for (let x = 0; x < renderW; x++) {
      // Convert small canvas coords to full-res map-space coords
      const fullX = x * invScale;
      const fullY = y * invScale;
      const mx = fullX - padX;
      const my = fullY - padY;

      // Out-of-bounds: fill with deep water noise
      if (mx < 0 || mx >= mapW || my < 0 || my >= mapH) {
        const detailNx = x * noiseScale * 2;
        const detailNy = y * noiseScale * 2;
        const detail = valueNoise(detailNx, detailNy, detailSeed);
        const offset = (detail - 0.5) * 12;
        const idx = (y * renderW + x) * 4;
        pixels[idx] = Math.max(0, Math.min(255, DEEP_WATER.r + offset));
        pixels[idx + 1] = Math.max(0, Math.min(255, DEEP_WATER.g + offset));
        pixels[idx + 2] = Math.max(0, Math.min(255, DEEP_WATER.b + offset));
        pixels[idx + 3] = 255;
        continue;
      }

      // Bilinear interpolation of the biome grid for smoother results
      const gxf = mx / blockSize;
      const gyf = my / blockSize;
      const gx0 = Math.min(Math.floor(gxf), gridW - 1);
      const gy0 = Math.min(Math.floor(gyf), gridH - 1);
      const gx1 = Math.min(gx0 + 1, gridW - 1);
      const gy1 = Math.min(gy0 + 1, gridH - 1);
      const fx = gxf - gx0;
      const fy = gyf - gy0;

      const n00 = biomeGrid[gy0 * gridW + gx0];
      const n10 = biomeGrid[gy0 * gridW + gx1];
      const n01 = biomeGrid[gy1 * gridW + gx0];
      const n11 = biomeGrid[gy1 * gridW + gx1];

      const nx0 = n00 + fx * (n10 - n00);
      const nx1 = n01 + fx * (n11 - n01);
      const biomeVal = nx0 + fy * (nx1 - nx0);

      // Get base biome color
      let color = biomeColor(biomeVal);

      // Detail noise: higher frequency texture variation within each biome
      const detailNx = mx * noiseScale * 4;
      const detailNy = my * noiseScale * 4;
      const detail = valueNoise(detailNx, detailNy, detailSeed);
      const detailOffset = (detail - 0.5) * 16; // +/- 8 brightness variation

      color = {
        r: Math.max(0, Math.min(255, color.r + detailOffset)),
        g: Math.max(0, Math.min(255, color.g + detailOffset)),
        b: Math.max(0, Math.min(255, color.b + detailOffset)),
      };

      // Shore foam effect: detect water-land boundary
      const gx = Math.min(Math.floor(mx / blockSize), gridW - 1);
      const gy = Math.min(Math.floor(my / blockSize), gridH - 1);
      if (biomeVal > 0.4 && biomeVal < 0.5) {
        const leftBiome = gx > 0 ? biomeGrid[gy * gridW + (gx - 1)] : biomeVal;
        const rightBiome = gx < gridW - 1 ? biomeGrid[gy * gridW + (gx + 1)] : biomeVal;
        const upBiome = gy > 0 ? biomeGrid[(gy - 1) * gridW + gx] : biomeVal;
        const downBiome = gy < gridH - 1 ? biomeGrid[(gy + 1) * gridW + gx] : biomeVal;

        const hasWaterNeighbor =
          leftBiome < 0.35 || rightBiome < 0.35 || upBiome < 0.35 || downBiome < 0.35;

        if (hasWaterNeighbor) {
          const foamStrength = 0.3 + detail * 0.3;
          color = {
            r: Math.min(255, color.r + Math.round(60 * foamStrength)),
            g: Math.min(255, color.g + Math.round(70 * foamStrength)),
            b: Math.min(255, color.b + Math.round(80 * foamStrength)),
          };
        }
      }

      // Apply terrain type tint overlay (biome-aware when PanelGrid available)
      if (terrainGrid) {
        color = applyBiomeTint(color, terrainGrid, mx, my, panelGrid);
      }

      const idx = (y * renderW + x) * 4;
      pixels[idx] = color.r;
      pixels[idx + 1] = color.g;
      pixels[idx + 2] = color.b;
      pixels[idx + 3] = 255;
    }
  }

  ctx.putImageData(imageData, 0, 0);

  // Upscale to full resolution with smooth interpolation
  const bgCtx = require2DContext(bgCanvas, { alpha: false });
  bgCtx.imageSmoothingEnabled = true;
  bgCtx.imageSmoothingQuality = 'high';
  bgCtx.drawImage(smallCanvas, 0, 0, w, h);

  // Store padding offset on the canvas element so the renderer can
  // position the background sprite correctly (shifted by -padX, -padY).
  (bgCanvas as BgCanvas).padX = padX;
  (bgCanvas as BgCanvas).padY = padY;

  return bgCanvas;
}

/** Extended canvas type with padding metadata. */
export interface BgCanvas extends HTMLCanvasElement {
  padX: number;
  padY: number;
}
