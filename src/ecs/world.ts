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
import type { FortificationState } from '@/ecs/systems/fortification';
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
  /**
   * Tech flags -- runtime boolean bag. In v3.0 these are set by
   * commanders at game start, not through in-game research (which
   * was removed). Combat systems still read these flags.
   */
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

  // World dimensions (may differ from constants for vertical maps)
  worldWidth: number;
  worldHeight: number;

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

  // First-game detection (used by tutorial hints)
  isFirstGame: boolean;

  /** @deprecated Advisor system was removed in v3.0. Kept for save compatibility. */
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

  // Active ability state (commander abilities, gated on tech flags)
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
  commanderDeathDemoralizeUntil: number;
  autoRetreatEnabled: boolean;

  // Game-end spectacle state
  gameEndFrame: number;
  gameEndFocusX: number;
  gameEndFocusY: number;
  gameEndSpectacleActive: boolean;
  gameEndPrevSpeed: number;

  // Diver stealth: set of entity IDs currently in stealth
  stealthEntities: Set<number>;
  stealthAmbushReady: Set<number>;

  // Burrowing Worm: entity ID -> remaining burrow frames before emergence
  wormBurrowTimers: Map<number, number>;
  lastWormSpawnFrame: number;

  // Engineer temporary bridges
  engineerBridges: { col: number; row: number; revertFrame: number; original: number }[];

  // --- v2.0.0 ---
  weather: WeatherState;
  berserkerCombatFrames: Map<number, number>;
  shrineUsed: Set<number>;
  wallGateFaction: Map<number, number>;

  // --- v2.1.0 ---
  extendedStats?: Partial<ExtendedStats>;

  // --- Co-op multiplayer ---
  coopMode: boolean;
  partnerLodgeDestroyed: boolean;
  partnerUnitPositions: { x: number; y: number; isBuilding: boolean }[];
  coopResourceCallback: (() => void) | null;

  // Patrol waypoints per entity (bitECS SoA can't store nested arrays)
  patrolWaypoints: Map<number, { x: number; y: number }[]>;

  // --- v3.0 ---

  /** Fortification slots around the Lodge (walls/towers). */
  fortifications: FortificationState | null;
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
