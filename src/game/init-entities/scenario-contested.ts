/**
 * Contested Scenario — Both sides start close, rich zone in between.
 */

import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import { EntityKind, Faction } from '@/types';

import {
  clampWorld,
  dist,
  type SpawnContext,
  spawnCattail,
  spawnClambed,
  spawnEnemyCamp,
} from './helpers';

export function spawnContested(ctx: SpawnContext, targetNestCount: number): void {
  const { world, rng, sx, sy, resourceMultiplier } = ctx;

  // ---- Enemy nests: close to the player (600px away instead of ~2000px) ----
  const angle = rng.float(0, Math.PI * 2);
  const contestDistance = 600;
  const enemyCenterX = sx + Math.cos(angle) * contestDistance;
  const enemyCenterY = sy + Math.sin(angle) * contestDistance;

  const campLocs: { x: number; y: number }[] = [];
  const nestSpread = 200;

  // Generate candidates near the enemy center
  const candidates: { x: number; y: number }[] = [];
  for (let i = 0; i < 10; i++) {
    candidates.push({
      x: enemyCenterX + rng.float(-nestSpread, nestSpread),
      y: enemyCenterY + rng.float(-nestSpread, nestSpread),
    });
  }
  rng.shuffle(candidates);

  const minNestDist = 300;
  for (const cand of candidates) {
    if (campLocs.length >= targetNestCount) break;
    if (dist(cand.x, cand.y, sx, sy) < 400) continue;
    let tooClose = false;
    for (const existing of campLocs) {
      if (dist(cand.x, cand.y, existing.x, existing.y) < minNestDist) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) {
      campLocs.push({
        x: clampWorld(cand.x, WORLD_WIDTH, 200),
        y: clampWorld(cand.y, WORLD_HEIGHT, 200),
      });
    }
  }

  // Fallback
  while (campLocs.length < Math.max(1, targetNestCount)) {
    campLocs.push({
      x: clampWorld(enemyCenterX + rng.float(-150, 150), WORLD_WIDTH, 200),
      y: clampWorld(enemyCenterY + rng.float(-150, 150), WORLD_HEIGHT, 200),
    });
  }

  // ---- Rich contested zone between player and enemy ----
  const midX = (sx + enemyCenterX) / 2;
  const midY = (sy + enemyCenterY) / 2;

  const richCattailCount = Math.floor(16 * resourceMultiplier);
  for (let i = 0; i < richCattailCount; i++) {
    spawnCattail(world, rng, midX + rng.float(-200, 200), midY + rng.float(-200, 200), true);
  }
  const richClambedCount = Math.floor(5 * resourceMultiplier);
  for (let i = 0; i < richClambedCount; i++) {
    spawnClambed(world, rng, midX + rng.float(-150, 150), midY + rng.float(-150, 150), true);
  }

  // Pearl beds in the contested zone
  const pearlBedCount = rng.int(2, 4);
  for (let i = 0; i < pearlBedCount; i++) {
    spawnEntity(
      world,
      EntityKind.PearlBed,
      clampWorld(midX + rng.float(-200, 200), WORLD_WIDTH),
      clampWorld(midY + rng.float(-200, 200), WORLD_HEIGHT),
      Faction.Neutral,
    );
  }

  // ---- Fewer scattered resources (most are in the contested middle) ----
  const scatteredCattail = Math.floor(30 * resourceMultiplier);
  for (let i = 0; i < scatteredCattail; i++) {
    spawnCattail(world, rng, rng.float(60, WORLD_WIDTH - 60), rng.float(60, WORLD_HEIGHT - 60));
  }
  const scatteredClambed = Math.floor(2 * resourceMultiplier);
  for (let i = 0; i < scatteredClambed; i++) {
    spawnClambed(world, rng, rng.float(60, WORLD_WIDTH - 60), rng.float(60, WORLD_HEIGHT - 60));
  }

  // ---- Enemy camps ----
  for (const loc of campLocs) {
    spawnEnemyCamp(ctx, loc);
  }
}
