import type { GameWorld } from '@/ecs/world';
import { computePopulation } from '@/game/population-counter';
import { syncRosters } from '@/game/roster-sync';
import { syncThreatAndObjectives } from '@/game/threat-sync';
import * as store from '@/ui/store';

export function syncGovernorSignals(world: GameWorld): void {
  computePopulation(world);
  store.fish.value = world.resources.fish;
  store.logs.value = world.resources.logs;
  store.rocks.value = world.resources.rocks;
  store.gameState.value = world.state;
  syncRosters(world);
  syncThreatAndObjectives(world);
}
