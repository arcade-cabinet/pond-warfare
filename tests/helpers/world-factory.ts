/**
 * Test World Factory
 *
 * Creates properly typed GameWorld instances for tests by using the real
 * createGameWorld() factory and applying test-specific overrides.
 *
 * All tests should use this instead of hand-rolled mock objects.
 * Parameterized by tier (1-6) for panel-aware tests.
 */

import { createGameWorld } from '@/ecs/world-defaults';
import type { GameWorld } from '@/ecs/world';
import { PanelGrid } from '@/game/panel-grid';
import { SeededRandom } from '@/utils/random';

export interface TestWorldOptions {
  /** Panel unlock stage (1-6). Default: 1 */
  stage?: number;
  /** Map seed. Default: 42 */
  seed?: number;
  /** Commander ID. Default: 'marshal' */
  commanderId?: string;
  /** Player faction. Default: 'otter' */
  faction?: string;
  /** Starting fish (clams). Default: from formula */
  fish?: number;
  /** Starting rocks (pearls). Default: 0 */
  rocks?: number;
  /** Starting logs (twigs). Default: 0 */
  logs?: number;
  /** Viewport width for panel grid. Default: 960 */
  viewportWidth?: number;
  /** Viewport height for panel grid. Default: 540 */
  viewportHeight?: number;
  /** Prestige rank. Default: 0 */
  prestigeRank?: number;
}

/**
 * Create a real GameWorld with all fields properly initialized.
 * Optionally configure stage, resources, commander, etc.
 */
export function createTestWorld(options: TestWorldOptions = {}): GameWorld {
  const {
    stage = 1,
    seed = 42,
    commanderId = 'marshal',
    faction = 'otter',
    fish,
    rocks = 0,
    logs = 0,
    viewportWidth = 960,
    viewportHeight = 540,
  } = options;

  const world = createGameWorld();

  // Core state
  world.mapSeed = seed;
  world.gameRng = new SeededRandom(seed);
  world.commanderId = commanderId;
  world.playerFaction = faction as 'otter' | 'predator';

  // Panel grid
  const panelGrid = new PanelGrid(viewportWidth, viewportHeight, stage);
  if (stage >= 3) {
    const rng = new SeededRandom(seed);
    panelGrid.computeUnlockedPanelsWithRng(stage, rng.next() < 0.5, rng.next() < 0.5);
  }
  world.panelGrid = panelGrid;

  // World dimensions from panel grid
  const dims = panelGrid.getWorldDimensions();
  world.worldWidth = dims.width;
  world.worldHeight = dims.height;
  world.viewWidth = viewportWidth;
  world.viewHeight = viewportHeight;

  // Resources
  if (fish !== undefined) {
    world.resources.clams = fish;
  }
  world.resources.pearls = rocks;
  world.resources.twigs = logs;

  return world;
}

/**
 * Create test worlds for all 6 tiers.
 * Returns an array of [stage, world] pairs for parameterized tests.
 */
export function createTieredWorlds(
  baseOptions: Omit<TestWorldOptions, 'stage'> = {},
): [number, GameWorld][] {
  return [1, 2, 3, 4, 5, 6].map((stage) => [
    stage,
    createTestWorld({ ...baseOptions, stage }),
  ]);
}

/**
 * Get the panel grid for a test world at a given stage.
 */
export function createTestPanelGrid(
  stage: number,
  viewportWidth = 960,
  viewportHeight = 540,
  seed = 42,
): PanelGrid {
  const panelGrid = new PanelGrid(viewportWidth, viewportHeight, stage);
  if (stage >= 3) {
    const rng = new SeededRandom(seed);
    panelGrid.computeUnlockedPanelsWithRng(stage, rng.next() < 0.5, rng.next() < 0.5);
  }
  return panelGrid;
}
