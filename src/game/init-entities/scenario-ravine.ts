/**
 * Ravine Scenario — Central ravine with high ground on both sides.
 *
 * A deep ravine of Mud/Shallows runs vertically through the map center.
 * HighGround flanks both sides, giving ranged units +25% range advantage.
 * 2-3 narrow bridge crossings (Grass strips) over the ravine are the main
 * chokepoints. Resources placed in the risky ravine floor reward aggression.
 */

import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import { EntityKind, Faction } from '@/types';

import {
  clampWorld,
  type SpawnContext,
  spawnCattail,
  spawnClambed,
  spawnEnemyCamp,
} from './helpers';

export function spawnRavine(ctx: SpawnContext, targetNestCount: number): void {
  const { world, rng, sx, sy, resourceMultiplier } = ctx;

  // Ravine runs vertically through the center
  const ravineX = WORLD_WIDTH / 2;
  const ravineHalfWidth = 150;

  // Bridge crossing positions (2-3 bridges)
  const bridgeCount = rng.int(2, 4);
  const sectionHeight = WORLD_HEIGHT / (bridgeCount + 1);
  const bridgeYs: number[] = [];
  for (let i = 0; i < bridgeCount; i++) {
    bridgeYs.push(sectionHeight * (i + 1) + rng.float(-60, 60));
  }

  // Resources in the ravine (risky to gather but rewarding)
  const ravineResourceCount = Math.floor(12 * resourceMultiplier);
  for (let i = 0; i < ravineResourceCount; i++) {
    const rx = ravineX + rng.float(-ravineHalfWidth + 40, ravineHalfWidth - 40);
    const ry = rng.float(100, WORLD_HEIGHT - 100);
    spawnCattail(world, rng, rx, ry, true); // Rich resources in ravine
  }

  // Clambeds in the ravine
  const ravineClambedCount = Math.floor(3 * resourceMultiplier);
  for (let i = 0; i < ravineClambedCount; i++) {
    spawnClambed(
      world,
      rng,
      ravineX + rng.float(-ravineHalfWidth + 60, ravineHalfWidth - 60),
      rng.float(200, WORLD_HEIGHT - 200),
      true,
    );
  }

  // Safe-side resources for both factions
  // West side (player side)
  const westCattails = Math.floor(10 * resourceMultiplier);
  for (let i = 0; i < westCattails; i++) {
    spawnCattail(
      world,
      rng,
      rng.float(60, ravineX - ravineHalfWidth - 60),
      rng.float(60, WORLD_HEIGHT - 60),
    );
  }
  spawnClambed(world, rng, sx + rng.float(-100, 100), sy + rng.float(-100, 100));

  // East side (enemy side)
  const eastCattails = Math.floor(10 * resourceMultiplier);
  for (let i = 0; i < eastCattails; i++) {
    spawnCattail(
      world,
      rng,
      rng.float(ravineX + ravineHalfWidth + 60, WORLD_WIDTH - 60),
      rng.float(60, WORLD_HEIGHT - 60),
    );
  }

  // Pearl beds near bridge crossings (contested)
  for (const by of bridgeYs.slice(0, 2)) {
    spawnEntity(
      world,
      EntityKind.PearlBed,
      clampWorld(ravineX + rng.float(-60, 60), WORLD_WIDTH),
      clampWorld(by + rng.float(-40, 40), WORLD_HEIGHT),
      Faction.Neutral,
    );
  }

  // Enemy camps on the east side
  const enemyX = WORLD_WIDTH * 0.75;
  const campSpread = WORLD_HEIGHT * 0.3;
  for (let i = 0; i < targetNestCount; i++) {
    const campY = WORLD_HEIGHT / 2 + ((i - targetNestCount / 2) * campSpread) / targetNestCount;
    spawnEnemyCamp(ctx, {
      x: clampWorld(enemyX + rng.float(-100, 100), WORLD_WIDTH, 200),
      y: clampWorld(campY + rng.float(-80, 80), WORLD_HEIGHT, 200),
    });
  }
}
