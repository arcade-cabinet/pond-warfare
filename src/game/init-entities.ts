/**
 * Initial Entity Spawning
 *
 * Sets up the starting map: player lodge, gatherers, scattered resources,
 * contested hotspots, and randomized enemy nest positions.
 */

import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

export function spawnInitialEntities(world: GameWorld): void {
  const sx = WORLD_WIDTH / 2;
  const sy = WORLD_HEIGHT / 2;

  // Player lodge
  const lodgeEid = spawnEntity(world, EntityKind.Lodge, sx, sy, Faction.Player);
  world.selection = [lodgeEid];

  // 3 starting gatherers
  spawnEntity(world, EntityKind.Gatherer, sx - 40, sy + 40, Faction.Player);
  spawnEntity(world, EntityKind.Gatherer, sx + 40, sy + 40, Faction.Player);
  spawnEntity(world, EntityKind.Gatherer, sx, sy + 50, Faction.Player);

  // Nearby resources
  spawnEntity(world, EntityKind.Clambed, sx - 120, sy - 40, Faction.Neutral);
  for (let i = 0; i < 6; i++) {
    spawnEntity(
      world,
      EntityKind.Cattail,
      sx + 100 + Math.random() * 60,
      sy - 60 + Math.random() * 80,
      Faction.Neutral,
    );
  }

  // Scattered resources (sparse — resources are scarce)
  for (let i = 0; i < 80; i++) {
    spawnEntity(
      world,
      EntityKind.Cattail,
      Math.random() * WORLD_WIDTH,
      Math.random() * WORLD_HEIGHT,
      Faction.Neutral,
    );
  }
  for (let i = 0; i < 4; i++) {
    spawnEntity(
      world,
      EntityKind.Clambed,
      Math.random() * WORLD_WIDTH,
      Math.random() * WORLD_HEIGHT,
      Faction.Neutral,
    );
  }

  // Rich center cluster — contested middle area
  for (let i = 0; i < 15; i++) {
    spawnEntity(
      world,
      EntityKind.Cattail,
      sx + (Math.random() - 0.5) * 400,
      sy + (Math.random() - 0.5) * 400,
      Faction.Neutral,
    );
  }
  for (let i = 0; i < 5; i++) {
    spawnEntity(
      world,
      EntityKind.Clambed,
      sx + (Math.random() - 0.5) * 300,
      sy + (Math.random() - 0.5) * 300,
      Faction.Neutral,
    );
  }

  // Randomized enemy nest positions along map edges
  // Pick 2-3 nests from candidate edge positions, ensuring minimum distance from player and each other
  const edgeCandidates = [
    { x: 600, y: 600 },
    { x: WORLD_WIDTH - 600, y: 600 },
    { x: 600, y: WORLD_HEIGHT - 600 },
    { x: WORLD_WIDTH - 600, y: WORLD_HEIGHT - 600 },
    { x: WORLD_WIDTH / 2, y: 500 },
    { x: WORLD_WIDTH / 2, y: WORLD_HEIGHT - 500 },
    { x: 500, y: WORLD_HEIGHT / 2 },
    { x: WORLD_WIDTH - 500, y: WORLD_HEIGHT / 2 },
  ];
  // Shuffle candidates
  for (let i = edgeCandidates.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [edgeCandidates[i], edgeCandidates[j]] = [edgeCandidates[j], edgeCandidates[i]];
  }
  // Pick 2-3 nests with minimum spacing
  const nestCount = 2 + Math.floor(Math.random() * 2); // 2 or 3
  const campLocs: { x: number; y: number }[] = [];
  const minNestDist = 800;
  for (const cand of edgeCandidates) {
    if (campLocs.length >= nestCount) break;
    // Must be far enough from player start
    const dpx = cand.x - sx;
    const dpy = cand.y - sy;
    if (Math.sqrt(dpx * dpx + dpy * dpy) < 600) continue;
    // Must be far enough from other nests
    let tooClose = false;
    for (const existing of campLocs) {
      const dx = cand.x - existing.x;
      const dy = cand.y - existing.y;
      if (Math.sqrt(dx * dx + dy * dy) < minNestDist) {
        tooClose = true;
        break;
      }
    }
    if (!tooClose) campLocs.push(cand);
  }

  // Contested resource hotspots — midpoints between player and each enemy camp
  for (const camp of campLocs) {
    const mx = (sx + camp.x) / 2;
    const my = (sy + camp.y) / 2;
    for (let i = 0; i < 6; i++) {
      spawnEntity(
        world,
        EntityKind.Cattail,
        mx + (Math.random() - 0.5) * 250,
        my + (Math.random() - 0.5) * 250,
        Faction.Neutral,
      );
    }
    spawnEntity(
      world,
      EntityKind.Clambed,
      mx + (Math.random() - 0.5) * 200,
      my + (Math.random() - 0.5) * 200,
      Faction.Neutral,
    );
  }

  // Enemy camps at randomized positions
  for (const loc of campLocs) {
    // Cluster near each camp: 8 cattails + 1 clambed within 200px
    for (let i = 0; i < 8; i++) {
      spawnEntity(
        world,
        EntityKind.Cattail,
        loc.x + (Math.random() - 0.5) * 400,
        loc.y + (Math.random() - 0.5) * 400,
        Faction.Neutral,
      );
    }
    spawnEntity(
      world,
      EntityKind.Clambed,
      loc.x + (Math.random() - 0.5) * 400,
      loc.y + (Math.random() - 0.5) * 400,
      Faction.Neutral,
    );

    spawnEntity(world, EntityKind.PredatorNest, loc.x, loc.y, Faction.Enemy);
    for (let j = 0; j < 2; j++) {
      spawnEntity(
        world,
        EntityKind.Gator,
        loc.x + (Math.random() - 0.5) * 150,
        loc.y + (Math.random() - 0.5) * 150,
        Faction.Enemy,
      );
      spawnEntity(
        world,
        EntityKind.Snake,
        loc.x + (Math.random() - 0.5) * 150,
        loc.y + (Math.random() - 0.5) * 150,
        Faction.Enemy,
      );
    }
  }
}
