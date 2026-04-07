// @vitest-environment jsdom

import { query } from 'bitecs';
import { describe, expect, it, vi } from 'vitest';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  TaskOverride,
  UnitStateMachine,
} from '@/ecs/components';
import { aiSystem } from '@/ecs/systems/ai';
import { autoSymbolSystem, resetAutoSymbol } from '@/ecs/systems/auto-symbol';
import { autoTrainSystem } from '@/ecs/systems/auto-train';
import { cleanupSystem } from '@/ecs/systems/cleanup';
import { combatSystem } from '@/ecs/systems/combat';
import { commanderPassivesSystem } from '@/ecs/systems/commander-passives';
import { evolutionSystem } from '@/ecs/systems/evolution';
import { gatheringSystem } from '@/ecs/systems/gathering';
import { healthSystem } from '@/ecs/systems/health';
import { matchEventRunnerSystem, resetMatchEventRunner } from '@/ecs/systems/match-event-runner';
import { movementSystem } from '@/ecs/systems/movement';
import { prestigeAutoBehaviorSystem } from '@/ecs/systems/prestige-auto-behaviors';
import { trainingSystem } from '@/ecs/systems/training';
import { weatherSystem } from '@/ecs/systems/weather';
import type { GameWorld } from '@/ecs/world';
import { spawnVerticalEntities } from '@/game/init-entities/spawn-vertical';
import { deploySpecialistsAtMatchStart } from '@/game/init-entities/specialist-init';
import { generateVerticalMapLayout } from '@/game/vertical-map';
import { applyUpgradeEffects } from '@/game/upgrade-effects';
import { Governor } from '@/governor/governor';
import { EntityKind, Faction } from '@/types';
import { buildCurrentRunUpgradeState } from '@/ui/current-run-upgrades';
import * as store from '@/ui/store';
import * as storeV3 from '@/ui/store-v3';
import { type PrestigeState, createPrestigeState, isAutoBehaviorUnlocked } from '@/config/prestige-logic';
import { SeededRandom } from '@/utils/random';
import { syncGovernorSignals } from '../helpers/governor-sync';
import { createTestPanelGrid, createTestWorld } from '../helpers/world-factory';

const _gameRef: { world: GameWorld | null } = { world: null };
vi.mock('@/game', () => ({
  game: new Proxy({} as Record<string, unknown>, {
    get(_target, prop) {
      if (prop === 'world') return _gameRef.world;
      return undefined;
    },
  }),
}));
vi.mock('@/audio/audio-system', () => ({
  audio: new Proxy({}, { get: () => vi.fn() }),
}));
vi.mock('@/rendering/animations');
vi.mock('@/utils/particles');

interface DiagnosticVariant {
  name: string;
  prestigeState?: PrestigeState;
  purchasedNodeIds?: string[];
  startingTierRank?: number;
}

interface VariantMetrics {
  name: string;
  startingGatherers: number;
  gatherSpeedMod: number;
  rareNodeCount: number;
  resourcesGathered: number;
  unitsTrained: number;
  playerUnits: number;
  fish: number;
  logs: number;
  rocks: number;
  gathererInfo: string;
}

function countPlayerUnits(world: GameWorld, kind?: EntityKind): number {
  return Array.from(query(world.ecs, [Health, FactionTag, EntityTypeTag])).filter((eid) => {
    if (FactionTag.faction[eid] !== Faction.Player || Health.current[eid] <= 0) return false;
    return kind === undefined || EntityTypeTag.kind[eid] === kind;
  }).length;
}

function summarizeGatherers(world: GameWorld): string {
  return Array.from(query(world.ecs, [Health, FactionTag, EntityTypeTag, UnitStateMachine]))
    .filter(
      (eid) =>
        FactionTag.faction[eid] === Faction.Player &&
        Health.current[eid] > 0 &&
        EntityTypeTag.kind[eid] === EntityKind.Gatherer,
    )
    .map((eid) => {
      const target = UnitStateMachine.targetEntity[eid];
      const targetKind = target >= 0 ? EntityTypeTag.kind[target] : -1;
      return `G:${UnitStateMachine.state[eid]}/O:${TaskOverride.task[eid]}/T:${targetKind}`;
    })
    .join(' ');
}

function runFrame(world: GameWorld, governor: Governor): void {
  world.frameCount++;
  world.yukaManager.update(1 / 60, world.ecs);
  world.spatialHash.clear();
  for (const eid of query(world.ecs, [Position, Health])) {
    if (Health.current[eid] > 0) {
      world.spatialHash.insert(eid, Position.x[eid], Position.y[eid]);
    }
  }

  weatherSystem(world);
  movementSystem(world);
  gatheringSystem(world);
  combatSystem(world);
  commanderPassivesSystem(world);
  trainingSystem(world);
  aiSystem(world);
  evolutionSystem(world);
  autoTrainSystem(world);
  healthSystem(world);
  prestigeAutoBehaviorSystem(world);
  matchEventRunnerSystem(world, storeV3.progressionLevel.value);
  autoSymbolSystem(world);
  cleanupSystem(world);

  if (world.frameCount % 30 === 0) {
    syncGovernorSignals(world);
  }

  governor.tick();
}

function runVariant(variant: DiagnosticVariant): VariantMetrics {
  resetAutoSymbol();
  resetMatchEventRunner();
  const prestigeState = variant.prestigeState ?? createPrestigeState();
  storeV3.progressionLevel.value = 3;
  storeV3.prestigeState.value = prestigeState;
  storeV3.startingTierRank.value = variant.startingTierRank ?? 0;

  const world = createTestWorld({ stage: 3, seed: 42, fish: 200 });
  world.peaceTimer = 0;
  _gameRef.world = world;

  const panelGrid = createTestPanelGrid(3);
  const layout = generateVerticalMapLayout(panelGrid, new SeededRandom(42), {
    hasRareResourceAccess: isAutoBehaviorUnlocked(prestigeState, 'rare_resource_access'),
  });
  const upgradeState = buildCurrentRunUpgradeState({
    clams: 100,
    purchasedNodeIds: variant.purchasedNodeIds ?? [],
    purchasedDiamondIds: [],
    startingTierRank: variant.startingTierRank ?? 0,
  });
  applyUpgradeEffects(world, upgradeState.state, prestigeState);

  const lodgeEid = spawnVerticalEntities(world, layout, new SeededRandom(99));
  deploySpecialistsAtMatchStart(world, prestigeState, lodgeEid);
  syncGovernorSignals(world);

  const governor = new Governor();
  governor.enabled = true;

  const startingGatherers = countPlayerUnits(world, EntityKind.Gatherer);
  const rareNodeCount = layout.resourcePositions.filter((pos) => pos.type === 'rare_node').length;

  for (let frame = 0; frame < 1200; frame += 1) {
    runFrame(world, governor);
  }

  return {
    name: variant.name,
    startingGatherers,
    gatherSpeedMod: world.gatherSpeedMod,
    rareNodeCount,
    resourcesGathered: world.stats.resourcesGathered,
    unitsTrained: world.stats.unitsTrained,
    playerUnits: countPlayerUnits(world),
    fish: world.resources.fish,
    logs: world.resources.logs,
    rocks: world.resources.rocks,
    gathererInfo: summarizeGatherers(world),
  };
}

describe('progression balance diagnostics', () => {
  it('compares baseline runs against progression variants', () => {
    const baseline = runVariant({ name: 'baseline' });
    const autoDeployFisher = runVariant({
      name: 'auto_deploy_fisher',
      prestigeState: {
        rank: 1,
        pearls: 0,
        totalPearlsEarned: 3,
        upgradeRanks: { auto_deploy_fisher: 1 },
      },
    });
    const pearlGather = runVariant({
      name: 'pearl_gather_multiplier',
      prestigeState: {
        rank: 1,
        pearls: 0,
        totalPearlsEarned: 10,
        upgradeRanks: { gather_multiplier: 2 },
      },
    });
    const clamFishTier = runVariant({
      name: 'clam_fish_tier_1',
      purchasedNodeIds: ['gathering_fish_gathering_t0'],
    });
    const rareResources = runVariant({
      name: 'rare_resource_access',
      prestigeState: {
        rank: 1,
        pearls: 0,
        totalPearlsEarned: 15,
        upgradeRanks: { rare_resource_access: 1 },
      },
    });
    const startingTier = runVariant({
      name: 'starting_tier_1',
      prestigeState: {
        rank: 1,
        pearls: 0,
        totalPearlsEarned: 20,
        upgradeRanks: { starting_tier: 1 },
      },
      startingTierRank: 1,
    });

    console.table([
      baseline,
      autoDeployFisher,
      pearlGather,
      clamFishTier,
      rareResources,
      startingTier,
    ]);

    expect(autoDeployFisher.startingGatherers).toBeGreaterThan(baseline.startingGatherers);
    expect(pearlGather.gatherSpeedMod).toBeGreaterThan(baseline.gatherSpeedMod);
    expect(clamFishTier.gatherSpeedMod).toBeGreaterThan(baseline.gatherSpeedMod);
    expect(rareResources.rareNodeCount).toBeGreaterThan(baseline.rareNodeCount);
    expect(startingTier.gatherSpeedMod).toBeGreaterThan(baseline.gatherSpeedMod);
  });
});
