/**
 * Panel-Aware Entity Spawner (v3.0 -- 6-Panel Map System)
 *
 * Spawns entities based on the panel-aware vertical map layout:
 * - Lodge at PanelGrid.getLodgePosition() (center-bottom of panel 5)
 * - 4 starting generalist units near Lodge
 * - Resource nodes per panel biome
 * - Enemy nests at top edges of enemy-spawn panels
 *
 * When no enemy-spawn panels are active (stage 1), enables wave-survival
 * mode so the match-event-runner handles enemy waves from the map edge
 * and the win condition becomes survival-based instead of nest destruction.
 */

import { COMMANDER_ABILITIES, getCommanderDef, getCommanderTypeIndex } from '@/config/commanders';
import { applyStartingResources } from './starting-resources';
import { getFactionConfig } from '@/config/factions';
import { spawnEntity } from '@/ecs/archetypes';
import { Combat, Commander, Health, Resource, Velocity } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import type { VerticalMapLayout } from '@/game/vertical-map';
import { EntityKind, Faction } from '@/types';
import { progressionLevel } from '@/ui/store-v3';
import type { SeededRandom } from '@/utils/random';
import enemiesConfig from '../../../configs/enemies.json';

/** Enemy commander tier config loaded from enemies.json. */
interface EnemyCommanderTier {
  hp: number;
  damage: number;
  speed: number;
  aura_radius: number;
  aura_damage_bonus: number;
  ability_interval: number;
}

/** Select enemy commander tier based on progression stage. */
function getEnemyCommanderTier(stage: number): EnemyCommanderTier | null {
  if (stage < 2) return null;
  const commanders = enemiesConfig.commanders as Record<string, EnemyCommanderTier>;
  if (stage <= 3) return commanders.basic;
  if (stage <= 5) return commanders.mid;
  return commanders.boss;
}

/** Resource node entity mapping (v3 names -> existing EntityKinds). */
const RESOURCE_KIND_MAP: Record<string, EntityKind> = {
  fish_node: EntityKind.Clambed,
  rock_deposit: EntityKind.PearlBed,
  tree_cluster: EntityKind.Cattail,
};

/** Default wave-survival target per progression level. */
const WAVE_SURVIVAL_TARGET = 5;

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

  // Player Commander next to Lodge (the only starting unit — players train the rest)
  spawnPlayerCommander(world, layout);

  // Starting resources computed from panels.json formula × unit costs from units.json
  // Formula defines how many of each unit type the player should be able to afford
  applyStartingResources(world, layout);

  // Resource nodes per panel biome
  spawnResourceNodes(world, layout, rng);

  // Enemy nests at top edges of enemy-spawn panels (if any)
  const nestsSpawned = spawnEnemyNests(world, layout, rng);

  // Enemy Commander boss near first enemy nest (stage 2+)
  if (nestsSpawned > 0) {
    spawnEnemyCommander(world, layout, rng);
  }

  // If no enemy nests were spawned (stage 1), enable wave-survival mode.
  // Enemies will arrive via match-event-runner waves from the map edge.
  if (nestsSpawned === 0) {
    world.waveSurvivalMode = true;
    world.waveSurvivalTarget = WAVE_SURVIVAL_TARGET;
  }

  // Neutral wildlife
  spawnWildlife(world, layout, rng);

  world.selection = [lodgeEid];
  return lodgeEid;
}

/** Spawn the player Commander entity adjacent to the Lodge. */
function spawnPlayerCommander(world: GameWorld, layout: VerticalMapLayout): void {
  const eid = spawnEntity(
    world,
    EntityKind.Commander,
    layout.lodgeX + 50,
    layout.lodgeY - 30,
    Faction.Player,
  );

  // Populate Commander ECS component from config
  const cmdDef = getCommanderDef(world.commanderId);
  const typeIdx = getCommanderTypeIndex(world.commanderId);
  const ability = COMMANDER_ABILITIES[world.commanderId];

  Commander.commanderType[eid] = typeIdx;
  Commander.auraRadius[eid] = 150;
  Commander.auraDamageBonus[eid] = Math.round(cmdDef.auraDamageBonus * 100); // store as int %
  Commander.abilityTimer[eid] = 0;
  Commander.abilityCooldown[eid] = ability?.cooldownFrames ?? 5400;
  Commander.isPlayerCommander[eid] = 1;

  // Track on world for game-over checks
  world.commanderEntityId = eid;
}

/** Spawn an enemy Commander boss near the first enemy spawn position. */
function spawnEnemyCommander(world: GameWorld, layout: VerticalMapLayout, rng: SeededRandom): void {
  const stage = progressionLevel.value;
  const tier = getEnemyCommanderTier(stage);
  if (!tier) return; // Stage 1: no enemy commander

  // Spawn near the first enemy spawn position
  const spawnPos = layout.enemySpawnPositions[0];
  if (!spawnPos) return;

  const eid = spawnEntity(
    world,
    EntityKind.Commander,
    spawnPos.x + rng.float(-40, 40),
    spawnPos.y + rng.float(20, 60),
    Faction.Enemy,
  );

  // Override stats from tier config
  Health.max[eid] = tier.hp;
  Health.current[eid] = tier.hp;
  Combat.damage[eid] = tier.damage;
  Velocity.speed[eid] = tier.speed;

  // Set Commander ECS component
  Commander.commanderType[eid] = 0; // enemy commanders don't use player type index
  Commander.auraRadius[eid] = tier.aura_radius;
  Commander.auraDamageBonus[eid] = Math.round(tier.aura_damage_bonus * 100);
  Commander.abilityTimer[eid] = 0;
  Commander.abilityCooldown[eid] = tier.ability_interval;
  Commander.isPlayerCommander[eid] = 0;

  world.enemyCommanderEntityId = eid;

  // Spawn 2-4 guard fighters near the commander
  const aiFactionKey = world.playerFaction === 'otter' ? 'predator' : 'otter';
  const aiFactionCfg = getFactionConfig(
    aiFactionKey as import('@/config/factions').PlayableFaction,
  );
  const guardCount = stage <= 3 ? 2 : stage <= 5 ? 3 : 4;
  for (let i = 0; i < guardCount; i++) {
    spawnEntity(
      world,
      aiFactionCfg.meleeKind,
      spawnPos.x + rng.float(-60, 60),
      spawnPos.y + rng.float(30, 80),
      Faction.Enemy,
    );
  }
}

/** Spawn the 4 starting generalist units near the Lodge. */
function spawnStartingUnits(
  world: GameWorld,
  factionCfg: ReturnType<typeof getFactionConfig>,
  layout: VerticalMapLayout,
  _rng: SeededRandom,
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

/** Possible entity kinds for rare nodes (random each spawn). */
const RARE_NODE_KINDS: EntityKind[] = [EntityKind.Clambed, EntityKind.PearlBed, EntityKind.Cattail];

/** Spawn resource nodes at positions determined by the layout. */
function spawnResourceNodes(world: GameWorld, layout: VerticalMapLayout, rng: SeededRandom): void {
  for (const res of layout.resourcePositions) {
    let kind: EntityKind | undefined;
    let amount: number;

    if (res.type === 'rare_node') {
      kind = RARE_NODE_KINDS[rng.int(0, RARE_NODE_KINDS.length - 1)];
      amount = rng.int(3000, 6000); // Rare nodes are richer
    } else {
      kind = RESOURCE_KIND_MAP[res.type];
      if (!kind) continue;
      amount = res.type === 'fish_node' ? rng.int(2000, 5000) : rng.int(300, 800);
    }

    const eid = spawnEntity(world, kind, res.x, res.y, Faction.Neutral);
    Resource.amount[eid] = amount;
  }
}

/**
 * Spawn enemy nests at top edges of enemy-spawn panels.
 * Returns the number of nests spawned.
 */
function spawnEnemyNests(world: GameWorld, layout: VerticalMapLayout, rng: SeededRandom): number {
  if (layout.enemySpawnPositions.length === 0) return 0;

  const aiFactionKey = world.playerFaction === 'otter' ? 'predator' : 'otter';
  const aiFactionCfg = getFactionConfig(
    aiFactionKey as import('@/config/factions').PlayableFaction,
  );

  // Place a nest at each enemy spawn position
  const nestPositions = new Set<string>();
  let count = 0;
  for (const spawn of layout.enemySpawnPositions) {
    const key = `${spawn.panelId}`;
    if (nestPositions.has(key)) continue;
    nestPositions.add(key);

    spawnEntity(world, aiFactionCfg.lodgeKind, spawn.x, spawn.y, Faction.Enemy);
    count++;

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
  return count;
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
