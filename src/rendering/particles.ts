/**
 * Particle & Projectile Trail Rendering Utilities
 *
 * Port of the particle drawing (lines 1365-1370) and projectile drawing
 * (Projectile.draw, lines 331-343) from the original pond_craft.html.
 *
 * These are simple Canvas2D helper functions called by the main game renderer.
 */

import { PALETTE } from '@/constants';
import type { FloatingText, Particle } from '@/types';

/** Projectile visual state for rendering. */
export interface ProjectileRenderData {
  x: number;
  y: number;
  trail: { x: number; y: number; life: number }[];
}

/**
 * Draw all particles with alpha fade based on remaining life.
 * Each particle is a small filled rectangle.
 */
export function drawParticles(ctx: CanvasRenderingContext2D, particles: Particle[]): void {
  for (const p of particles) {
    ctx.globalAlpha = Math.min(1, p.life / 10);
    ctx.fillStyle = p.color;
    ctx.fillRect(p.x, p.y, p.size, p.size);
  }
  ctx.globalAlpha = 1.0;
}

/**
 * Tick trail lifetimes and prune expired entries.
 * Call once per frame before rendering.
 */
export function updateProjectileTrails(projectiles: ProjectileRenderData[]): void {
  for (const proj of projectiles) {
    for (let i = proj.trail.length - 1; i >= 0; i--) {
      proj.trail[i].life--;
      if (proj.trail[i].life <= 0) {
        proj.trail.splice(i, 1);
      }
    }
  }
}

/**
 * Draw a single projectile: trail segments with fading alpha,
 * then the projectile body (stone outer + white inner).
 * This is a pure render function with no mutation.
 */
export function drawProjectile(ctx: CanvasRenderingContext2D, proj: ProjectileRenderData): void {
  // Draw trail
  for (const t of proj.trail) {
    const alpha = t.life / 8;
    ctx.fillStyle = `rgba(156, 163, 175, ${alpha * 0.6})`;
    ctx.fillRect(t.x - 1, t.y - 1, 2, 2);
  }
  // Projectile body
  ctx.fillStyle = PALETTE.stone;
  ctx.fillRect(proj.x - 2, proj.y - 2, 4, 4);
  ctx.fillStyle = '#fff';
  ctx.fillRect(proj.x - 1, proj.y - 1, 2, 2);
}

/**
 * Draw all projectiles in the scene.
 */
export function drawProjectiles(
  ctx: CanvasRenderingContext2D,
  projectiles: ProjectileRenderData[],
): void {
  for (const p of projectiles) {
    drawProjectile(ctx, p);
  }
}

/**
 * Draw floating text with outline.
 * Each text entry fades out as its life decreases below 30 frames.
 */
export function drawFloatingTexts(
  ctx: CanvasRenderingContext2D,
  floatingTexts: FloatingText[],
): void {
  ctx.font = "bold 14px 'Courier New'";
  ctx.textAlign = 'center';
  ctx.lineWidth = 1;
  ctx.strokeStyle = '#000';
  for (const f of floatingTexts) {
    ctx.fillStyle = f.color;
    ctx.globalAlpha = Math.min(1, f.life / 30);
    ctx.fillText(f.text, f.x, f.y);
    ctx.strokeText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1.0;
  ctx.globalAlpha = 1.0;
}
