/**
 * Initial Entity Spawning
 *
 * Sets up the starting map using the world's mapSeed for reproducible
 * generation: player lodge in a random quadrant, enemy nests on the
 * opposite side, clustered resources near bases, contested "rich zones"
 * in between, and varied resource amounts.
 * Nest count and resource density vary by difficulty.
 */

import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import { Resource } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';
import { SeededRandom } from '@/utils/random';

/** Quadrant labels and their approximate center positions (30% inset from edge). */
const QUADRANTS = ['NW', 'NE', 'SW', 'SE'] as const;

function quadrantCenter(q: (typeof QUADRANTS)[number]): { x: number; y: number } {
  const insetX = WORLD_WIDTH * 0.3;
  const insetY = WORLD_HEIGHT * 0.3;
  switch (q) {
    case 'NW':
      return { x: insetX, y: insetY };
    case 'NE':
      return { x: WORLD_WIDTH - insetX, y: insetY };
    case 'SW':
      return { x: insetX, y: WORLD_HEIGHT - insetY };
    case 'SE':
      return { x: WORLD_WIDTH - insetX, y: WORLD_HEIGHT - insetY };
  }
}

/** Return the quadrant diagonally opposite. */
function oppositeQuadrant(q: (typeof QUADRANTS)[number]): (typeof QUADRANTS)[number] {
  switch (q) {
    case 'NW':
      return 'SE';
    case 'NE':
      return 'SW';
    case 'SW':
      return 'NE';
    case 'SE':
      return 'NW';
  }
}

/** Euclidean distance helper. */
function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Clamp a value to the playable map area with some margin. */
function clampWorld(v: number, max: number, margin = 60): number {
  return Math.max(margin, Math.min(max - margin, v));
}

/**
 * Spawn a cattail with a randomised resource amount.
 * Normal: 200-600 twigs. Rich: 600-1200 twigs.
 */
function spawnCattail(
  world: GameWorld,
  rng: SeededRandom,
  x: number,
  y: number,
  rich = false,
): number {
  const eid = spawnEntity(
    world,
    EntityKind.Cattail,
    clampWorld(x, WORLD_WIDTH),
    clampWorld(y, WORLD_HEIGHT),
    Faction.Neutral,
  );
  Resource.amount[eid] = rich ? rng.int(600, 1200) : rng.int(200, 600);
  return eid;
}

/**
 * Spawn a clambed with a randomised resource amount.
 * Normal: 2000-6000 clams. Rich: 6000-12000 clams.
 */
function spawnClambed(
  world: GameWorld,
  rng: SeededRandom,
  x: number,
  y: number,
  rich = false,
): number {
  const eid = spawnEntity(
    world,
    EntityKind.Clambed,
    clampWorld(x, WORLD_WIDTH),
    clampWorld(y, WORLD_HEIGHT),
    Faction.Neutral,
  );
  Resource.amount[eid] = rich ? rng.int(6000, 12000) : rng.int(2000, 6000);
  return eid;
}

export function spawnInitialEntities(world: GameWorld): void {
  const rng = new SeededRandom(world.mapSeed);

  // Difficulty-based nest count
  const nestCountByDifficulty: Record<string, number> = {
    easy: 1,
    normal: 2,
    hard: 3,
    nightmare: 4,
    ultraNightmare: 5,
  };
  const targetNestCount = nestCountByDifficulty[world.difficulty] ?? 2;

  // Map resource multiplier by difficulty
  const resourceMultiplierByDifficulty: Record<string, number> = {
    easy: 1.0,
    normal: 1.0,
    hard: 0.75,
    nightmare: 0.5,
    ultraNightmare: 0.4,
  };
  const resourceMultiplier = resourceMultiplierByDifficulty[world.difficulty] ?? 1.0;

  // ---- Player start: random quadrant ----
  const playerQuad = rng.pick(QUADRANTS);
  const { x: sx, y: sy } = quadrantCenter(playerQuad);

  // Player lodge
  const lodgeEid = spawnEntity(world, EntityKind.Lodge, sx, sy, Faction.Player);
  world.selection = [lodgeEid];

  // 3 starting gatherers clustered near lodge
  spawnEntity(world, EntityKind.Gatherer, sx - 40, sy + 40, Faction.Player);
  spawnEntity(world, EntityKind.Gatherer, sx + 40, sy + 40, Faction.Player);
  spawnEntity(world, EntityKind.Gatherer, sx, sy + 50, Faction.Player);

  // ---- Guaranteed starting resources near player ----
  spawnClambed(world, rng, sx - 120, sy - 40);
  for (let i = 0; i < 6; i++) {
    spawnCattail(world, rng, sx + 100 + rng.float(0, 60), sy - 60 + rng.float(0, 80));
  }

  // ---- Enemy nests: opposite side of map ----
  const enemyQuad = oppositeQuadrant(playerQuad);
  const enemyCenter = quadrantCenter(enemyQuad);

  // Build candidate positions for nests around the enemy quadrant
  const nestSpread = 400;
  const edgeCandidates: { x: number; y: number }[] = [];

  // Core enemy quadrant area
  for (let i = 0; i < 12; i++) {
    edgeCandidates.push({
      x: enemyCenter.x + rng.float(-nestSpread, nestSpread),
      y: enemyCenter.y + rng.float(-nestSpread, nestSpread),
    });
  }
  // Add some positions along the adjacent edges for variety
  const midX = WORLD_WIDTH / 2;
  const midY = WORLD_HEIGHT / 2;
  edgeCandidates.push({ x: midX, y: enemyCenter.y }, { x: enemyCenter.x, y: midY });

  rng.shuffle(edgeCandidates);

  // Pick nests with minimum spacing (400px apart, 600px from player)
  const campLocs: { x: number; y: number }[] = [];
  const minNestDist = 400;

  for (const cand of edgeCandidates) {
    if (campLocs.length >= targetNestCount) break;
    // Must be far enough from player start
    if (dist(cand.x, cand.y, sx, sy) < 600) continue;
    // Must be far enough from other nests
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

  // Fallback: if we didn't get enough nests, place at enemy center
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
    // Pick a random point roughly between player and enemy territory
    const t = rng.float(0.3, 0.7);
    const rzx = sx + (enemyCenter.x - sx) * t + rng.float(-300, 300);
    const rzy = sy + (enemyCenter.y - sy) * t + rng.float(-300, 300);

    // Rich cattails
    const richCattailCount = Math.floor(8 * resourceMultiplier);
    for (let i = 0; i < richCattailCount; i++) {
      spawnCattail(
        world,
        rng,
        rzx + rng.float(-150, 150),
        rzy + rng.float(-150, 150),
        true, // rich
      );
    }
    // Rich clambeds
    const richClambedCount = Math.floor(3 * resourceMultiplier);
    for (let i = 0; i < richClambedCount; i++) {
      spawnClambed(
        world,
        rng,
        rzx + rng.float(-120, 120),
        rzy + rng.float(-120, 120),
        true, // rich
      );
    }
  }

  // ---- Contested resource hotspots: midpoints between player and each enemy camp ----
  for (const camp of campLocs) {
    const mx = (sx + camp.x) / 2;
    const my = (sy + camp.y) / 2;
    const hotspotCattail = Math.floor(6 * resourceMultiplier);
    for (let i = 0; i < hotspotCattail; i++) {
      spawnCattail(world, rng, mx + rng.float(-125, 125), my + rng.float(-125, 125));
    }
    spawnClambed(world, rng, mx + rng.float(-100, 100), my + rng.float(-100, 100));
  }

  // ---- Enemy camps with surrounding resources ----
  for (const loc of campLocs) {
    // Resources near each enemy camp
    const campCattail = Math.floor(8 * resourceMultiplier);
    for (let i = 0; i < campCattail; i++) {
      spawnCattail(world, rng, loc.x + rng.float(-200, 200), loc.y + rng.float(-200, 200));
    }
    spawnClambed(world, rng, loc.x + rng.float(-200, 200), loc.y + rng.float(-200, 200));

    // Enemy nest
    spawnEntity(world, EntityKind.PredatorNest, loc.x, loc.y, Faction.Enemy);

    // Starting enemy units
    for (let j = 0; j < 2; j++) {
      spawnEntity(
        world,
        EntityKind.Gator,
        loc.x + rng.float(-75, 75),
        loc.y + rng.float(-75, 75),
        Faction.Enemy,
      );
      spawnEntity(
        world,
        EntityKind.Snake,
        loc.x + rng.float(-75, 75),
        loc.y + rng.float(-75, 75),
        Faction.Enemy,
      );
    }
  }
}
