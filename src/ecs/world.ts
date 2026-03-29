import { createWorld } from 'bitecs';
import type {
  Corpse,
  Firefly,
  FloatingText,
  GameResources,
  GameState,
  GameStats,
  GroundPing,
  MinimapPing,
  Particle,
} from '@/types';
import { STARTING_CLAMS, STARTING_TWIGS } from '@/constants';
import { type TechState, createInitialTechState } from '@/config/tech-tree';

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
  tech: TechState;
  stats: GameStats;
  state: GameState;

  // Timing
  frameCount: number;
  timeOfDay: number;
  peaceTimer: number;
  gameSpeed: number;
  ambientDarkness: number;

  // Camera
  camX: number;
  camY: number;
  viewWidth: number;
  viewHeight: number;
  isTracking: boolean;
  shakeTimer: number;

  // Selection
  selection: number[];
  ctrlGroups: Record<number, number[]>;

  // Input state
  placingBuilding: string | null;
  attackMoveMode: boolean;
  idleWorkerIdx: number;

  // Resource tracking
  resTracker: {
    lastClams: number;
    lastTwigs: number;
    rateClams: number;
    rateTwigs: number;
  };
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
      food: 0,
      maxFood: 0,
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
    camX: 0,
    camY: 0,
    viewWidth: 0,
    viewHeight: 0,
    isTracking: false,
    shakeTimer: 0,
    selection: [],
    ctrlGroups: {},
    placingBuilding: null,
    attackMoveMode: false,
    idleWorkerIdx: 0,
    resTracker: {
      lastClams: STARTING_CLAMS,
      lastTwigs: STARTING_TWIGS,
      rateClams: 0,
      rateTwigs: 0,
    },
  };
}
