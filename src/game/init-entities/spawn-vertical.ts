/**
 * Panel-Aware Entity Spawner (v3.0 — 6-Panel Map System)
 *
 * Spawns entities based on the panel-aware vertical map layout:
 * - Lodge at PanelGrid.getLodgePosition() (center-bottom of panel 5)
 * - 4 starting generalist units near Lodge
 * - Resource nodes per panel biome
 * - Enemy nests at top edges of enemy-spawn panels
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
  fish_node: EntityKind.Clambed,
  rock_deposit: EntityKind.PearlBed,
  tree_cluster: EntityKind.Cattail,
};

/**
 * Spawn all entities for a panel-aware vertical map match.
 * Returns the Lodge entity ID for camera targeting.
 */
export function spawnVerticalEntities(
  world: GameWorld,
  layout: VerticalMapLayout,
  rng: SeededRandom,
): number {
  const factionCfg = getFactionConfig(world.playerFaction);

  // Lodge at center-bottom of panel 5
  const lodgeEid = spawnEntity(
    world,
    factionCfg.lodgeKind,
    layout.lodgeX,
    layout.lodgeY,
    Faction.Player,
  );

  // 4 starting generalist units near Lodge
  spawnStartingUnits(world, factionCfg, layout, rng);

  // Resource nodes per panel biome
  spawnResourceNodes(world, layout, rng);

  // Enemy nests at top edges of enemy-spawn panels
  spawnEnemyNests(world, layout, rng);

  // Neutral wildlife
  spawnWildlife(world, layout, rng);

  world.selection = [lodgeEid];
  return lodgeEid;
}

/** Spawn the 4 starting generalist units near the Lodge. */
function spawnStartingUnits(
  world: GameWorld,
  factionCfg: ReturnType<typeof getFactionConfig>,
  layout: VerticalMapLayout,
  rng: SeededRandom,
): void {
  const offsets = [
    { dx: -40, dy: -40 },
    { dx: 40, dy: -40 },
    { dx: -30, dy: -60 },
    { dx: 30, dy: -60 },
  ];
  const kinds = [
    factionCfg.gathererKind,
    factionCfg.meleeKind,
    factionCfg.supportKind,
    EntityKind.Scout,
  ];

  for (let i = 0; i < kinds.length; i++) {
    spawnEntity(
      world,
      kinds[i],
      layout.lodgeX + offsets[i].dx,
      layout.lodgeY + offsets[i].dy,
      Faction.Player,
    );
  }
}

/** Spawn resource nodes at positions determined by the layout. */
function spawnResourceNodes(world: GameWorld, layout: VerticalMapLayout, rng: SeededRandom): void {
  for (const res of layout.resourcePositions) {
    const kind = RESOURCE_KIND_MAP[res.type];
    if (!kind) continue;

    const eid = spawnEntity(world, kind, res.x, res.y, Faction.Neutral);
    const amount = res.type === 'fish_node' ? rng.int(2000, 5000) : rng.int(300, 800);
    Resource.amount[eid] = amount;
  }
}

/** Spawn enemy nests at top edges of enemy-spawn panels. */
function spawnEnemyNests(world: GameWorld, layout: VerticalMapLayout, rng: SeededRandom): void {
  if (layout.enemySpawnPositions.length === 0) return;

  const aiFactionKey = world.playerFaction === 'otter' ? 'predator' : 'otter';
  const aiFactionCfg = getFactionConfig(
    aiFactionKey as import('@/config/factions').PlayableFaction,
  );

  // Place a nest at each enemy spawn position
  const nestPositions = new Set<string>();
  for (const spawn of layout.enemySpawnPositions) {
    const key = `${spawn.panelId}`;
    if (nestPositions.has(key)) continue;
    nestPositions.add(key);

    spawnEntity(world, aiFactionCfg.lodgeKind, spawn.x, spawn.y, Faction.Enemy);

    // Guard units near each nest
    for (let i = 0; i < 2; i++) {
      spawnEntity(
        world,
        aiFactionCfg.meleeKind,
        spawn.x + rng.float(-60, 60),
        spawn.y + rng.float(-30, 30),
        Faction.Enemy,
      );
    }
  }
}

/** Spawn neutral wildlife frogs across unlocked panels. */
function spawnWildlife(world: GameWorld, layout: VerticalMapLayout, rng: SeededRandom): void {
  const bounds = layout.panelGrid.getUnlockedBounds();
  const frogCount = rng.int(3, 6);
  for (let i = 0; i < frogCount; i++) {
    spawnEntity(
      world,
      EntityKind.Frog,
      rng.float(bounds.minX + 60, bounds.maxX - 60),
      rng.float(bounds.minY + 60, bounds.maxY - 60),
      Faction.Neutral,
    );
  }
}
