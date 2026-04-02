/**
 * Shared helpers for campaign mission integration tests.
 */

import { addComponent, addEntity } from 'bitecs';
import type { CampaignState } from '@/campaign/campaign-system';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { applyCampaignMission } from '@/game/difficulty';
import { type EntityKind, Faction } from '@/types';
import * as store from '@/ui/store';
import { DEFAULT_CUSTOM_SETTINGS } from '@/ui/store-types';

export type WorldWithCampaign = GameWorld & { campaign?: CampaignState };

export function setupMission(missionId: string): WorldWithCampaign {
  const world = createGameWorld() as WorldWithCampaign;
  store.customGameSettings.value = { ...DEFAULT_CUSTOM_SETTINGS };
  store.selectedDifficulty.value = 'normal';
  store.campaignMissionId.value = missionId;
  applyCampaignMission(world);
  return world;
}

export function addBuilding(world: GameWorld, kind: EntityKind): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Building);
  Position.x[eid] = 400;
  Position.y[eid] = 400;
  Health.current[eid] = 100;
  Health.max[eid] = 100;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  Building.progress[eid] = 100;
  return eid;
}
