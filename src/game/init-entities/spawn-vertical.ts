/**
 * Vertical Map Entity Spawner (v3.0 — US5/US8)
 *
 * Spawns entities for the vertical map layout:
 * - Lodge at bottom center
 * - 4 starting generalist units (Gatherer, Fighter/Brawler, Healer, Scout)
 * - Resource nodes (fish/rock/tree) in the middle zone
 * - Enemy spawn markers at the top
 *
 * Uses config-loader for unit stats and terrain.json for map dimensions.
 */

import { getFactionConfig } from '@/config/factions';
import { spawnEntity } from '@/ecs/archetypes';
import { Resource } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import type { VerticalMapLayout } from '@/game/vertical-map';
import { EntityKind, Faction } from '@/types';
import type { SeededRandom } from '@/utils/random';

/** Resource node entity mapping (v3 names -> existing EntityKinds). */
const RESOURCE_KIND_MAP: Record<string, EntityKind> = {
  fish_node: EntityKind.Clambed, // Reuse Clambed visual for fish (v3 "fish" resource)
  rock_deposit: EntityKind.PearlBed, // Reuse PearlBed visual for rocks
  tree_cluster: EntityKind.Cattail, // Reuse Cattail visual for logs/wood
};

/**
 * Spawn all entities for a vertical map match.
 * Returns the Lodge entity ID for camera targeting.
 */
export function spawnVerticalEntities(
  world: GameWorld,
  layout: VerticalMapLayout,
  rng: SeededRandom,
): number {
  const factionCfg = getFactionConfig(world.playerFaction);

  // ── Lodge at bottom center ────────────────────────────────────────
  const lodgeEid = spawnEntity(
    world,
    factionCfg.lodgeKind,
    layout.lodgeX,
    layout.lodgeY,
    Faction.Player,
  );

  // ── 4 Starting Generalist Units (US8) ─────────────────────────────
  // Gatherer — collects any resource
  spawnEntity(
    world,
    factionCfg.gathererKind,
    layout.lodgeX - 40,
    layout.lodgeY - 40,
    Faction.Player,
  );

  // Fighter (Brawler) — attacks what you target
  spawnEntity(world, factionCfg.meleeKind, layout.lodgeX + 40, layout.lodgeY - 40, Faction.Player);

  // Medic (Healer) — heals who you send them to
  spawnEntity(
    world,
    factionCfg.supportKind,
    layout.lodgeX - 30,
    layout.lodgeY - 60,
    Faction.Player,
  );

  // Scout — reveals fog where you send them
  spawnEntity(world, EntityKind.Scout, layout.lodgeX + 30, layout.lodgeY - 60, Faction.Player);

  // ── Resource Nodes (middle zone) ──────────────────────────────────
  for (const res of layout.resourcePositions) {
    const kind = RESOURCE_KIND_MAP[res.type];
    if (!kind) continue;

    const eid = spawnEntity(world, kind, res.x, res.y, Faction.Neutral);
    // Assign resource amount based on type
    const amount = res.type === 'fish_node' ? rng.int(2000, 5000) : rng.int(300, 800);
    Resource.amount[eid] = amount;
  }

  // ── Enemy spawn markers ───────────────────────────────────────────
  // Enemies spawn dynamically via the event system (US16), but we
  // place a nest at the primary spawn point for the initial wave.
  if (layout.enemySpawnPositions.length > 0) {
    const primary = layout.enemySpawnPositions[0];
    const aiFactionKey = world.playerFaction === 'otter' ? 'predator' : 'otter';
    const aiFactionCfg = getFactionConfig(
      aiFactionKey as import('@/config/factions').PlayableFaction,
    );

    spawnEntity(world, aiFactionCfg.lodgeKind, primary.x, primary.y, Faction.Enemy);

    // Guard units at enemy base
    for (let i = 0; i < 2; i++) {
      spawnEntity(
        world,
        aiFactionCfg.meleeKind,
        primary.x + rng.float(-60, 60),
        primary.y + rng.float(-30, 30),
        Faction.Enemy,
      );
    }
  }

  // ── Neutral wildlife ──────────────────────────────────────────────
  const frogCount = rng.int(3, 6);
  for (let i = 0; i < frogCount; i++) {
    spawnEntity(
      world,
      EntityKind.Frog,
      rng.float(60, layout.worldWidth - 60),
      rng.float(60, layout.worldHeight - 60),
      Faction.Neutral,
    );
  }

  // Select Lodge for camera tracking
  world.selection = [lodgeEid];

  return lodgeEid;
}
