/**
 * GameWorld Interface
 *
 * Central type definition for the game world state. All systems,
 * renderers, and UI operate on this shared structure.
 *
 * Factory function and defaults live in world-defaults.ts.
 */

import type { createWorld } from 'bitecs';
import type { AdvisorState } from '@/advisors/types';
import type { YukaManager } from '@/ai/yuka-manager';
import type { AIPersonality } from '@/config/ai-personalities';
import type { PlayableFaction } from '@/config/factions';
import type { TechState } from '@/config/tech-tree';
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
    | null;
  nestCountOverride: number;
  resourceDensityMod: number;
  enemyEconomyMod: number;
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

  // Advisor system state
  advisorState: AdvisorState;

  // Commander aura: entity IDs within commander aura range
  commanderDamageBuff: Set<number>;
  commanderSpeedBuff: Set<number>;
  commanderHpBuffApplied: Set<number>;
  commanderUnitHpBuff: Set<number>;
  commanderEnemyDebuff: Set<number>;

  // Commander selection
  commanderId: string;
  commanderModifiers: CommanderModifiers;

  // Airdrop safety net
  airdropsRemaining: number;
  airdropCooldownUntil: number;

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
  rallyCryExpiry: number;
  rallyCryCooldownUntil: number;
  pondBlessingUsed: boolean;
  tidalSurgeUsed: boolean;
  warDrumsBuff: Set<number>;
  venomCoatingTimers: Map<number, number>;

  // Map exploration
  exploredPercent: number;
}
