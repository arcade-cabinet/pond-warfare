/**
 * Init Entities - Shared Helpers
 *
 * Utility functions, types, and common spawning logic used by all map scenarios.
 */

import { getFactionConfig } from '@/config/factions';
import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import { Combat, Health, Resource, Velocity } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';
import type { SeededRandom } from '@/utils/random';

/** Quadrant labels and their approximate center positions (30% inset from edge). */
export const QUADRANTS = ['NW', 'NE', 'SW', 'SE'] as const;

export function quadrantCenter(q: (typeof QUADRANTS)[number]): { x: number; y: number } {
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
export function oppositeQuadrant(q: (typeof QUADRANTS)[number]): (typeof QUADRANTS)[number] {
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
export function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = ax - bx;
  const dy = ay - by;
  return Math.sqrt(dx * dx + dy * dy);
}

/** Clamp a value to the playable map area with some margin. */
export function clampWorld(v: number, max: number, margin = 60): number {
  return Math.max(margin, Math.min(max - margin, v));
}

/**
 * Spawn a cattail with a randomised resource amount.
 * Normal: 200-600 logs. Rich: 600-1200 logs.
 */
export function spawnCattail(
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
 * Normal: 2000-6000 fish. Rich: 6000-12000 fish.
 */
export function spawnClambed(
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

/** Find the nearest quadrant to a given position. */
export function nearestQuadrant(x: number, y: number): (typeof QUADRANTS)[number] {
  let best: (typeof QUADRANTS)[number] = 'NW';
  let bestDist = Infinity;
  for (const q of QUADRANTS) {
    const c = quadrantCenter(q);
    const d = dist(x, y, c.x, c.y);
    if (d < bestDist) {
      bestDist = d;
      best = q;
    }
  }
  return best;
}

export interface SpawnContext {
  world: GameWorld;
  rng: SeededRandom;
  /** Player start position */
  sx: number;
  sy: number;
  /** Resource multiplier from difficulty */
  resourceMultiplier: number;
}

/**
 * Spawn the player lodge, commander, and baseline Mudpaws.
 *
 * Legacy horizontal scenarios still use this helper, but they should boot the
 * same canonical manual baseline as the live vertical game: no free starter
 * scout, just the reusable Mudpaw chassis plus the Commander.
 */
export function spawnPlayerBase(ctx: SpawnContext): number {
  const { world, sx, sy } = ctx;
  const factionCfg = getFactionConfig(world.playerFaction);

  spawnEntity(world, factionCfg.lodgeKind, sx, sy, Faction.Player);

  const commanderEid = spawnEntity(world, factionCfg.heroKind, sx, sy + 40, Faction.Player);
  world.selection = [commanderEid];

  // Hero mode: boost commander HP, damage, and speed
  if (world.heroMode) {
    Health.max[commanderEid] = Math.round(Health.max[commanderEid] * 2);
    Health.current[commanderEid] = Health.max[commanderEid];
    Combat.damage[commanderEid] = Math.round(Combat.damage[commanderEid] * 1.5);
    Velocity.speed[commanderEid] = Velocity.speed[commanderEid] * 1.25;
  }

  spawnEntity(world, factionCfg.gathererKind, sx - 40, sy + 40, Faction.Player);
  spawnEntity(world, factionCfg.gathererKind, sx + 40, sy + 40, Faction.Player);

  const mapCenterX = WORLD_WIDTH / 2;
  const mapCenterY = WORLD_HEIGHT / 2;
  let dirX = mapCenterX - sx;
  let dirY = mapCenterY - sy;
  const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);
  if (dirLen < 1) {
    // Player is at map center (island scenario) — point the third Mudpaw east
    dirX = 1;
    dirY = 0;
  } else {
    dirX /= dirLen;
    dirY /= dirLen;
  }
  spawnEntity(
    world,
    factionCfg.gathererKind,
    sx + dirX * 60,
    sy + dirY * 60,
    Faction.Player,
  );

  // Center camera on Commander
  world.camX = sx - world.viewWidth / 2;
  world.camY = sy + 40 - world.viewHeight / 2;

  return commanderEid;
}

/** Spawn the guaranteed starting resources near the player. */
export function spawnPlayerResources(ctx: SpawnContext): void {
  const { world, rng, sx, sy } = ctx;
  spawnClambed(world, rng, sx - 120, sy - 40);
  for (let i = 0; i < 6; i++) {
    spawnCattail(world, rng, sx + 100 + rng.float(0, 60), sy - 60 + rng.float(0, 80));
  }
}

/** Spawn an enemy camp (nest + units + surrounding resources). */
export function spawnEnemyCamp(
  ctx: SpawnContext,
  loc: { x: number; y: number },
  unitsPerNest = 2,
): void {
  const { world, rng, resourceMultiplier } = ctx;

  // Determine enemy faction config (the AI's side, opposite of the player)
  const aiFactionKey = world.playerFaction === 'otter' ? 'predator' : 'otter';
  const aiFactionCfg = getFactionConfig(
    aiFactionKey as import('@/config/factions').PlayableFaction,
  );

  // Resources near each enemy camp
  const campCattail = Math.floor(8 * resourceMultiplier);
  for (let i = 0; i < campCattail; i++) {
    spawnCattail(world, rng, loc.x + rng.float(-200, 200), loc.y + rng.float(-200, 200));
  }
  spawnClambed(world, rng, loc.x + rng.float(-200, 200), loc.y + rng.float(-200, 200));

  // Enemy nest/lodge
  spawnEntity(world, aiFactionCfg.lodgeKind, loc.x, loc.y, Faction.Enemy);

  // Starting enemy units (melee + ranged from the AI faction)
  for (let j = 0; j < unitsPerNest; j++) {
    spawnEntity(
      world,
      aiFactionCfg.meleeKind,
      loc.x + rng.float(-75, 75),
      loc.y + rng.float(-75, 75),
      Faction.Enemy,
    );
    spawnEntity(
      world,
      aiFactionCfg.rangedKind,
      loc.x + rng.float(-75, 75),
      loc.y + rng.float(-75, 75),
      Faction.Enemy,
    );
  }
}

/** Spawn neutral wildlife (frogs and fish). */
export function spawnWildlife(ctx: SpawnContext): void {
  const { world, rng } = ctx;

  const frogCount = rng.int(5, 9);
  for (let i = 0; i < frogCount; i++) {
    spawnEntity(
      world,
      EntityKind.Frog,
      clampWorld(rng.float(60, WORLD_WIDTH - 60), WORLD_WIDTH),
      clampWorld(rng.float(60, WORLD_HEIGHT - 60), WORLD_HEIGHT),
      Faction.Neutral,
    );
  }

  const fishCount = rng.int(3, 6);
  for (let i = 0; i < fishCount; i++) {
    spawnEntity(
      world,
      EntityKind.Fish,
      clampWorld(rng.float(60, WORLD_WIDTH - 60), WORLD_WIDTH),
      clampWorld(rng.float(60, WORLD_HEIGHT - 60), WORLD_HEIGHT),
      Faction.Neutral,
    );
  }
}
