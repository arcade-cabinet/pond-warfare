/**
 * Archipelago Scenario — Multiple islands connected by shallow bridges.
 *
 * Water tiles dominate the map with 4-6 grass islands. Shallows at 2-3
 * bridge crossings between islands create strategic chokepoints. Resources
 * are distributed across islands, forcing expansion.
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

interface Island {
  cx: number;
  cy: number;
  radius: number;
}

/** Generate island positions ensuring minimum spacing. */
function generateIslands(
  rng: { float: (a: number, b: number) => number },
  count: number,
  margin: number,
  minDist: number,
): Island[] {
  const islands: Island[] = [];
  const maxAttempts = 200;
  let attempts = 0;

  while (islands.length < count && attempts < maxAttempts) {
    attempts++;
    const cx = rng.float(margin, WORLD_WIDTH - margin);
    const cy = rng.float(margin, WORLD_HEIGHT - margin);
    const radius = rng.float(180, 320);

    let valid = true;
    for (const existing of islands) {
      if (dist(cx, cy, existing.cx, existing.cy) < minDist) {
        valid = false;
        break;
      }
    }
    if (valid) islands.push({ cx, cy, radius });
  }
  return islands;
}

export function spawnArchipelago(ctx: SpawnContext, targetNestCount: number): void {
  const { world, rng, sx, sy, resourceMultiplier } = ctx;

  // Generate 4-6 islands with guaranteed player island
  const islandCount = rng.int(4, 7);
  const islands = generateIslands(rng, islandCount, 200, 400);

  // Ensure the player's island exists at their start position
  let playerIsland = islands.find((i) => dist(i.cx, i.cy, sx, sy) < 400);
  if (!playerIsland) {
    playerIsland = { cx: sx, cy: sy, radius: 280 };
    islands.unshift(playerIsland);
  }

  // Distribute resources across islands
  for (const island of islands) {
    const cattailCount = Math.floor(6 * resourceMultiplier);
    for (let i = 0; i < cattailCount; i++) {
      const angle = rng.float(0, Math.PI * 2);
      const r = rng.float(0, island.radius * 0.7);
      spawnCattail(world, rng, island.cx + Math.cos(angle) * r, island.cy + Math.sin(angle) * r);
    }

    // Clambeds on non-player islands for expansion incentive
    if (island !== playerIsland) {
      const clambedCount = Math.floor(2 * resourceMultiplier);
      for (let i = 0; i < clambedCount; i++) {
        spawnClambed(
          world,
          rng,
          island.cx + rng.float(-100, 100),
          island.cy + rng.float(-100, 100),
        );
      }
    } else {
      // Player island gets guaranteed starting resources
      spawnClambed(world, rng, island.cx + rng.float(-80, 80), island.cy + rng.float(-80, 80));
    }
  }

  // Pearl beds on remote islands
  const remoteIslands = islands.filter((i) => i !== playerIsland && dist(i.cx, i.cy, sx, sy) > 600);
  for (const island of remoteIslands.slice(0, 2)) {
    spawnEntity(
      world,
      EntityKind.PearlBed,
      clampWorld(island.cx, WORLD_WIDTH),
      clampWorld(island.cy, WORLD_HEIGHT),
      Faction.Neutral,
    );
  }

  // Enemy camps on non-player islands
  const enemyIslands = islands
    .filter((i) => i !== playerIsland)
    .sort((a, b) => dist(b.cx, b.cy, sx, sy) - dist(a.cx, a.cy, sx, sy));

  for (let i = 0; i < Math.min(targetNestCount, enemyIslands.length); i++) {
    const island = enemyIslands[i];
    spawnEnemyCamp(ctx, {
      x: clampWorld(island.cx, WORLD_WIDTH, 200),
      y: clampWorld(island.cy, WORLD_HEIGHT, 200),
    });
  }
}
