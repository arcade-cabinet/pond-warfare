import { query } from 'bitecs';
import { Health, Position } from '@/ecs/components';
import { aiSystem } from '@/ecs/systems/ai';
import { autoSymbolSystem } from '@/ecs/systems/auto-symbol';
import { autoTrainSystem } from '@/ecs/systems/auto-train';
import { buildingSystem } from '@/ecs/systems/building';
import { cleanupSystem } from '@/ecs/systems/cleanup';
import { combatSystem } from '@/ecs/systems/combat';
import { commanderPassivesSystem } from '@/ecs/systems/commander-passives';
import { evolutionSystem } from '@/ecs/systems/evolution';
import { fortificationTickSystem } from '@/ecs/systems/fortification';
import { gatheringSystem } from '@/ecs/systems/gathering';
import { healthSystem } from '@/ecs/systems/health';
import { matchEventRunnerSystem } from '@/ecs/systems/match-event-runner';
import { movementSystem } from '@/ecs/systems/movement';
import { prestigeAutoBehaviorSystem } from '@/ecs/systems/prestige-auto-behaviors';
import { projectileSystem } from '@/ecs/systems/projectile';
import { shamanHealSystem } from '@/ecs/systems/shaman-heal';
import { trainingSystem } from '@/ecs/systems/training';
import { weatherSystem } from '@/ecs/systems/weather';
import type { GameWorld } from '@/ecs/world';
import type { Governor } from '@/governor/governor';
import * as storeV3 from '@/ui/store-v3';
import { syncGovernorSignals } from './governor-sync';

interface RunSimFrameOptions {
  governor?: Governor | null;
  runMatchEvents?: boolean;
  runPrestigeAutoBehaviors?: boolean;
  syncSignals?: boolean;
}

export function runSimFrame(world: GameWorld, options: RunSimFrameOptions = {}): void {
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
  buildingSystem(world);
  combatSystem(world);
  fortificationTickSystem(world);
  commanderPassivesSystem(world);
  projectileSystem(world);
  trainingSystem(world);
  aiSystem(world);
  evolutionSystem(world);
  autoTrainSystem(world);
  healthSystem(world);
  if (options.runPrestigeAutoBehaviors !== false) {
    prestigeAutoBehaviorSystem(world);
  }
  shamanHealSystem(world);
  if (options.runMatchEvents !== false) {
    matchEventRunnerSystem(world, storeV3.progressionLevel.value);
  }
  autoSymbolSystem(world);
  cleanupSystem(world);

  if (options.syncSignals !== false && world.frameCount % 30 === 0) {
    syncGovernorSignals(world);
  }

  options.governor?.tick();
}
