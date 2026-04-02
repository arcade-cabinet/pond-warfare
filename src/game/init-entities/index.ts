/**
 * Initial Entity Spawning
 *
 * Sets up the starting map using the world's mapSeed for reproducible
 * generation. Scenario functions are in separate files.
 */

import { getFactionConfig } from '@/config/factions';
import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import type { GameWorld } from '@/ecs/world';
import {
  paintArchipelago,
  paintContested,
  paintIsland,
  paintLabyrinth,
  paintPeninsula,
  paintRavine,
  paintRiver,
  paintStandard,
  paintSwamp,
} from '@/terrain/terrain-painters';
import { EntityKind, Faction } from '@/types';
import type { MapScenario } from '@/ui/store';
import { mapScenario as mapScenarioSignal } from '@/ui/store';
import { SeededRandom } from '@/utils/random';
import {
  clampWorld,
  QUADRANTS,
  quadrantCenter,
  spawnPlayerBase,
  spawnPlayerResources,
  spawnWildlife,
} from './helpers';
import { spawnArchipelago } from './scenario-archipelago';
import { spawnContested } from './scenario-contested';
import { spawnIsland } from './scenario-island';
import { spawnLabyrinth } from './scenario-labyrinth';
import { spawnPeninsula } from './scenario-peninsula';
import { spawnRavine } from './scenario-ravine';
import { spawnRiver } from './scenario-river';
import { spawnStandard } from './scenario-standard';
import { spawnSwamp } from './scenario-swamp';

/** Pick a scenario deterministically from the seeded RNG. */
function pickScenario(rng: SeededRandom): MapScenario {
  const scenarios: MapScenario[] = [
    'standard',
    'island',
    'contested',
    'labyrinth',
    'river',
    'peninsula',
    'archipelago',
    'ravine',
    'swamp',
  ];
  return rng.pick(scenarios);
}

/** Pretty-print a scenario name for display. */
function scenarioLabel(scenario: MapScenario): string {
  return scenario.charAt(0).toUpperCase() + scenario.slice(1);
}

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

  const resourceMultiplier = world.resourceDensityMod;

  // ---- Pick scenario: use override if set, otherwise random ----
  const scenario: MapScenario = world.scenarioOverride ?? pickScenario(rng);
  mapScenarioSignal.value = scenario;

  // ---- Player start position depends on scenario ----
  let sx: number;
  let sy: number;

  if (scenario === 'island') {
    sx = WORLD_WIDTH / 2;
    sy = WORLD_HEIGHT / 2;
  } else if (scenario === 'river') {
    sx = WORLD_WIDTH * 0.25;
    sy = WORLD_HEIGHT / 2;
  } else if (scenario === 'peninsula') {
    sx = WORLD_WIDTH / 2;
    sy = WORLD_HEIGHT * 0.75;
  } else if (scenario === 'labyrinth') {
    const playerQuad = rng.pick(QUADRANTS);
    const center = quadrantCenter(playerQuad);
    sx = center.x;
    sy = center.y;
  } else if (scenario === 'contested') {
    const playerQuad = rng.pick(QUADRANTS);
    const center = quadrantCenter(playerQuad);
    sx = center.x;
    sy = center.y;
  } else if (scenario === 'archipelago') {
    // Player starts on a corner island
    const playerQuad = rng.pick(QUADRANTS);
    const center = quadrantCenter(playerQuad);
    sx = center.x;
    sy = center.y;
  } else if (scenario === 'ravine') {
    // Player starts on the west high ground
    sx = WORLD_WIDTH * 0.25;
    sy = WORLD_HEIGHT / 2;
  } else if (scenario === 'swamp') {
    // Player starts on a dry patch near the edge
    const playerQuad = rng.pick(QUADRANTS);
    const center = quadrantCenter(playerQuad);
    sx = center.x;
    sy = center.y;
  } else {
    const playerQuad = rng.pick(QUADRANTS);
    const center = quadrantCenter(playerQuad);
    sx = center.x;
    sy = center.y;
  }

  const ctx = { world, rng, sx, sy, resourceMultiplier };

  // ---- Spawn player base & starting resources ----
  spawnPlayerBase(ctx);
  spawnPlayerResources(ctx);

  // ---- Spawn extra starting units if configured ----
  const playerFactionCfg = getFactionConfig(world.playerFaction);
  const extraUnits = world.startingUnitCount - 4;
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
    case 'archipelago':
      spawnArchipelago(ctx, targetNestCount);
      break;
    case 'ravine':
      spawnRavine(ctx, targetNestCount);
      break;
    case 'swamp':
      spawnSwamp(ctx, targetNestCount);
      break;
    default:
      spawnStandard(ctx, targetNestCount);
      break;
  }

  // ---- Paint terrain types for the selected scenario ----
  const tg = world.terrainGrid;
  switch (scenario) {
    case 'island':
      paintIsland(tg, rng);
      break;
    case 'contested':
      paintContested(tg, rng);
      break;
    case 'labyrinth':
      paintLabyrinth(tg, rng);
      break;
    case 'river':
      paintRiver(tg, rng);
      break;
    case 'peninsula':
      paintPeninsula(tg, rng);
      break;
    case 'archipelago':
      paintArchipelago(tg, rng);
      break;
    case 'ravine':
      paintRavine(tg, rng);
      break;
    case 'swamp':
      paintSwamp(tg, rng);
      break;
    default:
      paintStandard(tg, rng);
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
    life: 180,
  });

  // ---- Campaign-specific spawning ----
  const campaign = (
    world as GameWorld & {
      campaign?: { mission: { worldOverrides?: { spawnAlphaPredator?: boolean } } | null };
    }
  ).campaign;
  if (campaign?.mission?.worldOverrides?.spawnAlphaPredator) {
    const alphaX = clampWorld(WORLD_WIDTH - sx, WORLD_WIDTH, 200);
    const alphaY = clampWorld(WORLD_HEIGHT - sy, WORLD_HEIGHT, 200);
    spawnEntity(world, EntityKind.AlphaPredator, alphaX, alphaY, Faction.Enemy);

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
