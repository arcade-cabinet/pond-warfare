/**
 * Spawn Patterns
 *
 * Bullet-hell-inspired enemy spawn position patterns. Each pattern
 * produces deterministic, symmetric spawn origins that converge
 * toward the Lodge from matching panel edges.
 *
 * 10 patterns: scatter, v_formation, pincer, line, wave, surround,
 * l_sweep, t_hammer, flank, funnel.
 */

import type { GameWorld } from '@/ecs/world';
import type { PanelId } from '@/game/panel-grid';
import type { SeededRandom } from '@/utils/random';
import { getSpawnEdges, type SpawnPosition } from './spawn-positions';

// -- Basic Patterns -------------------------------------------------------

/** Scatter: random positions near edges (original behavior). */
export function patternScatter(
  edges: SpawnPosition[],
  count: number,
  rng: SeededRandom,
): SpawnPosition[] {
  return Array.from({ length: count }, (_, i) => {
    const e = edges[i % edges.length];
    return { x: e.x + rng.float(-40, 40), y: e.y + rng.float(-20, 20) };
  });
}

/** V-formation: arrowhead pointing at Lodge, leader at tip. */
export function patternVFormation(
  edges: SpawnPosition[],
  target: SpawnPosition,
  count: number,
  rng: SeededRandom,
): SpawnPosition[] {
  const origin = edges[rng.int(0, edges.length)];
  const spacing = 30;
  const result: SpawnPosition[] = [];

  for (let i = 0; i < count; i++) {
    // i=0 is the tip (row 0, center). i=1,2 are row 1 left/right, etc.
    const row = i === 0 ? 0 : Math.floor((i - 1) / 2) + 1;
    const side = i === 0 ? 0 : (i - 1) % 2 === 0 ? -1 : 1;
    const dx = target.x - origin.x;
    const dy = target.y - origin.y;
    const len = Math.sqrt(dx * dx + dy * dy) || 1;
    const perpX = -dy / len;
    const perpY = dx / len;

    result.push({
      x: origin.x + perpX * side * row * spacing + rng.float(-5, 5),
      y: origin.y + perpY * side * row * spacing - row * spacing * 0.3 + rng.float(-5, 5),
    });
  }
  return result;
}

/** Pincer: two symmetric groups from matched edges converging on Lodge. */
export function patternPincer(
  edges: SpawnPosition[],
  target: SpawnPosition,
  count: number,
  rng: SeededRandom,
): SpawnPosition[] {
  const half = Math.ceil(count / 2);
  const result: SpawnPosition[] = [];

  const e1 = edges[0];
  const e2 = edges.length >= 2 ? edges[edges.length - 1] : { x: target.x * 2 - e1.x, y: e1.y };

  for (let i = 0; i < half; i++) {
    const t = i / Math.max(half - 1, 1);
    result.push({
      x: e1.x + (target.x - e1.x) * t * 0.1 + rng.float(-20, 20),
      y: e1.y + i * 25 + rng.float(-10, 10),
    });
  }
  for (let i = 0; i < count - half; i++) {
    const t = i / Math.max(count - half - 1, 1);
    result.push({
      x: e2.x + (target.x - e2.x) * t * 0.1 + rng.float(-20, 20),
      y: e2.y + i * 25 + rng.float(-10, 10),
    });
  }
  return result;
}

/** Line: single-file march from one edge. */
export function patternLine(
  edges: SpawnPosition[],
  count: number,
  rng: SeededRandom,
): SpawnPosition[] {
  const origin = edges[rng.int(0, edges.length)];
  return Array.from({ length: count }, (_, i) => ({
    x: origin.x + rng.float(-15, 15),
    y: origin.y + i * 20 + rng.float(-5, 5),
  }));
}

/** Wave: sine-wave staggered entry across an edge. */
export function patternWave(
  edges: SpawnPosition[],
  _target: SpawnPosition,
  count: number,
  rng: SeededRandom,
): SpawnPosition[] {
  const origin = edges[rng.int(0, edges.length)];
  const amplitude = 60 + rng.float(0, 40);
  const freq = 0.3 + rng.float(0, 0.2);
  return Array.from({ length: count }, (_, i) => ({
    x: origin.x + Math.sin(i * freq) * amplitude + rng.float(-10, 10),
    y: origin.y + i * 18 + rng.float(-5, 5),
  }));
}

/** Surround: spawn evenly across ALL available edges simultaneously. */
export function patternSurround(
  edges: SpawnPosition[],
  count: number,
  rng: SeededRandom,
): SpawnPosition[] {
  return Array.from({ length: count }, (_, i) => {
    const e = edges[i % edges.length];
    const offset = Math.floor(i / edges.length) * 25;
    return { x: e.x + rng.float(-30, 30), y: e.y + offset + rng.float(-10, 10) };
  });
}

// -- Topology-Aware Patterns ----------------------------------------------

/** L-sweep: enemies enter from a corner panel and sweep along the L. */
export function patternLSweep(
  world: GameWorld,
  target: SpawnPosition,
  count: number,
  rng: SeededRandom,
): SpawnPosition[] {
  const grid = world.panelGrid;
  if (!grid) return patternLine(getSpawnEdges(world, rng), count, rng);

  const active = grid.getActivePanels();
  const cornerPanel: PanelId = active.includes(1) ? 1 : active.includes(3) ? 3 : 2;
  const cornerBounds = grid.getPanelBounds(cornerPanel);
  const p2Bounds = grid.getPanelBounds(2);

  const startX = cornerBounds.x + cornerBounds.width * 0.5;
  const startY = cornerBounds.y + 20;
  const midX = p2Bounds.x + p2Bounds.width * 0.5;
  const midY = p2Bounds.y + p2Bounds.height * 0.5;

  // Cap t to 0.7 so enemies spawn along the path but NOT at the Lodge
  const MAX_T = 0.7;

  return Array.from({ length: count }, (_, i) => {
    const t = (i / Math.max(count - 1, 1)) * MAX_T;
    const x =
      (1 - t) * (1 - t) * startX + 2 * (1 - t) * t * midX + t * t * target.x + rng.float(-15, 15);
    const y =
      (1 - t) * (1 - t) * startY + 2 * (1 - t) * t * midY + t * t * target.y + rng.float(-10, 10);
    return { x, y };
  });
}

/** T-hammer: main hammer from center, flankers from sides. */
export function patternTHammer(
  world: GameWorld,
  target: SpawnPosition,
  count: number,
  rng: SeededRandom,
): SpawnPosition[] {
  const grid = world.panelGrid;
  if (!grid) return patternPincer(getSpawnEdges(world, rng), target, count, rng);

  const p1 = grid.getPanelBounds(1);
  const p2 = grid.getPanelBounds(2);
  const p3 = grid.getPanelBounds(3);

  const hammerCount = Math.ceil(count * 0.6);
  const flankCount = Math.floor((count - hammerCount) / 2);
  const result: SpawnPosition[] = [];

  const hammerX = p2.x + p2.width * 0.5;
  const hammerY = p2.y + 20;
  for (let i = 0; i < hammerCount; i++) {
    const row = Math.floor(i / 2);
    const side = i % 2 === 0 ? -1 : 1;
    result.push({
      x: hammerX + side * row * 20 + rng.float(-5, 5),
      y: hammerY + row * 15 + rng.float(-5, 5),
    });
  }

  for (let i = 0; i < flankCount; i++) {
    result.push({
      x: p1.x + p1.width * 0.7 + rng.float(-20, 20),
      y: p1.y + 30 + i * 25 + rng.float(-5, 5),
    });
  }

  for (let i = 0; i < count - hammerCount - flankCount; i++) {
    result.push({
      x: p3.x + p3.width * 0.3 + rng.float(-20, 20),
      y: p3.y + 30 + i * 25 + rng.float(-5, 5),
    });
  }

  return result;
}

/** Flank: main force from top, flankers from a side panel. */
export function patternFlank(
  world: GameWorld,
  target: SpawnPosition,
  count: number,
  rng: SeededRandom,
): SpawnPosition[] {
  const grid = world.panelGrid;
  if (!grid) return patternPincer(getSpawnEdges(world, rng), target, count, rng);

  const active = grid.getActivePanels();
  const hasLeft = active.includes(4);
  const hasRight = active.includes(6);
  const sidePanel: PanelId = hasLeft ? 4 : hasRight ? 6 : 2;
  const sideBounds = grid.getPanelBounds(sidePanel);
  const p2 = grid.getPanelBounds(2);

  const mainCount = Math.ceil(count * 0.6);
  const flankSize = count - mainCount;
  const result: SpawnPosition[] = [];

  for (let i = 0; i < mainCount; i++) {
    result.push({
      x: p2.x + p2.width * (0.3 + (i / mainCount) * 0.4) + rng.float(-10, 10),
      y: p2.y + 20 + rng.float(-10, 10),
    });
  }

  const sideEdge = sidePanel === 4 ? 'left' : 'right';
  for (let i = 0; i < flankSize; i++) {
    result.push({
      x:
        sideEdge === 'left'
          ? sideBounds.x + 20 + rng.float(0, 20)
          : sideBounds.x + sideBounds.width - 20 - rng.float(0, 20),
      y: sideBounds.y + sideBounds.height * (0.3 + (i / flankSize) * 0.4) + rng.float(-10, 10),
    });
  }

  return result;
}

/** Funnel: all edges converge through a chokepoint toward Lodge. */
export function patternFunnel(
  edges: SpawnPosition[],
  target: SpawnPosition,
  count: number,
  rng: SeededRandom,
): SpawnPosition[] {
  const avgX = edges.reduce((s, e) => s + e.x, 0) / edges.length;
  const avgY = edges.reduce((s, e) => s + e.y, 0) / edges.length;
  const chokeX = (avgX + target.x) / 2;
  const chokeY = (avgY + target.y) / 2;

  return Array.from({ length: count }, (_, i) => {
    const edge = edges[i % edges.length];
    const t = (i / count) * 0.3;
    const x =
      (1 - t) * (1 - t) * edge.x + 2 * (1 - t) * t * chokeX + t * t * target.x + rng.float(-10, 10);
    const y =
      (1 - t) * (1 - t) * edge.y + 2 * (1 - t) * t * chokeY + t * t * target.y + rng.float(-5, 5);
    return { x, y };
  });
}
