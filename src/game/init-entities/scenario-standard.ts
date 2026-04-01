/**
 * Standard Scenario — Classic layout with player and enemy on opposite sides.
 */

import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import { EntityKind, Faction } from '@/types';

import {
  clampWorld,
  dist,
  nearestQuadrant,
  oppositeQuadrant,
  quadrantCenter,
  type SpawnContext,
  spawnCattail,
  spawnClambed,
  spawnEnemyCamp,
} from './helpers';

export function spawnStandard(ctx: SpawnContext, targetNestCount: number): void {
  const { world, rng, sx, sy, resourceMultiplier } = ctx;

  // ---- Enemy nests: opposite side of map ----
  const playerQuad = nearestQuadrant(sx, sy);
  const enemyQuad = oppositeQuadrant(playerQuad);
  const enemyCenter = quadrantCenter(enemyQuad);

  const nestSpread = 400;
  const edgeCandidates: { x: number; y: number }[] = [];

  for (let i = 0; i < 12; i++) {
    edgeCandidates.push({
      x: enemyCenter.x + rng.float(-nestSpread, nestSpread),
      y: enemyCenter.y + rng.float(-nestSpread, nestSpread),
    });
  }
  const midX = WORLD_WIDTH / 2;
  const midY = WORLD_HEIGHT / 2;
  edgeCandidates.push({ x: midX, y: enemyCenter.y }, { x: enemyCenter.x, y: midY });

  rng.shuffle(edgeCandidates);

  const campLocs: { x: number; y: number }[] = [];
  const minNestDist = 400;

  for (const cand of edgeCandidates) {
    if (campLocs.length >= targetNestCount) break;
    if (dist(cand.x, cand.y, sx, sy) < 600) continue;
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

  while (campLocs.length < Math.max(1, targetNestCount)) {
    campLocs.push({
      x: clampWorld(enemyCenter.x + rng.float(-200, 200), WORLD_WIDTH, 200),
      y: clampWorld(enemyCenter.y + rng.float(-200, 200), WORLD_HEIGHT, 200),
    });
  }

  // ---- Scattered resources across the map ----
  const scatteredCattail = Math.floor(80 * resourceMultiplier);
  for (let i = 0; i < scatteredCattail; i++) {
    spawnCattail(world, rng, rng.float(60, WORLD_WIDTH - 60), rng.float(60, WORLD_HEIGHT - 60));
  }
  const scatteredClambed = Math.floor(4 * resourceMultiplier);
  for (let i = 0; i < scatteredClambed; i++) {
    spawnClambed(world, rng, rng.float(60, WORLD_WIDTH - 60), rng.float(60, WORLD_HEIGHT - 60));
  }

  // ---- 2-3 Rich zones at random contested positions ----
  const richZoneCount = rng.int(2, 4);
  for (let z = 0; z < richZoneCount; z++) {
    const t = rng.float(0.3, 0.7);
    const rzx = sx + (enemyCenter.x - sx) * t + rng.float(-300, 300);
    const rzy = sy + (enemyCenter.y - sy) * t + rng.float(-300, 300);

    const richCattailCount = Math.floor(8 * resourceMultiplier);
    for (let i = 0; i < richCattailCount; i++) {
      spawnCattail(world, rng, rzx + rng.float(-150, 150), rzy + rng.float(-150, 150), true);
    }
    const richClambedCount = Math.floor(3 * resourceMultiplier);
    for (let i = 0; i < richClambedCount; i++) {
      spawnClambed(world, rng, rzx + rng.float(-120, 120), rzy + rng.float(-120, 120), true);
    }
  }

  // ---- Pearl Beds ----
  const pearlBedCount = rng.int(2, 4);
  for (let i = 0; i < pearlBedCount; i++) {
    const t = rng.float(0.35, 0.65);
    const pbx = sx + (enemyCenter.x - sx) * t + rng.float(-250, 250);
    const pby = sy + (enemyCenter.y - sy) * t + rng.float(-250, 250);
    spawnEntity(
      world,
      EntityKind.PearlBed,
      clampWorld(pbx, WORLD_WIDTH),
      clampWorld(pby, WORLD_HEIGHT),
      Faction.Neutral,
    );
  }

  // ---- Contested resource hotspots ----
  for (const camp of campLocs) {
    const mx = (sx + camp.x) / 2;
    const my = (sy + camp.y) / 2;
    const hotspotCattail = Math.floor(6 * resourceMultiplier);
    for (let i = 0; i < hotspotCattail; i++) {
      spawnCattail(world, rng, mx + rng.float(-125, 125), my + rng.float(-125, 125));
    }
    spawnClambed(world, rng, mx + rng.float(-100, 100), my + rng.float(-100, 100));
  }

  // ---- Enemy camps ----
  for (const loc of campLocs) {
    spawnEnemyCamp(ctx, loc);
  }
}
