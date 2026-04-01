/**
 * Peninsula Scenario — Player on narrow land jutting from bottom.
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

export function spawnPeninsula(ctx: SpawnContext, targetNestCount: number): void {
  const { world, rng, resourceMultiplier } = ctx;

  // Create peninsula walls: a narrow corridor from bottom center,
  // opening up to the main land area at the top.
  const penWidth = WORLD_WIDTH * 0.35;
  const penLeft = (WORLD_WIDTH - penWidth) / 2;
  const penRight = penLeft + penWidth;
  const penTop = WORLD_HEIGHT * 0.45;

  // Spawn walls on left side of peninsula
  const wallSpacing = 40;
  for (let wy = penTop; wy < WORLD_HEIGHT - 60; wy += wallSpacing) {
    spawnEntity(
      world,
      EntityKind.Wall,
      clampWorld(penLeft + rng.float(-10, 10), WORLD_WIDTH),
      clampWorld(wy, WORLD_HEIGHT),
      Faction.Neutral,
    );
    spawnEntity(
      world,
      EntityKind.Wall,
      clampWorld(penRight + rng.float(-10, 10), WORLD_WIDTH),
      clampWorld(wy, WORLD_HEIGHT),
      Faction.Neutral,
    );
  }

  // Add a partial wall across the top of the peninsula (entry point)
  const gapWidth = 120;
  const gapCenter = WORLD_WIDTH / 2;
  for (let wx = penLeft; wx < penRight; wx += wallSpacing) {
    if (Math.abs(wx - gapCenter) < gapWidth / 2) continue;
    spawnEntity(
      world,
      EntityKind.Wall,
      clampWorld(wx, WORLD_WIDTH),
      clampWorld(penTop + rng.float(-10, 10), WORLD_HEIGHT),
      Faction.Neutral,
    );
  }

  // Resources inside the peninsula (player's safe zone, limited)
  const penCattail = Math.floor(20 * resourceMultiplier);
  for (let i = 0; i < penCattail; i++) {
    spawnCattail(
      world,
      rng,
      rng.float(penLeft + 40, penRight - 40),
      rng.float(penTop + 40, WORLD_HEIGHT - 60),
    );
  }
  const penClambed = Math.floor(2 * resourceMultiplier);
  for (let i = 0; i < penClambed; i++) {
    spawnClambed(
      world,
      rng,
      rng.float(penLeft + 40, penRight - 40),
      rng.float(penTop + 40, WORLD_HEIGHT - 60),
    );
  }

  // Rich resources in the mainland (north of peninsula)
  const mainlandCattail = Math.floor(60 * resourceMultiplier);
  for (let i = 0; i < mainlandCattail; i++) {
    spawnCattail(world, rng, rng.float(60, WORLD_WIDTH - 60), rng.float(60, penTop - 60));
  }
  const mainlandClambed = Math.floor(4 * resourceMultiplier);
  for (let i = 0; i < mainlandClambed; i++) {
    spawnClambed(world, rng, rng.float(60, WORLD_WIDTH - 60), rng.float(60, penTop - 60));
  }

  // Pearl beds in the mainland
  const pearlBedCount = rng.int(2, 4);
  for (let i = 0; i < pearlBedCount; i++) {
    spawnEntity(
      world,
      EntityKind.PearlBed,
      clampWorld(rng.float(WORLD_WIDTH * 0.2, WORLD_WIDTH * 0.8), WORLD_WIDTH),
      clampWorld(rng.float(WORLD_HEIGHT * 0.1, penTop - 80), WORLD_HEIGHT),
      Faction.Neutral,
    );
  }

  // Enemy nests spread across the mainland (north half)
  const campLocs: { x: number; y: number }[] = [];
  for (let i = 0; i < targetNestCount; i++) {
    campLocs.push({
      x: clampWorld(rng.float(200, WORLD_WIDTH - 200), WORLD_WIDTH, 200),
      y: clampWorld(rng.float(200, penTop - 200), WORLD_HEIGHT, 200),
    });
  }

  for (const loc of campLocs) {
    spawnEnemyCamp(ctx, loc);
  }
}
