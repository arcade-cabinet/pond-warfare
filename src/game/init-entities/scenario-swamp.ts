/**
 * Swamp Scenario — 70%+ Mud/Shallows, slow terrain everywhere.
 *
 * Small Grass "dry land" patches serve as base locations. Scattered Rocks
 * create maze-like paths. Makes Swift Paws tech extremely valuable since
 * +10% speed matters more on slow terrain. Resources concentrated on dry
 * land patches.
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

interface DryPatch {
  x: number;
  y: number;
  radius: number;
}

/** Generate dry land patch positions with minimum spacing. */
function generateDryPatches(
  rng: { float: (a: number, b: number) => number; int: (a: number, b: number) => number },
  count: number,
  minDist: number,
): DryPatch[] {
  const patches: DryPatch[] = [];
  const maxAttempts = 150;
  let attempts = 0;

  while (patches.length < count && attempts < maxAttempts) {
    attempts++;
    const x = rng.float(200, WORLD_WIDTH - 200);
    const y = rng.float(200, WORLD_HEIGHT - 200);
    const radius = rng.float(120, 220);

    let valid = true;
    for (const p of patches) {
      if (dist(x, y, p.x, p.y) < minDist) {
        valid = false;
        break;
      }
    }
    if (valid) patches.push({ x, y, radius });
  }
  return patches;
}

export function spawnSwamp(ctx: SpawnContext, targetNestCount: number): void {
  const { world, rng, sx, sy, resourceMultiplier } = ctx;

  // Generate 5-8 dry patches
  const patchCount = rng.int(5, 9);
  const dryPatches = generateDryPatches(rng, patchCount, 350);

  // Ensure player's dry patch exists
  let playerPatch = dryPatches.find((p) => dist(p.x, p.y, sx, sy) < 300);
  if (!playerPatch) {
    playerPatch = { x: sx, y: sy, radius: 200 };
    dryPatches.unshift(playerPatch);
  }

  // Resources concentrated on dry patches
  for (const patch of dryPatches) {
    const cattailCount = Math.floor(8 * resourceMultiplier);
    for (let i = 0; i < cattailCount; i++) {
      const angle = rng.float(0, Math.PI * 2);
      const r = rng.float(0, patch.radius * 0.8);
      spawnCattail(world, rng, patch.x + Math.cos(angle) * r, patch.y + Math.sin(angle) * r);
    }

    const clambedCount = Math.floor(1 * resourceMultiplier);
    for (let i = 0; i < clambedCount; i++) {
      spawnClambed(world, rng, patch.x + rng.float(-80, 80), patch.y + rng.float(-80, 80));
    }
  }

  // Extra clambeds on player patch
  spawnClambed(world, rng, sx + rng.float(-60, 60), sy + rng.float(-60, 60));

  // Pearl beds at distant dry patches
  const remotePatchesByDist = dryPatches
    .filter((p) => p !== playerPatch)
    .sort((a, b) => dist(b.x, b.y, sx, sy) - dist(a.x, a.y, sx, sy));

  for (const patch of remotePatchesByDist.slice(0, 2)) {
    spawnEntity(
      world,
      EntityKind.PearlBed,
      clampWorld(patch.x, WORLD_WIDTH),
      clampWorld(patch.y, WORLD_HEIGHT),
      Faction.Neutral,
    );
  }

  // Enemy camps on remote dry patches
  const enemyPatches = remotePatchesByDist.slice(0, targetNestCount);
  for (const patch of enemyPatches) {
    spawnEnemyCamp(ctx, {
      x: clampWorld(patch.x, WORLD_WIDTH, 200),
      y: clampWorld(patch.y, WORLD_HEIGHT, 200),
    });
  }

  // Fill remaining camps if not enough remote patches
  let remaining = targetNestCount - enemyPatches.length;
  while (remaining > 0) {
    const ex = rng.float(WORLD_WIDTH * 0.5, WORLD_WIDTH - 200);
    const ey = rng.float(200, WORLD_HEIGHT - 200);
    if (dist(ex, ey, sx, sy) > 500) {
      spawnEnemyCamp(ctx, {
        x: clampWorld(ex, WORLD_WIDTH, 200),
        y: clampWorld(ey, WORLD_HEIGHT, 200),
      });
      remaining--;
    }
  }
}
