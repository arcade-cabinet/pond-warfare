/**
 * Checkpoint & Evacuation – save/load checkpoints and emergency evacuation.
 */

import { query } from 'bitecs';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { EntityTypeTag, FactionTag, Health, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { loadGame as loadGameFromSave, saveGame } from '@/save-system';
import { EntityKind, Faction } from '@/types';
import * as store from '@/ui/store';

/** Create a rolling checkpoint (max 5). */
export function createCheckpoint(world: GameWorld): void {
  const json = saveGame(world);
  world.checkpoints.push(json);
  if (world.checkpoints.length > 5) {
    world.checkpoints.shift();
  }
  world.lastCheckpointFrame = world.frameCount;
  store.checkpointCount.value = world.checkpoints.length;
  world.floatingTexts.push({
    x: world.camX + (world.viewWidth || 400) / 2,
    y: world.camY + 60,
    text: 'Checkpoint \u2713',
    color: '#4ade80',
    life: 60,
  });
}

/** Load the most recent checkpoint into the world. Returns false if none exist. */
export function loadCheckpoint(world: GameWorld): boolean {
  if (world.checkpoints.length === 0) return false;
  const latest = world.checkpoints[world.checkpoints.length - 1];
  const success = loadGameFromSave(world, latest);
  if (success) {
    world.evacuationTriggered = false;
    store.evacuationActive.value = false;
  }
  return success;
}

/** Check if the player qualifies for emergency evacuation. */
export function checkEvacuation(world: GameWorld): void {
  if (world.evacuationTriggered) return;

  const allEnts = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);

  let lodgeHp = 0;
  let playerCombatUnits = 0;
  let playerGatherers = 0;
  let commanderAlive = false;

  for (let i = 0; i < allEnts.length; i++) {
    const eid = allEnts[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;

    const kind = EntityTypeTag.kind[eid] as EntityKind;
    if (kind === EntityKind.Lodge) {
      lodgeHp = Health.current[eid];
    } else if (kind === EntityKind.Commander) {
      commanderAlive = true;
    } else if (kind === EntityKind.Gatherer) {
      playerGatherers++;
    } else if (!ENTITY_DEFS[kind]?.isBuilding) {
      playerCombatUnits++;
    }
  }

  if (
    lodgeHp > 0 &&
    lodgeHp < 150 &&
    playerCombatUnits === 0 &&
    playerGatherers === 0 &&
    commanderAlive
  ) {
    world.evacuationTriggered = true;
    world.paused = true;
    store.paused.value = true;
    store.evacuationActive.value = true;
  }
}
