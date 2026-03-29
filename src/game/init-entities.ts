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
import { getFactionConfig } from '@/config/factions';
import { spawnEntity } from '@/ecs/archetypes';
import { Combat, Health, Resource, Velocity } from '@/ecs/components';
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
  const scenarios: MapScenario[] = ['standard', 'island', 'contested', 'labyrinth', 'river', 'peninsula'];
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

  // Determine enemy faction config (the AI's side, opposite of the player)
  const aiFactionKey = world.playerFaction === 'otter' ? 'predator' : 'otter';
  const aiFactionCfg = getFactionConfig(aiFactionKey as import('@/config/factions').PlayableFaction);

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
// Labyrinth scenario: maze corridors with resources in dead ends
// ---------------------------------------------------------------------------

function spawnLabyrinth(ctx: SpawnContext, targetNestCount: number): void {
  const { world, rng, sx, sy, resourceMultiplier } = ctx;

  // Generate maze-like wall segments creating corridors.
  // We use a grid-based approach: divide the map into cells and create
  // walls along cell boundaries with random openings.
  const cellSize = 200;
  const cols = Math.floor(WORLD_WIDTH / cellSize);
  const rows = Math.floor(WORLD_HEIGHT / cellSize);
  const wallSegmentLen = 40;

  // Spawn horizontal wall segments with gaps
  for (let row = 1; row < rows; row++) {
    const wy = row * cellSize;
    for (let col = 0; col < cols; col++) {
      const wx = col * cellSize + cellSize / 2;
      // Skip walls near player start
      if (dist(wx, wy, sx, sy) < 250) continue;
      // Random gap probability (30% chance of gap)
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
  // Sort by distance from player (farthest first)
  cornerPositions.sort((a, b) => dist(b.x, b.y, sx, sy) - dist(a.x, a.y, sx, sy));

  const campLocs: { x: number; y: number }[] = [];
  for (let i = 0; i < targetNestCount && i < cornerPositions.length; i++) {
    campLocs.push(cornerPositions[i]);
  }

  for (const loc of campLocs) {
    spawnEnemyCamp(ctx, loc, 1);
  }
}

// ---------------------------------------------------------------------------
// River scenario: vertical water divide with bridge choke points
// ---------------------------------------------------------------------------

function spawnRiver(ctx: SpawnContext, targetNestCount: number): void {
  const { world, rng, resourceMultiplier } = ctx;

  // Create a vertical "river" of walls down the center of the map
  // with 2-3 bridge gaps (choke points)
  const riverX = WORLD_WIDTH / 2;
  const bridgeCount = rng.int(2, 4);
  const bridgeGap = 100; // gap size for each bridge

  // Determine bridge Y positions (evenly spaced with some randomness)
  const bridgeYs: number[] = [];
  const sectionHeight = WORLD_HEIGHT / (bridgeCount + 1);
  for (let i = 0; i < bridgeCount; i++) {
    bridgeYs.push(sectionHeight * (i + 1) + rng.float(-50, 50));
  }

  // Spawn wall segments along the river line, skipping bridge positions
  const wallSpacing = 40;
  for (let wy = 60; wy < WORLD_HEIGHT - 60; wy += wallSpacing) {
    // Check if this Y is within a bridge gap
    let inBridge = false;
    for (const by of bridgeYs) {
      if (Math.abs(wy - by) < bridgeGap) {
        inBridge = true;
        break;
      }
    }
    if (inBridge) continue;

    // Spawn wall with slight random offset for natural look
    spawnEntity(
      world,
      EntityKind.Wall,
      clampWorld(riverX + rng.float(-15, 15), WORLD_WIDTH),
      clampWorld(wy, WORLD_HEIGHT),
      Faction.Neutral,
    );
  }

  // Player is on the left side, enemy on the right
  // Resources on both sides
  const leftCattail = Math.floor(40 * resourceMultiplier);
  for (let i = 0; i < leftCattail; i++) {
    spawnCattail(
      world,
      rng,
      rng.float(60, riverX - 80),
      rng.float(60, WORLD_HEIGHT - 60),
    );
  }
  const leftClambed = Math.floor(3 * resourceMultiplier);
  for (let i = 0; i < leftClambed; i++) {
    spawnClambed(
      world,
      rng,
      rng.float(60, riverX - 80),
      rng.float(60, WORLD_HEIGHT - 60),
    );
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

// ---------------------------------------------------------------------------
// Peninsula scenario: player on narrow land jutting from bottom
// ---------------------------------------------------------------------------

function spawnPeninsula(ctx: SpawnContext, targetNestCount: number): void {
  const { world, rng, resourceMultiplier } = ctx;

  // Create peninsula walls: a narrow corridor from bottom center,
  // opening up to the main land area at the top.
  const penWidth = WORLD_WIDTH * 0.35; // peninsula width
  const penLeft = (WORLD_WIDTH - penWidth) / 2;
  const penRight = penLeft + penWidth;
  const penTop = WORLD_HEIGHT * 0.45; // where peninsula meets mainland

  // Spawn walls on left side of peninsula
  const wallSpacing = 40;
  for (let wy = penTop; wy < WORLD_HEIGHT - 60; wy += wallSpacing) {
    // Left wall
    spawnEntity(
      world,
      EntityKind.Wall,
      clampWorld(penLeft + rng.float(-10, 10), WORLD_WIDTH),
      clampWorld(wy, WORLD_HEIGHT),
      Faction.Neutral,
    );
    // Right wall
    spawnEntity(
      world,
      EntityKind.Wall,
      clampWorld(penRight + rng.float(-10, 10), WORLD_WIDTH),
      clampWorld(wy, WORLD_HEIGHT),
      Faction.Neutral,
    );
  }

  // Add a partial wall across the top of the peninsula (entry point)
  // with a gap in the center for the single entry
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
    spawnCattail(
      world,
      rng,
      rng.float(60, WORLD_WIDTH - 60),
      rng.float(60, penTop - 60),
    );
  }
  const mainlandClambed = Math.floor(4 * resourceMultiplier);
  for (let i = 0; i < mainlandClambed; i++) {
    spawnClambed(
      world,
      rng,
      rng.float(60, WORLD_WIDTH - 60),
      rng.float(60, penTop - 60),
    );
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

// ---------------------------------------------------------------------------
// Main entry point
// ---------------------------------------------------------------------------

export function spawnInitialEntities(world: GameWorld): void {
  const rng = new SeededRandom(world.mapSeed);

  // Nest count: use custom override if set, otherwise fall back to difficulty defaults
  let targetNestCount: number;
  if (world.nestCountOverride >= 0) {
    targetNestCount = world.nestCountOverride;
  } else {
    const nestCountByDifficulty: Record<string, number> = {
      easy: 1,
      normal: 2,
      hard: 3,
      nightmare: 4,
      ultraNightmare: 5,
    };
    targetNestCount = nestCountByDifficulty[world.difficulty] ?? 2;
  }

  // Map resource multiplier: use custom resourceDensityMod from world
  const resourceMultiplier = world.resourceDensityMod;

  // ---- Pick scenario: use override if set, otherwise random ----
  const scenario: MapScenario = world.scenarioOverride ?? pickScenario(rng);
  mapScenarioSignal.value = scenario;

  // ---- Player start position depends on scenario ----
  let sx: number;
  let sy: number;

  if (scenario === 'island') {
    // Player starts in the center
    sx = WORLD_WIDTH / 2;
    sy = WORLD_HEIGHT / 2;
  } else if (scenario === 'river') {
    // Player starts on the left side of the river
    sx = WORLD_WIDTH * 0.25;
    sy = WORLD_HEIGHT / 2;
  } else if (scenario === 'peninsula') {
    // Player starts at the bottom center (on the peninsula)
    sx = WORLD_WIDTH / 2;
    sy = WORLD_HEIGHT * 0.75;
  } else if (scenario === 'labyrinth') {
    // Player starts in a random quadrant
    const playerQuad = rng.pick(QUADRANTS);
    const center = quadrantCenter(playerQuad);
    sx = center.x;
    sy = center.y;
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

  // ---- Spawn extra starting units if configured ----
  const playerFactionCfg = getFactionConfig(world.playerFaction);
  const extraUnits = world.startingUnitCount - 4; // base is 4 (commander + 2 gatherers + scout)
  for (let i = 0; i < extraUnits; i++) {
    const angle = (i / Math.max(extraUnits, 1)) * Math.PI * 2;
    spawnEntity(
      world,
      playerFactionCfg.gathererKind,
      sx + Math.cos(angle) * 50,
      sy + Math.sin(angle) * 50 + 40,
      Faction.Player,
    );
  }

  // ---- Spawn scenario-specific layout ----
  switch (scenario) {
    case 'island':
      spawnIsland(ctx, targetNestCount);
      break;
    case 'contested':
      spawnContested(ctx, targetNestCount);
      break;
    case 'labyrinth':
      spawnLabyrinth(ctx, targetNestCount);
      break;
    case 'river':
      spawnRiver(ctx, targetNestCount);
      break;
    case 'peninsula':
      spawnPeninsula(ctx, targetNestCount);
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

  // ---- Campaign-specific spawning ----
  const campaign = (world as GameWorld & { campaign?: { mission: { worldOverrides?: { spawnAlphaPredator?: boolean } } | null } }).campaign;
  if (campaign?.mission?.worldOverrides?.spawnAlphaPredator) {
    // Spawn Alpha Predator near the enemy side
    const alphaX = clampWorld(WORLD_WIDTH - sx, WORLD_WIDTH, 200);
    const alphaY = clampWorld(WORLD_HEIGHT - sy, WORLD_HEIGHT, 200);
    spawnEntity(world, EntityKind.AlphaPredator, alphaX, alphaY, Faction.Enemy);

    // Spawn escort army around the Alpha
    for (let i = 0; i < 6; i++) {
      spawnEntity(
        world,
        EntityKind.ArmoredGator,
        alphaX + rng.float(-100, 100),
        alphaY + rng.float(-100, 100),
        Faction.Enemy,
      );
    }
    for (let i = 0; i < 4; i++) {
      spawnEntity(
        world,
        EntityKind.VenomSnake,
        alphaX + rng.float(-100, 100),
        alphaY + rng.float(-100, 100),
        Faction.Enemy,
      );
    }
    for (let i = 0; i < 2; i++) {
      spawnEntity(
        world,
        EntityKind.SwampDrake,
        alphaX + rng.float(-80, 80),
        alphaY + rng.float(-80, 80),
        Faction.Enemy,
      );
    }
  }
}
