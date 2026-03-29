/**
 * Initial Entity Spawning
 *
 * Sets up the starting map using the world's mapSeed for reproducible
 * generation: player lodge in a random quadrant, enemy nests on the
 * opposite side, clustered resources near bases, contested "rich zones"
 * in between, and varied resource amounts.
 * Nest count and resource density vary by difficulty.
 *
 * Three map scenarios add replayability:
 *   - Standard: classic layout, player & enemy on opposite sides
 *   - Island: player in center, enemies on all 4 edges
 *   - Contested: both sides start close, rich zone between them
 */

import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import { Resource } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';
import type { MapScenario } from '@/ui/store';
import { mapScenario as mapScenarioSignal } from '@/ui/store';
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

/** Pick a scenario deterministically from the seeded RNG. */
function pickScenario(rng: SeededRandom): MapScenario {
  const scenarios: MapScenario[] = ['standard', 'island', 'contested'];
  return rng.pick(scenarios);
}

/** Pretty-print a scenario name for display. */
function scenarioLabel(scenario: MapScenario): string {
  return scenario.charAt(0).toUpperCase() + scenario.slice(1);
}

// ---------------------------------------------------------------------------
// Shared helpers used by multiple scenarios
// ---------------------------------------------------------------------------

interface SpawnContext {
  world: GameWorld;
  rng: SeededRandom;
  /** Player start position */
  sx: number;
  sy: number;
  /** Resource multiplier from difficulty */
  resourceMultiplier: number;
}

/** Spawn the player lodge, commander, gatherers, and scout. Returns commander eid. */
function spawnPlayerBase(ctx: SpawnContext): number {
  const { world, sx, sy } = ctx;

  spawnEntity(world, EntityKind.Lodge, sx, sy, Faction.Player);

  const commanderEid = spawnEntity(world, EntityKind.Commander, sx, sy + 40, Faction.Player);
  world.selection = [commanderEid];

  spawnEntity(world, EntityKind.Gatherer, sx - 40, sy + 40, Faction.Player);
  spawnEntity(world, EntityKind.Gatherer, sx + 40, sy + 40, Faction.Player);

  const mapCenterX = WORLD_WIDTH / 2;
  const mapCenterY = WORLD_HEIGHT / 2;
  let dirX = mapCenterX - sx;
  let dirY = mapCenterY - sy;
  const dirLen = Math.sqrt(dirX * dirX + dirY * dirY);
  if (dirLen < 1) {
    // Player is at map center (island scenario) — send scout in a random direction
    dirX = 1;
    dirY = 0;
  } else {
    dirX /= dirLen;
    dirY /= dirLen;
  }
  spawnEntity(
    world,
    EntityKind.Scout,
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
function spawnPlayerResources(ctx: SpawnContext): void {
  const { world, rng, sx, sy } = ctx;
  spawnClambed(world, rng, sx - 120, sy - 40);
  for (let i = 0; i < 6; i++) {
    spawnCattail(world, rng, sx + 100 + rng.float(0, 60), sy - 60 + rng.float(0, 80));
  }
}

/** Spawn an enemy camp (nest + units + surrounding resources). */
function spawnEnemyCamp(
  ctx: SpawnContext,
  loc: { x: number; y: number },
  unitsPerNest = 2,
): void {
  const { world, rng, resourceMultiplier } = ctx;

  // Resources near each enemy camp
  const campCattail = Math.floor(8 * resourceMultiplier);
  for (let i = 0; i < campCattail; i++) {
    spawnCattail(world, rng, loc.x + rng.float(-200, 200), loc.y + rng.float(-200, 200));
  }
  spawnClambed(world, rng, loc.x + rng.float(-200, 200), loc.y + rng.float(-200, 200));

  // Enemy nest
  spawnEntity(world, EntityKind.PredatorNest, loc.x, loc.y, Faction.Enemy);

  // Starting enemy units
  for (let j = 0; j < unitsPerNest; j++) {
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

/** Spawn neutral wildlife (frogs and fish). */
function spawnWildlife(ctx: SpawnContext): void {
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

// ---------------------------------------------------------------------------
// Standard scenario (original behaviour)
// ---------------------------------------------------------------------------

/** Find the nearest quadrant to a given position. */
function nearestQuadrant(x: number, y: number): (typeof QUADRANTS)[number] {
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

function spawnStandard(ctx: SpawnContext, targetNestCount: number): void {
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

// ---------------------------------------------------------------------------
// Island scenario: player in center, enemies on all 4 edges
// ---------------------------------------------------------------------------

function spawnIsland(ctx: SpawnContext, targetNestCount: number): void {
  const { world, rng, sx, sy, resourceMultiplier } = ctx;

  // ---- Rich resources in the center (player's economic advantage) ----
  const richCattailCount = Math.floor(14 * resourceMultiplier);
  for (let i = 0; i < richCattailCount; i++) {
    spawnCattail(
      world,
      rng,
      sx + rng.float(-250, 250),
      sy + rng.float(-250, 250),
      true,
    );
  }
  const richClambedCount = Math.floor(4 * resourceMultiplier);
  for (let i = 0; i < richClambedCount; i++) {
    spawnClambed(
      world,
      rng,
      sx + rng.float(-200, 200),
      sy + rng.float(-200, 200),
      true,
    );
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
  // More nests than normal difficulty would give, but each with fewer units
  const edgeMargin = 200;
  const edgePositions: { x: number; y: number }[] = [
    // North edge
    { x: WORLD_WIDTH / 2 + rng.float(-200, 200), y: edgeMargin },
    // South edge
    { x: WORLD_WIDTH / 2 + rng.float(-200, 200), y: WORLD_HEIGHT - edgeMargin },
    // West edge
    { x: edgeMargin, y: WORLD_HEIGHT / 2 + rng.float(-200, 200) },
    // East edge
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

// ---------------------------------------------------------------------------
// Contested scenario: both sides start close, rich zone in between
// ---------------------------------------------------------------------------

function spawnContested(ctx: SpawnContext, targetNestCount: number): void {
  const { world, rng, sx, sy, resourceMultiplier } = ctx;

  // ---- Enemy nests: close to the player (600px away instead of ~2000px) ----
  // Pick a random direction from the player
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

  // Dense rich resources in the contested middle
  const richCattailCount = Math.floor(16 * resourceMultiplier);
  for (let i = 0; i < richCattailCount; i++) {
    spawnCattail(
      world,
      rng,
      midX + rng.float(-200, 200),
      midY + rng.float(-200, 200),
      true,
    );
  }
  const richClambedCount = Math.floor(5 * resourceMultiplier);
  for (let i = 0; i < richClambedCount; i++) {
    spawnClambed(
      world,
      rng,
      midX + rng.float(-150, 150),
      midY + rng.float(-150, 150),
      true,
    );
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

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

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

  // ---- Pick scenario ----
  const scenario = pickScenario(rng);
  mapScenarioSignal.value = scenario;

  // ---- Player start position depends on scenario ----
  let sx: number;
  let sy: number;

  if (scenario === 'island') {
    // Player starts in the center
    sx = WORLD_WIDTH / 2;
    sy = WORLD_HEIGHT / 2;
  } else if (scenario === 'contested') {
    // Player starts in a random quadrant (same as standard)
    const playerQuad = rng.pick(QUADRANTS);
    const center = quadrantCenter(playerQuad);
    sx = center.x;
    sy = center.y;
  } else {
    // Standard: random quadrant
    const playerQuad = rng.pick(QUADRANTS);
    const center = quadrantCenter(playerQuad);
    sx = center.x;
    sy = center.y;
  }

  const ctx: SpawnContext = { world, rng, sx, sy, resourceMultiplier };

  // ---- Spawn player base & starting resources ----
  spawnPlayerBase(ctx);
  spawnPlayerResources(ctx);

  // ---- Spawn scenario-specific layout ----
  switch (scenario) {
    case 'island':
      spawnIsland(ctx, targetNestCount);
      break;
    case 'contested':
      spawnContested(ctx, targetNestCount);
      break;
    default:
      spawnStandard(ctx, targetNestCount);
      break;
  }

  // ---- Neutral wildlife (ambient, shared across all scenarios) ----
  spawnWildlife(ctx);

  // ---- Floating text announcing the map scenario ----
  world.floatingTexts.push({
    x: sx,
    y: sy - 80,
    text: `MAP: ${scenarioLabel(scenario)}`,
    color: '#38bdf8',
    life: 180, // 3 seconds at 60fps
  });
}
