/**
 * Labyrinth Scenario — Maze corridors with resources in dead ends.
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

export function spawnLabyrinth(ctx: SpawnContext, targetNestCount: number): void {
  const { world, rng, sx, sy, resourceMultiplier } = ctx;

  // Generate maze-like wall segments creating corridors.
  const cellSize = 200;
  const cols = Math.floor(WORLD_WIDTH / cellSize);
  const rows = Math.floor(WORLD_HEIGHT / cellSize);
  const wallSegmentLen = 40;

  // Spawn horizontal wall segments with gaps
  for (let row = 1; row < rows; row++) {
    const wy = row * cellSize;
    for (let col = 0; col < cols; col++) {
      const wx = col * cellSize + cellSize / 2;
      if (dist(wx, wy, sx, sy) < 250) continue;
      if (rng.float(0, 1) < 0.3) continue;
      spawnEntity(
        world,
        EntityKind.Wall,
        clampWorld(wx, WORLD_WIDTH),
        clampWorld(wy, WORLD_HEIGHT),
        Faction.Neutral,
      );
    }
  }

  // Spawn vertical wall segments with gaps
  for (let col = 1; col < cols; col++) {
    const wx = col * cellSize;
    for (let row = 0; row < rows; row++) {
      const wy = row * cellSize + cellSize / 2;
      if (dist(wx, wy, sx, sy) < 250) continue;
      if (rng.float(0, 1) < 0.3) continue;
      spawnEntity(
        world,
        EntityKind.Wall,
        clampWorld(wx, WORLD_WIDTH),
        clampWorld(wy, WORLD_HEIGHT),
        Faction.Neutral,
      );
    }
  }

  // Place rich resources in dead-end areas (corners and edges of cells)
  const deadEndCount = Math.floor(6 * resourceMultiplier);
  for (let i = 0; i < deadEndCount; i++) {
    const cellCol = rng.int(0, cols);
    const cellRow = rng.int(0, rows);
    const dex = cellCol * cellSize + rng.float(wallSegmentLen, cellSize - wallSegmentLen);
    const dey = cellRow * cellSize + rng.float(wallSegmentLen, cellSize - wallSegmentLen);
    if (dist(dex, dey, sx, sy) < 200) continue;
    spawnClambed(world, rng, dex, dey, true);
    for (let j = 0; j < 3; j++) {
      spawnCattail(world, rng, dex + rng.float(-60, 60), dey + rng.float(-60, 60), true);
    }
  }

  // Scattered resources in corridors
  const scatteredCattail = Math.floor(50 * resourceMultiplier);
  for (let i = 0; i < scatteredCattail; i++) {
    spawnCattail(world, rng, rng.float(60, WORLD_WIDTH - 60), rng.float(60, WORLD_HEIGHT - 60));
  }
  const scatteredClambed = Math.floor(3 * resourceMultiplier);
  for (let i = 0; i < scatteredClambed; i++) {
    spawnClambed(world, rng, rng.float(60, WORLD_WIDTH - 60), rng.float(60, WORLD_HEIGHT - 60));
  }

  // Pearl beds in central corridor junctions
  const pearlBedCount = rng.int(2, 4);
  for (let i = 0; i < pearlBedCount; i++) {
    spawnEntity(
      world,
      EntityKind.PearlBed,
      clampWorld(rng.float(WORLD_WIDTH * 0.3, WORLD_WIDTH * 0.7), WORLD_WIDTH),
      clampWorld(rng.float(WORLD_HEIGHT * 0.3, WORLD_HEIGHT * 0.7), WORLD_HEIGHT),
      Faction.Neutral,
    );
  }

  // Enemy nests placed in far corners of the maze
  const cornerPositions = [
    { x: WORLD_WIDTH * 0.15, y: WORLD_HEIGHT * 0.15 },
    { x: WORLD_WIDTH * 0.85, y: WORLD_HEIGHT * 0.15 },
    { x: WORLD_WIDTH * 0.15, y: WORLD_HEIGHT * 0.85 },
    { x: WORLD_WIDTH * 0.85, y: WORLD_HEIGHT * 0.85 },
  ];
  cornerPositions.sort((a, b) => dist(b.x, b.y, sx, sy) - dist(a.x, a.y, sx, sy));

  const campLocs: { x: number; y: number }[] = [];
  for (let i = 0; i < targetNestCount && i < cornerPositions.length; i++) {
    campLocs.push(cornerPositions[i]);
  }

  for (const loc of campLocs) {
    spawnEnemyCamp(ctx, loc, 1);
  }
}
