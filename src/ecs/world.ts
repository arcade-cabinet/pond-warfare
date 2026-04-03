/**
 * GameWorld Interface
 *
 * Central type definition for the game world state. All systems,
 * renderers, and UI operate on this shared structure.
 *
 * Factory function and defaults live in world-defaults.ts.
 */

import type { createWorld } from 'bitecs';
import type { YukaManager } from '@/ai/yuka-manager';
import type { AIPersonality } from '@/config/ai-personalities';
import type { PlayableFaction } from '@/config/factions';
import type { WeatherState } from '@/config/weather';
import type { TerrainGrid } from '@/terrain/terrain-grid';
import type {
  Corpse,
  EntityKind,
  Firefly,
  FloatingText,
  GameResources,
  GameState,
  GameStats,
  GroundPing,
  MinimapPing,
  Particle,
} from '@/types';
import type { ObjectPool } from '@/utils/pool';
import type { SeededRandom } from '@/utils/random';
import type { SpatialHash } from '@/utils/spatial-hash';
import type { CommanderModifiers } from './world-defaults';

// Re-export factory and CommanderModifiers so existing imports keep working
export { type CommanderModifiers, createGameWorld } from './world-defaults';

export interface GameWorld {
  // bitECS world
  ecs: ReturnType<typeof createWorld>;

  // Non-ECS state (visual effects, not game logic)
  particles: Particle[];
  floatingTexts: FloatingText[];
  corpses: Corpse[];
  minimapPings: MinimapPing[];
  groundPings: GroundPing[];
  fireflies: Firefly[];

  // Game state
  resources: GameResources;
  enemyResources: { clams: number; twigs: number };
  tech: Record<string, boolean>;
  stats: GameStats;
  state: GameState;

  // Timing
  frameCount: number;
  timeOfDay: number;
  peaceTimer: number;
  gameSpeed: number;
  ambientDarkness: number;

  // Pause
  paused: boolean;

  // Camera
  camX: number;
  camY: number;
  camVelX: number;
  camVelY: number;
  viewWidth: number;
  viewHeight: number;
  isTracking: boolean;
  shakeTimer: number;
  zoomLevel: number;

  // Selection
  selection: number[];
  ctrlGroups: Record<number, number[]>;

  // Input state
  placingBuilding: string | null;
  attackMoveMode: boolean;
  idleWorkerIdx: number;

  // Yuka AI manager for steering behaviors (all factions)
  yukaManager: YukaManager;

  // Auto-behavior toggles grouped by role (synced from UI store signals)
  autoBehaviors: {
    gatherer: boolean;
    combat: boolean;
    healer: boolean;
    scout: boolean;
  };

  // Difficulty setting (affects enemy eco speed, army size, aggression)
  difficulty: 'easy' | 'normal' | 'hard' | 'nightmare' | 'ultraNightmare';

  // Permadeath mode
  permadeath: boolean;
  rewardsModifier: number;

  // Custom game settings modifiers
  gatherSpeedMod: number;
  evolutionSpeedMod: number;
  fogOfWarMode: 'full' | 'explored' | 'revealed';
  heroMode: boolean;
  startingUnitCount: number;
  scenarioOverride:
    | 'standard'
    | 'island'
    | 'contested'
    | 'labyrinth'
    | 'river'
    | 'peninsula'
    | 'archipelago'
    | 'ravine'
    | 'swamp'
    | null;
  nestCountOverride: number;
  resourceDensityMod: number;
  enemyEconomyMod: number;
  enemyStatMult: number;
  nestBuildRateMult: number;
  enemyAggressionLevel: 'passive' | 'normal' | 'aggressive' | 'relentless';

  // Map seed for reproducible random generation
  mapSeed: number;

  // Seeded PRNG for deterministic gameplay (all gameplay-affecting randomness)
  gameRng: SeededRandom;

  // Resource tracking
  resTracker: {
    lastClams: number;
    lastTwigs: number;
    rateClams: number;
    rateTwigs: number;
  };

  // Performance: spatial hash for proximity queries (rebuilt each frame)
  spatialHash: SpatialHash;

  // Performance: object pool for particles
  particlePool: ObjectPool<Particle>;

  // Kill streak tracking (world-level, player faction kills)
  killStreak: { count: number; lastKillFrame: number };

  // Enemy evolution system (tier-based unlocking of advanced enemy units)
  enemyEvolution: {
    tier: number;
    unlockedUnits: EntityKind[];
    lastEvolutionFrame: number;
    lastMegaWaveFrame: number;
    lastRandomEventFrame: number;
    swarmSpeedBuffExpiry: number;
    nestProductionMultiplier: number;
  };

  // Poison tracking: entity ID -> remaining poison ticks
  poisonTimers: Map<number, number>;

  // Alpha Predator aura: entity ID -> expiry frame for +20% damage buff
  alphaDamageBuff: Map<number, number>;

  // Champion enemies: set of entity IDs that are champion variants
  championEnemies: Set<number>;

  // First-game detection (used by advisor system)
  isFirstGame: boolean;

  // Advisor system state (deprecated, kept for save compatibility)
  advisorState: Record<string, unknown>;

  // Commander aura + selection
  commanderDamageBuff: Set<number>;
  commanderSpeedBuff: Set<number>;
  commanderHpBuffApplied: Set<number>;
  commanderUnitHpBuff: Set<number>;
  commanderEnemyDebuff: Set<number>;
  commanderId: string;
  commanderModifiers: CommanderModifiers;

  // Airdrop, checkpoint, evacuation
  airdropsRemaining: number;
  airdropCooldownUntil: number;
  checkpoints: string[];
  lastCheckpointFrame: number;
  evacuationTriggered: boolean;

  // Faction + AI
  playerFaction: PlayableFaction;
  aiPersonality: AIPersonality;

  // Active ability state (tech tree abilities)
  rallyCryExpiry: number;
  rallyCryCooldownUntil: number;
  pondBlessingCooldownUntil: number;
  tidalSurgeUsed: boolean;
  warDrumsBuff: Set<number>;
  venomCoatingTimers: Map<number, number>;

  // Map, terrain, combat zones
  exploredPercent: number;
  terrainGrid: TerrainGrid;
  combatZones: { x: number; y: number; life: number }[];
  waveNumber: number;

  // Commander active ability + morale
  commanderAbilityCooldownUntil: number;
  commanderAbilityActiveUntil: number;
  demoralizedUnits: Set<number>;
  /** Frame until which all player units are demoralized (commander death). 0 = inactive. */
  commanderDeathDemoralizeUntil: number;
  /** Whether auto-retreat is enabled (player can toggle in settings). */
  autoRetreatEnabled: boolean;

  // Game-end spectacle state
  /** Frame at which the game entered 'win' or 'lose' (0 = not ended). */
  gameEndFrame: number;
  /** World position to pan the camera to during the game-end spectacle. */
  gameEndFocusX: number;
  gameEndFocusY: number;
  /** True while slow-mo spectacle is playing before game-over UI appears. */
  gameEndSpectacleActive: boolean;
  /** Pre-spectacle game speed to restore if needed. */
  gameEndPrevSpeed: number;

  // Diver stealth: set of entity IDs currently in stealth
  stealthEntities: Set<number>;
  /** Tracks whether an entity's stealth ambush bonus is available (first attack from stealth). */
  stealthAmbushReady: Set<number>;

  // Burrowing Worm: entity ID -> remaining burrow frames before emergence
  wormBurrowTimers: Map<number, number>;
  /** Frame of last worm spawn (used for spawn rate). */
  lastWormSpawnFrame: number;

  // Engineer temporary bridges: { col, row, revertFrame, originalTerrain }[]
  engineerBridges: { col: number; row: number; revertFrame: number; original: number }[];

  // --- v2.0.0 ---

  /** Dynamic weather system state. */
  weather: WeatherState;

  /** Berserker rage: tracks entities in berserker HP drain combat state. */
  berserkerCombatFrames: Map<number, number>;

  /** Shrine abilities: tracks which shrines have been used (entity ID set). */
  shrineUsed: Set<number>;

  /** Wall gate ownership: maps gate entity ID to faction for pass-through logic. */
  wallGateFaction: Map<number, number>;

  // --- v2.1.0 ---

  /** Extended stats for new achievements (incrementally tracked per match). */
  extendedStats?: Partial<ExtendedStats>;

  // --- Co-op multiplayer ---

  /** True when playing co-op multiplayer. Gates all co-op gameplay rules. */
  coopMode: boolean;

  /** True when co-op partner's Lodge has been destroyed (they can still play). */
  partnerLodgeDestroyed: boolean;

  /** Co-op partner unit positions for shared fog-of-war (updated via network). */
  partnerUnitPositions: { x: number; y: number; isBuilding: boolean }[];

  /** Callback invoked when player resources change in co-op (set by multiplayer controller). */
  coopResourceCallback: (() => void) | null;

  /** Patrol waypoints per entity (bitECS SoA can't store nested arrays). */
  patrolWaypoints: Map<number, { x: number; y: number }[]>;
}

/** Extended game stats tracked per match for v2.1.0 achievements. */
export interface ExtendedStats {
  weatherTypesExperienced: number;
  warshipKills: number;
  bridgesBuilt: number;
  diverAmbushKills: number;
  marketTrades: number;
  maxBerserkerKills: number;
  shrineAbilitiesUsed: number;
  coopMode: boolean;
  dailyChallengesCompleted: number;
  playerLevel: number;
  perfectPuzzleCount: number;
  randomEventsExperienced: number;
  wallsBuilt: number;
  enemiesBlockedByGates: number;
}
