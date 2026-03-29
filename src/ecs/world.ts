import { createWorld } from 'bitecs';
import { YukaManager } from '@/ai/yuka-manager';
import type { AIPersonality } from '@/config/ai-personalities';
import type { PlayableFaction } from '@/config/factions';
import { createInitialTechState, type TechState } from '@/config/tech-tree';
import {
  ENEMY_STARTING_CLAMS,
  ENEMY_STARTING_TWIGS,
  STARTING_CLAMS,
  STARTING_TWIGS,
} from '@/constants';
import {
  type Corpse,
  EntityKind,
  type Firefly,
  type FloatingText,
  type GameResources,
  type GameState,
  type GameStats,
  type GroundPing,
  type MinimapPing,
  type Particle,
} from '@/types';
import { ObjectPool } from '@/utils/pool';
import { SpatialHash } from '@/utils/spatial-hash';

/** Modifier values derived from the selected Commander at game start. */
export interface CommanderModifiers {
  auraDamageBonus: number;
  auraSpeedBonus: number;
  auraHpBonus: number;
  passiveGatherBonus: number;
  passiveResearchSpeed: number;
  passiveTowerAttackSpeed: number;
}

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
  enemyResources: {
    clams: number;
    twigs: number;
  };
  tech: TechState;
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

  // Auto-behavior toggles (synced from UI store signals)
  autoBehaviors: {
    gather: boolean;
    build: boolean;
    defend: boolean;
    attack: boolean;
    heal: boolean;
    scout: boolean;
  };

  // Difficulty setting (affects enemy eco speed, army size, aggression)
  difficulty: 'easy' | 'normal' | 'hard' | 'nightmare' | 'ultraNightmare';

  // Permadeath mode
  permadeath: boolean;
  rewardsModifier: number; // 1.0 normal, 1.5 with permadeath

  // Custom game settings modifiers
  /** Gather speed modifier: multiplied against GATHER_TIMER. <1 = faster, >1 = slower. */
  gatherSpeedMod: number;
  /** Evolution speed modifier for THRESHOLDS. <1 = faster, >1 = slower. */
  evolutionSpeedMod: number;
  /** Fog of war mode: 'full' = normal, 'explored' = show explored, 'revealed' = all visible. */
  fogOfWarMode: 'full' | 'explored' | 'revealed';
  /** Hero mode: Commander has boosted stats and abilities. */
  heroMode: boolean;
  /** Custom starting unit count (replaces default 4). */
  startingUnitCount: number;
  /** Custom scenario override (null = use seeded random). */
  scenarioOverride: 'standard' | 'island' | 'contested' | 'labyrinth' | 'river' | 'peninsula' | null;
  /** Custom nest count override (-1 = use difficulty default). */
  nestCountOverride: number;
  /** Resource density override for map generation. */
  resourceDensityMod: number;
  /** Enemy economy multiplier (affects enemy starting resources). */
  enemyEconomyMod: number;
  /** Enemy aggression level (affects AI behavior). */
  enemyAggressionLevel: 'passive' | 'normal' | 'aggressive' | 'relentless';

  // Map seed for reproducible random generation
  mapSeed: number;

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
  killStreak: {
    count: number;
    lastKillFrame: number;
  };

  // Enemy evolution system (tier-based unlocking of advanced enemy units)
  enemyEvolution: {
    tier: number; // 0-5, increases over time
    unlockedUnits: EntityKind[]; // which enemy types are available
    lastEvolutionFrame: number;
    /** Frame of the last mega-wave event. */
    lastMegaWaveFrame: number;
    /** Frame of the last random threat event. */
    lastRandomEventFrame: number;
    /** Temporary speed buff expiry frame for swarm mega-wave. */
    swarmSpeedBuffExpiry: number;
    /** Nest production multiplier (ramps over time). */
    nestProductionMultiplier: number;
  };

  // Poison tracking: entity ID -> remaining poison ticks
  poisonTimers: Map<number, number>;

  // Alpha Predator aura: entity ID -> expiry frame for +20% damage buff
  alphaDamageBuff: Map<number, number>;

  // Champion enemies: set of entity IDs that are champion variants
  championEnemies: Set<number>;

  // Tutorial state
  tutorialStep: number;
  tutorialShownSteps: Set<number>;
  isFirstGame: boolean;

  // Commander aura: entity IDs within commander aura range
  commanderDamageBuff: Set<number>;
  commanderSpeedBuff: Set<number>;
  /** Building IDs that have already received the commander aura HP bonus. */
  commanderHpBuffApplied: Set<number>;

  // Commander selection
  commanderId: string;
  commanderModifiers: CommanderModifiers;

  // Airdrop safety net
  airdropsRemaining: number;
  airdropCooldownUntil: number; // frame at which airdrop can be used again

  // Checkpoint system (serialized save state strings)
  checkpoints: string[];
  lastCheckpointFrame: number;

  // Evacuation state
  evacuationTriggered: boolean;

  // Faction selection: which faction the player controls
  playerFaction: PlayableFaction;

  // AI personality: modifies enemy AI behavior
  aiPersonality: AIPersonality;

  // Active ability state (tech tree abilities)
  /** Rally Cry: frame at which the buff expires (0 = inactive). */
  rallyCryExpiry: number;
  /** Rally Cry: frame at which the ability can be used again (0 = ready). */
  rallyCryCooldownUntil: number;
  /** Pond Blessing: true if already used this game. */
  pondBlessingUsed: boolean;
  /** Tidal Surge: true if already used this game. */
  tidalSurgeUsed: boolean;
  /** War Drums: set of entity IDs within armory aura range (rebuilt periodically). */
  warDrumsBuff: Set<number>;
  /** Venom Coating: poison timers applied by tech (entity ID -> remaining ticks). */
  venomCoatingTimers: Map<number, number>;
}

export function createGameWorld(): GameWorld {
  return {
    ecs: createWorld(),
    particles: [],
    floatingTexts: [],
    corpses: [],
    minimapPings: [],
    groundPings: [],
    fireflies: [],
    resources: {
      clams: STARTING_CLAMS,
      twigs: STARTING_TWIGS,
      pearls: 0,
      food: 0,
      maxFood: 0,
    },
    enemyResources: {
      clams: ENEMY_STARTING_CLAMS,
      twigs: ENEMY_STARTING_TWIGS,
    },
    tech: createInitialTechState(),
    stats: {
      unitsKilled: 0,
      unitsLost: 0,
      resourcesGathered: 0,
      buildingsBuilt: 0,
      peakArmy: 0,
    },
    state: 'playing',
    frameCount: 0,
    timeOfDay: 8 * 60,
    peaceTimer: 10800,
    gameSpeed: 1,
    ambientDarkness: 0,
    paused: false,
    camX: 0,
    camY: 0,
    camVelX: 0,
    camVelY: 0,
    viewWidth: 0,
    viewHeight: 0,
    isTracking: false,
    shakeTimer: 0,
    zoomLevel: 1,
    selection: [],
    ctrlGroups: {},
    yukaManager: new YukaManager(),
    autoBehaviors: {
      gather: false,
      build: false,
      defend: false,
      attack: false,
      heal: false,
      scout: false,
    },
    difficulty: 'normal',
    permadeath: false,
    rewardsModifier: 1.0,
    gatherSpeedMod: 1.0,
    evolutionSpeedMod: 1.0,
    fogOfWarMode: 'full',
    heroMode: false,
    startingUnitCount: 4,
    scenarioOverride: null,
    nestCountOverride: -1,
    resourceDensityMod: 1.0,
    enemyEconomyMod: 1.0,
    enemyAggressionLevel: 'normal',
    mapSeed: Math.floor(Math.random() * 2147483647),
    placingBuilding: null,
    attackMoveMode: false,
    idleWorkerIdx: 0,
    resTracker: {
      lastClams: STARTING_CLAMS,
      lastTwigs: STARTING_TWIGS,
      rateClams: 0,
      rateTwigs: 0,
    },
    spatialHash: new SpatialHash(200),
    particlePool: new ObjectPool<Particle>(
      () => ({ x: 0, y: 0, vx: 0, vy: 0, life: 0, color: '', size: 0 }),
      100,
    ),
    killStreak: {
      count: 0,
      lastKillFrame: 0,
    },
    enemyEvolution: {
      tier: 0,
      unlockedUnits: [EntityKind.Gator, EntityKind.Snake],
      lastEvolutionFrame: 0,
      lastMegaWaveFrame: 0,
      lastRandomEventFrame: 0,
      swarmSpeedBuffExpiry: 0,
      nestProductionMultiplier: 1,
    },
    poisonTimers: new Map(),
    alphaDamageBuff: new Map(),
    championEnemies: new Set(),
    tutorialStep: 0,
    tutorialShownSteps: new Set(),
    isFirstGame: true,
    commanderDamageBuff: new Set(),
    commanderSpeedBuff: new Set(),
    commanderHpBuffApplied: new Set(),

    commanderId: 'marshal',
    commanderModifiers: {
      auraDamageBonus: 0.1,
      auraSpeedBonus: 0,
      auraHpBonus: 0,
      passiveGatherBonus: 0,
      passiveResearchSpeed: 0,
      passiveTowerAttackSpeed: 0,
    },

    airdropsRemaining: 2,
    airdropCooldownUntil: 0,

    checkpoints: [],
    lastCheckpointFrame: 0,

    evacuationTriggered: false,

    playerFaction: 'otter',
    aiPersonality: 'balanced',

    rallyCryExpiry: 0,
    rallyCryCooldownUntil: 0,
    pondBlessingUsed: false,
    tidalSurgeUsed: false,
    warDrumsBuff: new Set(),
    venomCoatingTimers: new Map(),
  };
}
