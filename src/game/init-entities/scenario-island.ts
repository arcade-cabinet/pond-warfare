/**
 * Island Scenario — Player in center, enemies on all 4 edges.
 */

import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import { EntityKind, Faction } from '@/types';

import {
  clampWorld,
  type SpawnContext,
  spawnCattail,
  spawnClambed,
  spawnEnemyCamp,
} from './helpers';

export function spawnIsland(ctx: SpawnContext, targetNestCount: number): void {
  const { world, rng, sx, sy, resourceMultiplier } = ctx;

  // ---- Rich resources in the center (player's economic advantage) ----
  const richCattailCount = Math.floor(14 * resourceMultiplier);
  for (let i = 0; i < richCattailCount; i++) {
    spawnCattail(world, rng, sx + rng.float(-250, 250), sy + rng.float(-250, 250), true);
  }
  const richClambedCount = Math.floor(4 * resourceMultiplier);
  for (let i = 0; i < richClambedCount; i++) {
    spawnClambed(world, rng, sx + rng.float(-200, 200), sy + rng.float(-200, 200), true);
  }

  // Pearl beds near center
  const pearlBedCount = rng.int(2, 4);
  for (let i = 0; i < pearlBedCount; i++) {
    spawnEntity(
      world,
      EntityKind.PearlBed,
      clampWorld(sx + rng.float(-300, 300), WORLD_WIDTH),
      clampWorld(sy + rng.float(-300, 300), WORLD_HEIGHT),
      Faction.Neutral,
    );
  }

  // ---- Light scattered resources across the map ----
  const scatteredCattail = Math.floor(40 * resourceMultiplier);
  for (let i = 0; i < scatteredCattail; i++) {
    spawnCattail(world, rng, rng.float(60, WORLD_WIDTH - 60), rng.float(60, WORLD_HEIGHT - 60));
  }
  const scatteredClambed = Math.floor(2 * resourceMultiplier);
  for (let i = 0; i < scatteredClambed; i++) {
    spawnClambed(world, rng, rng.float(60, WORLD_WIDTH - 60), rng.float(60, WORLD_HEIGHT - 60));
  }

  // ---- Enemy nests at all 4 edges ----
  const edgeMargin = 200;
  const edgePositions: { x: number; y: number }[] = [
    { x: WORLD_WIDTH / 2 + rng.float(-200, 200), y: edgeMargin },
    { x: WORLD_WIDTH / 2 + rng.float(-200, 200), y: WORLD_HEIGHT - edgeMargin },
    { x: edgeMargin, y: WORLD_HEIGHT / 2 + rng.float(-200, 200) },
    { x: WORLD_WIDTH - edgeMargin, y: WORLD_HEIGHT / 2 + rng.float(-200, 200) },
  ];

  // Always use at least 4 nests in island mode, but can add more at higher difficulties
  const nestCount = Math.max(4, targetNestCount);
  const campLocs: { x: number; y: number }[] = [];

  // Place one nest per edge first
  for (const pos of edgePositions) {
    campLocs.push({
      x: clampWorld(pos.x, WORLD_WIDTH, edgeMargin),
      y: clampWorld(pos.y, WORLD_HEIGHT, edgeMargin),
    });
  }

  // Add extra nests at random edges for higher difficulties
  if (nestCount > 4) {
    const extraEdges = rng.shuffle([...edgePositions]);
    for (let i = 0; i < nestCount - 4 && i < extraEdges.length; i++) {
      const base = extraEdges[i];
      campLocs.push({
        x: clampWorld(base.x + rng.float(-150, 150), WORLD_WIDTH, edgeMargin),
        y: clampWorld(base.y + rng.float(-150, 150), WORLD_HEIGHT, edgeMargin),
      });
    }
  }

  // ---- Contested resource hotspots between center and each edge ----
  for (const camp of campLocs) {
    const mx = (sx + camp.x) / 2;
    const my = (sy + camp.y) / 2;
    const hotspotCattail = Math.floor(4 * resourceMultiplier);
    for (let i = 0; i < hotspotCattail; i++) {
      spawnCattail(world, rng, mx + rng.float(-100, 100), my + rng.float(-100, 100));
    }
  }

  // ---- Enemy camps with smaller waves (1 unit pair per nest instead of 2) ----
  for (const loc of campLocs) {
    spawnEnemyCamp(ctx, loc, 1);
  }
}
