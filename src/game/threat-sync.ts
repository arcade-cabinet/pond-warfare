/**
 * Threat & Objective Sync
 *
 * Syncs wave countdown, global production queue, base-under-attack
 * detection, and enemy nest objective tracking to the UI store.
 */

import { hasComponent, query } from 'bitecs';
import { WAVE_INTERVAL } from '@/constants';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  TrainingQueue,
  trainingQueueSlots,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { getPlayerTrainProgress } from '@/game/train-timer';
import { getPlayerTrainableDisplayName } from '@/game/unit-display';
import { EntityKind, Faction } from '@/types';
import * as store from '@/ui/store';

export function syncThreatAndObjectives(world: GameWorld): void {
  const w = world;
  const allEnts = query(w.ecs, [Position, Health, FactionTag, EntityTypeTag]);

  // --- Wave countdown ---
  if (w.frameCount >= w.peaceTimer) {
    const framesSinceLastWave = w.frameCount % WAVE_INTERVAL;
    store.waveCountdown.value = Math.ceil((WAVE_INTERVAL - framesSinceLastWave) / 60);
  } else {
    store.waveCountdown.value = -1;
  }

  // --- Global production queue ---
  const trainingBuildings = query(w.ecs, [
    Position,
    TrainingQueue,
    Building,
    FactionTag,
    IsBuilding,
    Health,
  ]);
  const prodQueue: store.QueueItem[] = [];
  for (let i = 0; i < trainingBuildings.length; i++) {
    const eid = trainingBuildings[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    const slots = trainingQueueSlots.get(eid) ?? [];
    if (slots.length === 0) continue;
    const unitKind = slots[0] as EntityKind;
    const progress = getPlayerTrainProgress(w, TrainingQueue.timer[eid]);
    prodQueue.push({
      buildingKind: EntityTypeTag.kind[eid],
      unitLabel: getPlayerTrainableDisplayName(unitKind),
      progress,
      entityId: eid,
    });
  }
  store.globalProductionQueue.value = prodQueue;

  // --- Base under attack detection: enemies within 400px of any player Lodge ---
  const BASE_THREAT_RADIUS_SQ = 400 * 400;
  let baseThreatCount = 0;
  const lodgePositions: { x: number; y: number }[] = [];
  const enemyPositions: { x: number; y: number }[] = [];

  for (let i = 0; i < allEnts.length; i++) {
    const eid = allEnts[i];
    if (Health.current[eid] <= 0) continue;
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    const faction = FactionTag.faction[eid] as Faction;

    if (kind === EntityKind.Lodge && faction === Faction.Player) {
      lodgePositions.push({ x: Position.x[eid], y: Position.y[eid] });
    } else if (
      faction === Faction.Enemy &&
      !hasComponent(w.ecs, eid, IsBuilding) &&
      !hasComponent(w.ecs, eid, IsResource)
    ) {
      enemyPositions.push({ x: Position.x[eid], y: Position.y[eid] });
    }
  }

  for (const lodge of lodgePositions) {
    for (const enemy of enemyPositions) {
      const dx = lodge.x - enemy.x;
      const dy = lodge.y - enemy.y;
      if (dx * dx + dy * dy < BASE_THREAT_RADIUS_SQ) {
        baseThreatCount += 1;
      }
    }
  }
  store.baseThreatCount.value = baseThreatCount;
  store.baseUnderAttack.value = baseThreatCount > 0;

  // --- Objective tracking: enemy nest counts ---
  let aliveNests = 0;
  for (let i = 0; i < allEnts.length; i++) {
    const eid = allEnts[i];
    if ((EntityTypeTag.kind[eid] as EntityKind) !== EntityKind.PredatorNest) continue;
    if (Health.current[eid] > 0) aliveNests++;
  }

  if (aliveNests > store.totalEnemyNests.value) {
    store.totalEnemyNests.value = aliveNests;
  }

  const total = store.totalEnemyNests.value;
  const newDestroyed = total > 0 ? total - aliveNests : 0;

  if (newDestroyed > store.destroyedEnemyNests.value) {
    store.nestJustDestroyed.value = true;
    setTimeout(() => {
      store.nestJustDestroyed.value = false;
    }, 3000);
  }
  store.destroyedEnemyNests.value = newDestroyed;
}
