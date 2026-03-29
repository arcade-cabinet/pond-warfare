/**
 * Campaign System Tests
 *
 * Validates objective checking, completion tracking, and mission victory.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ENTITY_DEFS } from '@/config/entity-defs';
import {
  campaignSystem,
  createCampaignState,
  type CampaignState,
} from '@/campaign/campaign-system';
import type { MissionDef } from '@/campaign/missions';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

// Mock storage to avoid SQLite dependency
vi.mock('@/storage', () => ({
  isDatabaseReady: vi.fn().mockReturnValue(false),
  persist: vi.fn().mockResolvedValue(undefined),
}));

// Mock capacitor-community/sqlite
vi.mock('@capacitor-community/sqlite', () => ({
  CapacitorSQLite: {},
  SQLiteConnection: vi.fn(),
}));

/** Create a player building. */
function createPlayerBuilding(
  world: GameWorld,
  kind: EntityKind,
  x: number,
  y: number,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Building);

  const def = ENTITY_DEFS[kind];
  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = def.hp;
  Health.max[eid] = def.hp;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  Building.progress[eid] = 100;

  return eid;
}

/** Create a minimal test mission definition. */
function createTestMission(overrides: Partial<MissionDef> = {}): MissionDef {
  return {
    id: 'test_mission',
    number: 1,
    title: 'Test Mission',
    subtitle: 'Test',
    briefing: 'Test briefing',
    objectives: [
      {
        id: 'build_armory',
        type: 'build',
        label: 'Build an Armory',
        entityKind: EntityKind.Armory,
        count: 1,
      },
    ],
    dialogues: [],
    settingsOverrides: {},
    ...overrides,
  };
}

describe('campaignSystem', () => {
  let world: GameWorld & { campaign?: CampaignState };

  beforeEach(() => {
    world = createGameWorld() as GameWorld & { campaign?: CampaignState };
    world.frameCount = 1;
    world.viewWidth = 800;
    world.viewHeight = 600;
  });

  it('should check mission objectives each frame', () => {
    const mission = createTestMission();
    world.campaign = createCampaignState(mission);

    // No armory built yet
    campaignSystem(world);

    // Objective should still be incomplete
    expect(world.campaign.objectiveStatus.get('build_armory')).toBe(false);
    expect(world.campaign.allObjectivesComplete).toBe(false);
  });

  it('should complete objective when condition is met', () => {
    const mission = createTestMission();
    world.campaign = createCampaignState(mission);

    // Build an armory
    createPlayerBuilding(world, EntityKind.Armory, 500, 500);

    campaignSystem(world);

    // Objective should now be complete
    expect(world.campaign.objectiveStatus.get('build_armory')).toBe(true);
    // Floating text celebration should appear
    expect(world.floatingTexts.length).toBeGreaterThan(0);
    expect(world.floatingTexts[0].text).toContain('Objective Complete');
  });

  it('should trigger mission victory when all objectives are done', () => {
    const mission = createTestMission();
    world.campaign = createCampaignState(mission);

    // Build an armory to satisfy the only objective
    createPlayerBuilding(world, EntityKind.Armory, 500, 500);

    // First call: check objectives (marks them complete, sets allObjectivesComplete)
    campaignSystem(world);
    expect(world.campaign.allObjectivesComplete).toBe(true);

    // Advance 90+ frames to trigger celebration
    world.frameCount = world.campaign.completedAtFrame + 91;
    campaignSystem(world);

    // Victory celebration should have been shown
    expect(world.campaign.celebrationShown).toBe(true);
    expect(world.state).toBe('win');
  });
});
