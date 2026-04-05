/**
 * Spawn Positions
 *
 * Panel-aware edge calculation and position generation for enemy spawns.
 * Reads the 6-panel grid config to determine available spawn edges
 * based on which panels are unlocked at the current progression stage.
 */

import type { SpawnPattern } from '@/config/v3-types';
import { WORLD_WIDTH } from '@/constants';
import type { GameWorld } from '@/ecs/world';
import type { PanelId } from '@/game/panel-grid';
import { SeededRandom } from '@/utils/random';
import {
  patternFlank,
  patternFunnel,
  patternLine,
  patternLSweep,
  patternPincer,
  patternScatter,
  patternSurround,
  patternTHammer,
  patternVFormation,
  patternWave,
} from './spawn-patterns';

// -- Types ----------------------------------------------------------------

export interface SpawnPosition {
  x: number;
  y: number;
}

// -- Edge Calculation -----------------------------------------------------

/** Get PRNG-seeded spawn origin from a panel edge. */
function edgeOrigin(
  world: GameWorld,
  rng: SeededRandom,
  edge: 'top' | 'left' | 'right',
  panelId: PanelId,
): SpawnPosition {
  const grid = world.panelGrid!;
  const b = grid.getPanelBounds(panelId);
  switch (edge) {
    case 'top':
      return { x: b.x + b.width * (0.2 + rng.next() * 0.6), y: b.y + 20 + rng.next() * 20 };
    case 'left':
      return { x: b.x + 20 + rng.next() * 20, y: b.y + b.height * (0.2 + rng.next() * 0.6) };
    case 'right':
      return {
        x: b.x + b.width - 20 - rng.next() * 20,
        y: b.y + b.height * (0.2 + rng.next() * 0.6),
      };
  }
}

/** Get available spawn edges based on unlocked panels. */
export function getSpawnEdges(world: GameWorld, rng: SeededRandom): SpawnPosition[] {
  const grid = world.panelGrid;
  if (!grid) {
    const mapW = world.worldWidth || WORLD_WIDTH;
    return [{ x: mapW * 0.3 + rng.next() * mapW * 0.4, y: 20 + rng.next() * 30 }];
  }

  const active = grid.getActivePanels();
  const edges: SpawnPosition[] = [];

  // Top row panels
  for (const pid of [1, 2, 3] as PanelId[]) {
    if (active.includes(pid)) edges.push(edgeOrigin(world, rng, 'top', pid));
  }
  // Fallback: top of panel 5
  if (edges.length === 0) edges.push(edgeOrigin(world, rng, 'top', 5));
  // Side panels (stage 5+)
  if (active.includes(4)) edges.push(edgeOrigin(world, rng, 'left', 4));
  if (active.includes(6)) edges.push(edgeOrigin(world, rng, 'right', 6));

  return edges;
}

/** Get the Lodge position as convergence target. */
function getConvergeTarget(world: GameWorld): SpawnPosition {
  if (world.panelGrid) {
    const lp = world.panelGrid.getLodgePosition();
    return { x: lp.x, y: lp.y };
  }
  return { x: (world.worldWidth || WORLD_WIDTH) / 2, y: (world.worldHeight || 1080) * 0.8 };
}

// -- Position Generation --------------------------------------------------

/**
 * Generate spawn positions using the requested pattern.
 * Uses PRNG for deterministic, symmetric spawn origins that converge
 * toward the Lodge from matching panel edges.
 */
export function getSpawnPositions(
  world: GameWorld,
  count: number,
  pattern: SpawnPattern = 'scatter',
): SpawnPosition[] {
  const seed = world.mapSeed + world.frameCount;
  const rng = new SeededRandom(seed);
  const edges = getSpawnEdges(world, rng);
  const target = getConvergeTarget(world);

  switch (pattern) {
    case 'v_formation':
      return patternVFormation(edges, target, count, rng);
    case 'pincer':
      return patternPincer(edges, target, count, rng);
    case 'line':
      return patternLine(edges, count, rng);
    case 'wave':
      return patternWave(edges, target, count, rng);
    case 'surround':
      return patternSurround(edges, count, rng);
    case 'l_sweep':
      return patternLSweep(world, target, count, rng);
    case 't_hammer':
      return patternTHammer(world, target, count, rng);
    case 'flank':
      return patternFlank(world, target, count, rng);
    case 'funnel':
      return patternFunnel(edges, target, count, rng);
    default:
      return patternScatter(edges, count, rng);
  }
}
