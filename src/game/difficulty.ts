/**
 * Difficulty -- applies game settings to the world.
 *
 * Extracted from Game.applyDifficultyModifiers().
 */

import { getCommanderDef } from '@/config/commanders';
import {
  ENEMY_STARTING_FISH,
  ENEMY_STARTING_LOGS,
  STARTING_FISH,
  STARTING_LOGS,
} from '@/constants';
import type { GameWorld } from '@/ecs/world';
import { applyCoopDifficultyScaling } from '@/net/coop-rules';
import * as store from '@/ui/store';

/** Apply difficulty modifiers to world state before entities are spawned. */
export function applyDifficultyModifiers(world: GameWorld): void {
  const diff = store.selectedDifficulty.value;
  const cfg = store.customGameSettings.value;
  world.difficulty = diff;

  // Permadeath (from custom settings or ultra nightmare)
  const permadeath = cfg.permadeath || diff === 'ultraNightmare';
  world.permadeath = permadeath;
  world.rewardsModifier = permadeath ? 1.75 : 1.0;

  // Peace timer: peaceMinutes * 3600 frames
  world.peaceTimer = cfg.peaceMinutes * 3600;

  // Starting resources: multiply by startingResourcesMult
  const baseFish = STARTING_FISH;
  const baseLogs = STARTING_LOGS;
  world.resources.fish = Math.round(baseFish * cfg.startingResourcesMult);
  world.resources.logs = Math.round(baseLogs * cfg.startingResourcesMult);
  world.resTracker.lastFish = world.resources.fish;
  world.resTracker.lastLogs = world.resources.logs;

  // Enemy resources: scale by enemyEconomy
  const enemyEcoMult: Record<string, number> = {
    weak: 0.5,
    normal: 1.0,
    strong: 2.0,
    overwhelming: 3.0,
  };
  const ecoMod = enemyEcoMult[cfg.enemyEconomy] ?? 1.0;
  world.enemyResources.fish = Math.round(ENEMY_STARTING_FISH * ecoMod);
  world.enemyResources.logs = Math.round(ENEMY_STARTING_LOGS * ecoMod);
  world.enemyEconomyMod = ecoMod;

  // Nest count
  world.nestCountOverride = cfg.enemyNests;

  // Enemy stat multiplier (HP/damage scaling for enemy units)
  world.enemyStatMult = cfg.enemyStatMult;

  // Nest build rate multiplier (affects enemy nest production speed)
  world.nestBuildRateMult = cfg.nestBuildRateMult;

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

  // Co-op difficulty scaling: +50% enemy HP/damage when co-op is active
  applyCoopDifficultyScaling(world);

  // Checkpoint/evacuation reset
  world.checkpoints = [];
  world.lastCheckpointFrame = 0;
  world.evacuationTriggered = false;
  store.evacuationActive.value = false;
  store.checkpointCount.value = 0;
}
