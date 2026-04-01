/**
 * River Scenario — Vertical water divide with bridge choke points.
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

export function spawnRiver(ctx: SpawnContext, targetNestCount: number): void {
  const { world, rng, resourceMultiplier } = ctx;

  // Create a vertical "river" of walls down the center of the map
  const riverX = WORLD_WIDTH / 2;
  const bridgeCount = rng.int(2, 4);
  const bridgeGap = 100;

  // Determine bridge Y positions (evenly spaced with some randomness)
  const bridgeYs: number[] = [];
  const sectionHeight = WORLD_HEIGHT / (bridgeCount + 1);
  for (let i = 0; i < bridgeCount; i++) {
    bridgeYs.push(sectionHeight * (i + 1) + rng.float(-50, 50));
  }

  // Spawn wall segments along the river line, skipping bridge positions
  const wallSpacing = 40;
  for (let wy = 60; wy < WORLD_HEIGHT - 60; wy += wallSpacing) {
    let inBridge = false;
    for (const by of bridgeYs) {
      if (Math.abs(wy - by) < bridgeGap) {
        inBridge = true;
        break;
      }
    }
    if (inBridge) continue;

    spawnEntity(
      world,
      EntityKind.Wall,
      clampWorld(riverX + rng.float(-15, 15), WORLD_WIDTH),
      clampWorld(wy, WORLD_HEIGHT),
      Faction.Neutral,
    );
  }

  // Player is on the left side, enemy on the right
  const leftCattail = Math.floor(40 * resourceMultiplier);
  for (let i = 0; i < leftCattail; i++) {
    spawnCattail(world, rng, rng.float(60, riverX - 80), rng.float(60, WORLD_HEIGHT - 60));
  }
  const leftClambed = Math.floor(3 * resourceMultiplier);
  for (let i = 0; i < leftClambed; i++) {
    spawnClambed(world, rng, rng.float(60, riverX - 80), rng.float(60, WORLD_HEIGHT - 60));
  }

  const rightCattail = Math.floor(40 * resourceMultiplier);
  for (let i = 0; i < rightCattail; i++) {
    spawnCattail(
      world,
      rng,
      rng.float(riverX + 80, WORLD_WIDTH - 60),
      rng.float(60, WORLD_HEIGHT - 60),
    );
  }
  const rightClambed = Math.floor(3 * resourceMultiplier);
  for (let i = 0; i < rightClambed; i++) {
    spawnClambed(
      world,
      rng,
      rng.float(riverX + 80, WORLD_WIDTH - 60),
      rng.float(60, WORLD_HEIGHT - 60),
    );
  }

  // Rich resources near bridge choke points (contested areas)
  for (const by of bridgeYs) {
    const richCount = Math.floor(4 * resourceMultiplier);
    for (let i = 0; i < richCount; i++) {
      spawnCattail(world, rng, riverX + rng.float(-100, 100), by + rng.float(-60, 60), true);
    }
    spawnClambed(world, rng, riverX + rng.float(-60, 60), by + rng.float(-40, 40), true);
  }

  // Pearl beds near bridges
  const pearlBedCount = Math.min(bridgeCount, rng.int(1, 3));
  for (let i = 0; i < pearlBedCount; i++) {
    spawnEntity(
      world,
      EntityKind.PearlBed,
      clampWorld(riverX + rng.float(-80, 80), WORLD_WIDTH),
      clampWorld(bridgeYs[i] + rng.float(-50, 50), WORLD_HEIGHT),
      Faction.Neutral,
    );
  }

  // Enemy nests on the right side of the river
  const campLocs: { x: number; y: number }[] = [];
  for (let i = 0; i < targetNestCount; i++) {
    campLocs.push({
      x: clampWorld(rng.float(riverX + 200, WORLD_WIDTH - 200), WORLD_WIDTH, 200),
      y: clampWorld(rng.float(200, WORLD_HEIGHT - 200), WORLD_HEIGHT, 200),
    });
  }

  for (const loc of campLocs) {
    spawnEnemyCamp(ctx, loc);
  }
}
