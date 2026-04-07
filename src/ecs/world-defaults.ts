/**
 * World Factory & Default Values
 *
 * Separated from world.ts to keep the GameWorld interface file
 * under 300 LOC. Exports createGameWorld() and CommanderModifiers.
 */

import { createWorld } from 'bitecs';
import { YukaManager } from '@/ai/yuka-manager';
import { createWeatherState } from '@/config/weather';
import {
  ENEMY_STARTING_FISH,
  ENEMY_STARTING_LOGS,
  STARTING_FISH,
  STARTING_LOGS,
  TILE_SIZE,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '@/constants';
import { resetTransientComponentState } from '@/ecs/components';
import { TerrainGrid } from '@/terrain/terrain-grid';
import { EntityKind, type Particle } from '@/types';
import { ObjectPool } from '@/utils/pool';
import { SeededRandom } from '@/utils/random';
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

const defaultSeed = Math.floor(Math.random() * 2147483647);

/** Create a fresh GameWorld with all default values. */
export function createGameWorld(): GameWorld {
  resetTransientComponentState();
  return {
    ecs: createWorld(),
    particles: [],
    floatingTexts: [],
    corpses: [],
    minimapPings: [],
    groundPings: [],
    fireflies: [],
    resources: {
      fish: STARTING_FISH,
      logs: STARTING_LOGS,
      rocks: 0,
      food: 0,
      maxFood: 0,
    },
    enemyResources: {
      fish: ENEMY_STARTING_FISH,
      logs: ENEMY_STARTING_LOGS,
    },
    // v3.0: tech flags set by commanders, not in-game research
    tech: {},
    stats: {
      unitsKilled: 0,
      unitsLost: 0,
      unitsTrained: 0,
      resourcesGathered: 0,
      buildingsBuilt: 0,
      buildingsLost: 0,
      peakArmy: 0,
      pearlsEarned: 0,
      totalFishEarned: 0,
    },
    state: 'playing',
    frameCount: 0,
    timeOfDay: 8 * 60,
    peaceTimer: 10800,
    gameSpeed: 1,
    ambientDarkness: 0,
    paused: false,
    worldWidth: WORLD_WIDTH,
    worldHeight: WORLD_HEIGHT,
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
    clamRewardMultiplier: 1.0,
    gatherSpeedMod: 1.0,
    playerUnitDamageMultiplier: 1.0,
    playerUnitHpMultiplier: 1.0,
    evolutionSpeedMod: 1.0,
    fogOfWarMode: 'full',
    heroMode: false,
    startingUnitCount: 4,
    scenarioOverride: null,
    nestCountOverride: -1,
    resourceDensityMod: 1.0,
    enemyEconomyMod: 1.0,
    enemyStatMult: 1.0,
    nestBuildRateMult: 1.0,
    enemyAggressionLevel: 'normal',
    mapSeed: defaultSeed,
    gameRng: new SeededRandom(defaultSeed ^ 0x9e3779b9),
    placingBuilding: null,
    attackMoveMode: false,
    idleWorkerIdx: 0,
    specialistAssignments: new Map(),
    pendingSpecialistAssignment: null,
    specialistBlueprintCaps: {},
    resTracker: {
      lastFish: STARTING_FISH,
      lastLogs: STARTING_LOGS,
      rateFish: 0,
      rateLogs: 0,
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
    commanderEntityId: -1,
    enemyCommanderEntityId: -1,
    commanderDamageBuff: new Set(),
    commanderSpeedBuff: new Set(),
    commanderHpBuffApplied: new Set(),
    commanderUnitHpBuff: new Set(),
    commanderEnemyDebuff: new Set(),
    commanderId: 'marshal',
    commanderModifiers: {
      auraDamageBonus: 0.15,
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
    pondBlessingCooldownUntil: 0,
    tidalSurgeUsed: false,
    warDrumsBuff: new Set(),
    venomCoatingTimers: new Map(),
    exploredPercent: 0,
    terrainGrid: new TerrainGrid(WORLD_WIDTH, WORLD_HEIGHT, TILE_SIZE),
    combatZones: [],
    waveNumber: 0,
    waveSurvivalMode: false,
    waveSurvivalTarget: 5,
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
    gameOverReason: null,
    stealthEntities: new Set(),
    stealthAmbushReady: new Set(),
    wormBurrowTimers: new Map(),
    lastWormSpawnFrame: 0,
    engineerBridges: [],
    // v2.0.0
    weather: createWeatherState(defaultSeed, 0),
    berserkerCombatFrames: new Map(),
    shrineUsed: new Set(),
    wallGateFaction: new Map(),
    // v2.1.0
    extendedStats: {},
    // Co-op multiplayer
    coopMode: false,
    partnerLodgeDestroyed: false,
    partnerUnitPositions: [],
    coopResourceCallback: null,
    // Adversarial multiplayer
    adversarialMode: false,
    opponentLodgeEid: -1,
    opponentCommanderEid: -1,
    // Patrol waypoints (entity ID -> waypoint array)
    patrolWaypoints: new Map(),
    // v3.0: fortification slots
    fortifications: null,
    // v3.0: panel grid (6-panel map system)
    panelGrid: null,
  };
}
