/**
 * World Factory & Default Values
 *
 * Separated from world.ts to keep the GameWorld interface file
 * under 300 LOC. Exports createGameWorld() and CommanderModifiers.
 */

import { createWorld } from 'bitecs';
import { createAdvisorState } from '@/advisors/types';
import { YukaManager } from '@/ai/yuka-manager';
import { createInitialTechState } from '@/config/tech-tree';
import {
  ENEMY_STARTING_CLAMS,
  ENEMY_STARTING_TWIGS,
  STARTING_CLAMS,
  STARTING_TWIGS,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '@/constants';
import { TerrainGrid } from '@/terrain/terrain-grid';
import { EntityKind, type Particle } from '@/types';
import { ObjectPool } from '@/utils/pool';
import { SpatialHash } from '@/utils/spatial-hash';
import type { GameWorld } from './world';

/** Modifier values derived from the selected Commander at game start. */
export interface CommanderModifiers {
  auraDamageBonus: number;
  auraSpeedBonus: number;
  auraHpBonus: number;
  auraUnitHpBonus: number;
  auraEnemyDamageReduction: number;
  passiveGatherBonus: number;
  passiveResearchSpeed: number;
  passiveTowerAttackSpeed: number;
  passiveSwimmerCostReduction: number;
  passiveTrapDurationMult: number;
  passiveShieldbearerTrainSpeed: number;
  passiveCatapultRangeBonus: number;
  passiveLightningDamage: number;
}

/** Create a fresh GameWorld with all default values. */
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
      unitsTrained: 0,
      resourcesGathered: 0,
      buildingsBuilt: 0,
      buildingsLost: 0,
      peakArmy: 0,
      pearlsEarned: 0,
      totalClamsEarned: 0,
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
      gatherer: false,
      combat: false,
      healer: false,
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
    isFirstGame: true,
    advisorState: createAdvisorState(),
    commanderDamageBuff: new Set(),
    commanderSpeedBuff: new Set(),
    commanderHpBuffApplied: new Set(),
    commanderUnitHpBuff: new Set(),
    commanderEnemyDebuff: new Set(),
    commanderId: 'marshal',
    commanderModifiers: {
      auraDamageBonus: 0.1,
      auraSpeedBonus: 0,
      auraHpBonus: 0,
      auraUnitHpBonus: 0,
      auraEnemyDamageReduction: 0,
      passiveGatherBonus: 0,
      passiveResearchSpeed: 0,
      passiveTowerAttackSpeed: 0,
      passiveSwimmerCostReduction: 0,
      passiveTrapDurationMult: 1,
      passiveShieldbearerTrainSpeed: 0,
      passiveCatapultRangeBonus: 0,
      passiveLightningDamage: 0,
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
    exploredPercent: 0,
    terrainGrid: new TerrainGrid(WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE),
    combatZones: [],
    waveNumber: 0,
    commanderAbilityCooldownUntil: 0,
    commanderAbilityActiveUntil: 0,
    demoralizedUnits: new Set(),
    commanderDeathDemoralizeUntil: 0,
    autoRetreatEnabled: true,
    gameEndFrame: 0,
    gameEndFocusX: 0,
    gameEndFocusY: 0,
    gameEndSpectacleActive: false,
    gameEndPrevSpeed: 1,
  };
}
