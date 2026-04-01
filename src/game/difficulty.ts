/**
 * Difficulty & Campaign Mission – applies game settings to the world.
 *
 * Extracted from Game.applyDifficultyModifiers() and Game.applyCampaignMission().
 */

import { type CampaignState, createCampaignState } from '@/campaign';
import { getMission } from '@/campaign/missions';
import { getCommanderDef } from '@/config/commanders';
import {
  ENEMY_STARTING_CLAMS,
  ENEMY_STARTING_TWIGS,
  STARTING_CLAMS,
  STARTING_TWIGS,
} from '@/constants';
import type { GameWorld } from '@/ecs/world';
import * as store from '@/ui/store';

/** Apply difficulty modifiers to world state before entities are spawned. */
export function applyDifficultyModifiers(world: GameWorld): void {
  const diff = store.selectedDifficulty.value;
  const cfg = store.customGameSettings.value;
  world.difficulty = diff;

  // Permadeath (from custom settings or ultra nightmare)
  const permadeath = cfg.permadeath || diff === 'ultraNightmare';
  world.permadeath = permadeath;
  world.rewardsModifier = permadeath ? 1.5 : 1.0;

  // Peace timer: peaceMinutes * 3600 frames
  world.peaceTimer = cfg.peaceMinutes * 3600;

  // Starting resources: multiply by startingResourcesMult
  const baseClams = STARTING_CLAMS;
  const baseTwigs = STARTING_TWIGS;
  world.resources.clams = Math.round(baseClams * cfg.startingResourcesMult);
  world.resources.twigs = Math.round(baseTwigs * cfg.startingResourcesMult);
  world.resTracker.lastClams = world.resources.clams;
  world.resTracker.lastTwigs = world.resources.twigs;

  // Enemy resources: scale by enemyEconomy
  const enemyEcoMult: Record<string, number> = {
    weak: 0.5,
    normal: 1.0,
    strong: 2.0,
    overwhelming: 3.0,
  };
  const ecoMod = enemyEcoMult[cfg.enemyEconomy] ?? 1.0;
  world.enemyResources.clams = Math.round(ENEMY_STARTING_CLAMS * ecoMod);
  world.enemyResources.twigs = Math.round(ENEMY_STARTING_TWIGS * ecoMod);
  world.enemyEconomyMod = ecoMod;

  // Nest count
  world.nestCountOverride = cfg.enemyNests;

  // Scenario
  world.scenarioOverride = cfg.scenario;

  // Gather speed modifier
  const gatherSpeedMap: Record<string, number> = {
    slow: 1.5,
    normal: 1.0,
    fast: 0.6,
  };
  world.gatherSpeedMod = gatherSpeedMap[cfg.gatherSpeed] ?? 1.0;

  // Evolution speed modifier
  const evoSpeedMap: Record<string, number> = {
    slow: 1.5,
    normal: 1.0,
    fast: 0.5,
    instant: 0.1,
  };
  world.evolutionSpeedMod = evoSpeedMap[cfg.evolutionSpeed] ?? 1.0;

  // Fog of war mode
  world.fogOfWarMode = cfg.fogOfWar;

  // Hero mode
  world.heroMode = cfg.heroMode;

  // Starting units count
  world.startingUnitCount = cfg.startingUnits;

  // Resource density modifier
  const densityMap: Record<string, number> = {
    sparse: 0.5,
    normal: 1.0,
    rich: 1.5,
    abundant: 2.0,
  };
  world.resourceDensityMod = densityMap[cfg.resourceDensity] ?? 1.0;

  // Enemy aggression
  world.enemyAggressionLevel = cfg.enemyAggression;

  // Commander modifiers
  const cmdId = store.selectedCommander.value;
  const cmdDef = getCommanderDef(cmdId);
  world.commanderId = cmdId;
  world.commanderModifiers = {
    auraDamageBonus: cmdDef.auraDamageBonus,
    auraSpeedBonus: cmdDef.auraSpeedBonus,
    auraHpBonus: cmdDef.auraHpBonus,
    auraUnitHpBonus: cmdDef.auraUnitHpBonus,
    auraEnemyDamageReduction: cmdDef.auraEnemyDamageReduction,
    passiveGatherBonus: cmdDef.passiveGatherBonus,
    passiveResearchSpeed: cmdDef.passiveResearchSpeed,
    passiveTowerAttackSpeed: cmdDef.passiveTowerAttackSpeed,
    passiveSwimmerCostReduction: cmdDef.passiveSwimmerCostReduction,
    passiveTrapDurationMult: cmdDef.passiveTrapDurationMult,
    passiveShieldbearerTrainSpeed: cmdDef.passiveShieldbearerTrainSpeed,
    passiveCatapultRangeBonus: cmdDef.passiveCatapultRangeBonus,
    passiveLightningDamage: cmdDef.passiveLightningDamage,
  };

  // Airdrops safety net
  const airdropCounts: Record<string, number> = {
    easy: 3,
    normal: 2,
    hard: 1,
    nightmare: 0,
    ultraNightmare: 0,
  };
  world.airdropsRemaining = airdropCounts[diff] ?? 2;
  world.airdropCooldownUntil = 0;
  store.airdropsRemaining.value = world.airdropsRemaining;
  store.airdropCooldown.value = 0;

  // Player faction & AI personality
  world.playerFaction = store.playerFaction.value;
  world.aiPersonality = store.aiPersonality.value;

  // Checkpoint/evacuation reset
  world.checkpoints = [];
  world.lastCheckpointFrame = 0;
  world.evacuationTriggered = false;
  store.evacuationActive.value = false;
  store.checkpointCount.value = 0;
}

/**
 * Apply campaign mission overrides to the world if a campaign mission
 * is being launched. Must be called after applyDifficultyModifiers
 * and before spawnInitialEntities.
 */
export function applyCampaignMission(world: GameWorld): void {
  const missionId = store.campaignMissionId.value;
  if (!missionId) {
    (world as GameWorld & { campaign?: CampaignState }).campaign = undefined;
    store.campaignObjectiveStatuses.value = {};
    return;
  }

  const mission = getMission(missionId);
  if (!mission) {
    store.campaignMissionId.value = '';
    return;
  }

  // Apply settings overrides from the mission definition
  const cfg = mission.settingsOverrides;
  if (cfg.scenario) world.scenarioOverride = cfg.scenario;
  if (cfg.enemyNests != null) world.nestCountOverride = cfg.enemyNests;
  if (cfg.enemyAggression) world.enemyAggressionLevel = cfg.enemyAggression;
  if (cfg.peaceMinutes != null) world.peaceTimer = cfg.peaceMinutes * 3600;
  if (cfg.fogOfWar) world.fogOfWarMode = cfg.fogOfWar;
  if (cfg.resourceDensity) {
    const densityMap: Record<string, number> = {
      sparse: 0.5,
      normal: 1.0,
      rich: 1.5,
      abundant: 2.0,
    };
    world.resourceDensityMod = densityMap[cfg.resourceDensity] ?? 1.0;
  }
  if (cfg.evolutionSpeed) {
    const evoMap: Record<string, number> = {
      slow: 1.5,
      normal: 1.0,
      fast: 0.5,
      instant: 0.1,
    };
    world.evolutionSpeedMod = evoMap[cfg.evolutionSpeed] ?? 1.0;
  }
  if (cfg.startingResourcesMult != null) {
    world.resources.clams = Math.round(world.resources.clams * cfg.startingResourcesMult);
    world.resources.twigs = Math.round(world.resources.twigs * cfg.startingResourcesMult);
    world.resTracker.lastClams = world.resources.clams;
    world.resTracker.lastTwigs = world.resources.twigs;
  }

  // Apply world-level overrides
  const wo = mission.worldOverrides;
  if (wo) {
    if (wo.evolutionSpeedMod != null) world.evolutionSpeedMod = wo.evolutionSpeedMod;
    if (wo.heroMode != null) world.heroMode = wo.heroMode;
    if (wo.fogOfWar) world.fogOfWarMode = wo.fogOfWar;
    if (wo.startingResourcesMult != null) {
      world.resources.clams = Math.round(world.resources.clams * wo.startingResourcesMult);
      world.resources.twigs = Math.round(world.resources.twigs * wo.startingResourcesMult);
      world.resTracker.lastClams = world.resources.clams;
      world.resTracker.lastTwigs = world.resources.twigs;
    }
    if (wo.fullTechTree) {
      for (const key of Object.keys(world.tech)) {
        (world.tech as Record<string, boolean>)[key] = true;
      }
    }
    if (wo.maxEnemyEvolution) {
      world.enemyEvolution.tier = 5;
    }
  }

  // Attach campaign state to the world
  const campaign = createCampaignState(mission);
  (world as GameWorld & { campaign?: CampaignState }).campaign = campaign;

  // Initialize objective statuses in the store
  const statuses: Record<string, boolean> = {};
  for (const obj of mission.objectives) {
    statuses[obj.id] = false;
  }
  store.campaignObjectiveStatuses.value = statuses;

  // Disable advisor first-game tips for campaign missions
  world.isFirstGame = false;
}
