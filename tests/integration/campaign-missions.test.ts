/**
 * Campaign Mission Integration Tests — Structural + Missions 1-3
 *
 * Verifies mission definitions, overrides, objectives, starting techs,
 * and victory conditions for the first three campaign missions.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  campaignNotifyKilled,
  campaignNotifyTrained,
  campaignSystem,
} from '@/campaign/campaign-system';
import { CAMPAIGN_MISSIONS, getMission } from '@/campaign/missions';
import { EntityKind } from '@/types';
import { addBuilding, setupMission, type WorldWithCampaign } from './campaign-helpers';

vi.mock('@/storage', () => ({
  isDatabaseReady: vi.fn().mockReturnValue(false),
  persist: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@capacitor-community/sqlite', () => ({
  CapacitorSQLite: {},
  SQLiteConnection: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Structural validation
// ---------------------------------------------------------------------------

describe('Campaign missions — structural', () => {
  it('has exactly 5 missions numbered 1-5', () => {
    expect(CAMPAIGN_MISSIONS).toHaveLength(5);
    expect(CAMPAIGN_MISSIONS.map((m) => m.number)).toEqual([1, 2, 3, 4, 5]);
  });

  it('each mission has unique id and at least 1 objective', () => {
    const ids = CAMPAIGN_MISSIONS.map((m) => m.id);
    expect(new Set(ids).size).toBe(5);
    for (const m of CAMPAIGN_MISSIONS) {
      expect(m.objectives.length).toBeGreaterThanOrEqual(1);
    }
  });

  it('every mission is findable via getMission', () => {
    for (const m of CAMPAIGN_MISSIONS) {
      expect(getMission(m.id)).toBe(m);
    }
  });
});

// ---------------------------------------------------------------------------
// Mission 1: First Dawn
// ---------------------------------------------------------------------------

describe('Mission 1 — First Dawn', () => {
  let world: WorldWithCampaign;

  beforeEach(() => {
    world = setupMission('first-dawn');
    world.viewWidth = 800;
    world.viewHeight = 600;
    world.frameCount = 1;
  });

  it('applies settings overrides', () => {
    expect(world.scenarioOverride).toBe('standard');
    expect(world.nestCountOverride).toBe(1);
    expect(world.enemyAggressionLevel).toBe('passive');
    expect(world.fogOfWarMode).toBe('explored');
  });

  it('pre-unlocks cartography tech', () => {
    expect(world.tech.cartography).toBe(true);
  });

  it('disables enemy attacks until objectives done', () => {
    const mission = getMission('first-dawn')!;
    expect(mission.worldOverrides?.disableEnemyAttacksUntilObjectivesDone).toBe(true);
  });

  it('completes build-armory objective when armory exists', () => {
    addBuilding(world, EntityKind.Armory);
    campaignSystem(world);
    expect(world.campaign?.objectiveStatus.get('build-armory')).toBe(true);
  });

  it('completes train-brawlers objective after 3 trained', () => {
    campaignNotifyTrained(world, EntityKind.Brawler);
    campaignNotifyTrained(world, EntityKind.Brawler);
    campaignNotifyTrained(world, EntityKind.Brawler);
    addBuilding(world, EntityKind.Armory);
    campaignSystem(world);
    expect(world.campaign?.objectiveStatus.get('train-brawlers')).toBe(true);
  });

  it('triggers victory when all objectives met', () => {
    addBuilding(world, EntityKind.Armory);
    campaignNotifyTrained(world, EntityKind.Brawler);
    campaignNotifyTrained(world, EntityKind.Brawler);
    campaignNotifyTrained(world, EntityKind.Brawler);
    campaignSystem(world);
    expect(world.campaign?.allObjectivesComplete).toBe(true);

    world.frameCount = world.campaign?.completedAtFrame + 91;
    campaignSystem(world);
    expect(world.state).toBe('win');
  });

  it('has dialogue triggers', () => {
    const mission = getMission('first-dawn')!;
    expect(mission.dialogues.length).toBeGreaterThanOrEqual(3);
    expect(mission.dialogues[0].frame).toBe(60);
  });
});

// ---------------------------------------------------------------------------
// Mission 2: Into the Fog
// ---------------------------------------------------------------------------

describe('Mission 2 — Into the Fog', () => {
  let world: WorldWithCampaign;

  beforeEach(() => {
    world = setupMission('into-the-fog');
    world.viewWidth = 800;
    world.viewHeight = 600;
    world.frameCount = 1;
  });

  it('applies settings overrides', () => {
    expect(world.fogOfWarMode).toBe('full');
    expect(world.nestCountOverride).toBe(1);
    expect(world.enemyAggressionLevel).toBe('normal');
  });

  it('pre-unlocks herbalMedicine tech', () => {
    expect(world.tech.herbalMedicine).toBe(true);
  });

  it('completes research-cartography when tech is researched', () => {
    world.tech.cartography = true;
    campaignSystem(world);
    expect(world.campaign?.objectiveStatus.get('research-cartography')).toBe(true);
  });

  it('completes explore-map at 50% explored', () => {
    world.exploredPercent = 50;
    world.tech.cartography = true;
    addBuilding(world, EntityKind.Lodge);
    addBuilding(world, EntityKind.Lodge);
    campaignSystem(world);
    expect(world.campaign?.objectiveStatus.get('explore-map')).toBe(true);
  });

  it('completes build-second-lodge with 2 lodges', () => {
    addBuilding(world, EntityKind.Lodge);
    addBuilding(world, EntityKind.Lodge);
    campaignSystem(world);
    expect(world.campaign?.objectiveStatus.get('build-second-lodge')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Mission 3: The Nest Must Fall
// ---------------------------------------------------------------------------

describe('Mission 3 — The Nest Must Fall', () => {
  let world: WorldWithCampaign;

  beforeEach(() => {
    world = setupMission('the-nest-must-fall');
    world.viewWidth = 800;
    world.viewHeight = 600;
    world.frameCount = 1;
  });

  it('applies settings overrides', () => {
    expect(world.enemyAggressionLevel).toBe('aggressive');
    expect(world.nestCountOverride).toBe(1);
  });

  it('pre-unlocks sturdyMud tech', () => {
    expect(world.tech.sturdyMud).toBe(true);
  });

  it('completes research-sharp-sticks when researched', () => {
    world.tech.sharpSticks = true;
    campaignSystem(world);
    expect(world.campaign?.objectiveStatus.get('research-sharp-sticks')).toBe(true);
  });

  it('completes destroy-nest when a nest is killed', () => {
    world.tech.sharpSticks = true;
    campaignNotifyKilled(world, EntityKind.PredatorNest);
    campaignSystem(world);
    expect(world.campaign?.objectiveStatus.get('destroy-nest')).toBe(true);
  });

  it('triggers victory when both objectives met', () => {
    world.tech.sharpSticks = true;
    campaignNotifyKilled(world, EntityKind.PredatorNest);
    campaignSystem(world);
    expect(world.campaign?.allObjectivesComplete).toBe(true);

    world.frameCount = world.campaign?.completedAtFrame + 91;
    campaignSystem(world);
    expect(world.state).toBe('win');
  });
});
