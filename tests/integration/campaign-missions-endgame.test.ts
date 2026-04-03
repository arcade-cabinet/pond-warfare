/**
 * Campaign Mission Integration Tests — Missions 6-10 objectives
 *
 * Verifies overrides, objectives, starting techs, and victory
 * conditions for individual missions 6 through 10.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  campaignNotifyKilled,
  campaignSystem,
} from '@/campaign/campaign-system';
import { getMission } from '@/campaign/missions';
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
// Mission 6: The Siege
// ---------------------------------------------------------------------------

describe('Mission 6 — The Siege', () => {
  let world: WorldWithCampaign;

  beforeEach(() => {
    world = setupMission('the-siege');
    world.viewWidth = 800;
    world.viewHeight = 600;
    world.frameCount = 1;
  });

  it('applies peninsula scenario with 2 nests', () => {
    expect(world.scenarioOverride).toBe('peninsula');
    expect(world.nestCountOverride).toBe(2);
  });

  it('pre-unlocks fortification techs', () => {
    expect(world.tech.sturdyMud).toBe(true);
    expect(world.tech.fortifiedWalls).toBe(true);
    expect(world.tech.sharpSticks).toBe(true);
  });

  it('completes research-iron-shell when researched', () => {
    world.tech.ironShell = true;
    campaignSystem(world);
    expect(world.campaign?.objectiveStatus.get('research-iron-shell')).toBe(true);
  });

  it('completes build-walls with 4 walls', () => {
    for (let i = 0; i < 4; i++) addBuilding(world, EntityKind.Wall);
    campaignSystem(world);
    expect(world.campaign?.objectiveStatus.get('build-walls')).toBe(true);
  });

  it('completes survive-siege-waves at evolution tier 3', () => {
    world.enemyEvolution.tier = 3;
    campaignSystem(world);
    expect(world.campaign?.objectiveStatus.get('survive-siege-waves')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Mission 7: Allied Waters
// ---------------------------------------------------------------------------

describe('Mission 7 — Allied Waters', () => {
  let world: WorldWithCampaign;

  beforeEach(() => {
    world = setupMission('allied-waters');
    world.viewWidth = 800;
    world.viewHeight = 600;
    world.frameCount = 1;
  });

  it('applies river scenario', () => {
    expect(world.scenarioOverride).toBe('river');
    expect(world.nestCountOverride).toBe(2);
  });

  it('pre-unlocks warfare techs', () => {
    expect(world.tech.sharpSticks).toBe(true);
    expect(world.tech.battleRoar).toBe(true);
  });

  it('completes research-eagle-eye when researched', () => {
    world.tech.eagleEye = true;
    campaignSystem(world);
    expect(world.campaign?.objectiveStatus.get('research-eagle-eye')).toBe(true);
  });

  it('completes destroy-ambush-nests after 2 nests killed', () => {
    campaignNotifyKilled(world, EntityKind.PredatorNest);
    campaignNotifyKilled(world, EntityKind.PredatorNest);
    campaignSystem(world);
    expect(world.campaign?.objectiveStatus.get('destroy-ambush-nests')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Mission 9: Last Stand
// ---------------------------------------------------------------------------

describe('Mission 9 — Last Stand', () => {
  let world: WorldWithCampaign;

  beforeEach(() => {
    world = setupMission('last-stand');
    world.viewWidth = 800;
    world.viewHeight = 600;
    world.frameCount = 1;
  });

  it('applies island scenario with 0 nests', () => {
    expect(world.scenarioOverride).toBe('island');
    expect(world.nestCountOverride).toBe(0);
  });

  it('pre-unlocks 6 techs from 4 branches', () => {
    expect(world.tech.sharpSticks).toBe(true);
    expect(world.tech.herbalMedicine).toBe(true);
    expect(world.tech.sturdyMud).toBe(true);
    expect(world.tech.fortifiedWalls).toBe(true);
    expect(world.tech.swiftPaws).toBe(true);
    expect(world.tech.cunningTraps).toBe(true);
  });

  it('completes survive-tier-4 at evolution tier 4', () => {
    world.enemyEvolution.tier = 4;
    campaignSystem(world);
    expect(world.campaign?.objectiveStatus.get('survive-tier-4')).toBe(true);
  });

  it('completes build-defenses with 6 walls', () => {
    for (let i = 0; i < 6; i++) addBuilding(world, EntityKind.Wall);
    campaignSystem(world);
    expect(world.campaign?.objectiveStatus.get('build-defenses')).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// Mission 10: Pond's End
// ---------------------------------------------------------------------------

describe("Mission 10 — Pond's End", () => {
  let world: WorldWithCampaign;

  beforeEach(() => {
    world = setupMission('ponds-end');
    world.viewWidth = 800;
    world.viewHeight = 600;
    world.frameCount = 1;
  });

  it('unlocks full tech tree', () => {
    const techKeys = Object.keys(world.tech);
    expect(techKeys.length).toBe(25);
    for (const key of techKeys) {
      expect(world.tech[key as keyof typeof world.tech]).toBe(true);
    }
  });

  it('sets heroMode = true', () => {
    expect(world.heroMode).toBe(true);
  });

  it('applies labyrinth scenario', () => {
    expect(world.scenarioOverride).toBe('labyrinth');
  });

  it('spawns alpha predator', () => {
    const mission = getMission('ponds-end')!;
    expect(mission.worldOverrides?.spawnAlphaPredator).toBe(true);
  });

  it('completes kill-alpha-final when alpha killed', () => {
    campaignNotifyKilled(world, EntityKind.AlphaPredator);
    campaignSystem(world);
    expect(world.campaign?.objectiveStatus.get('kill-alpha-final')).toBe(true);
  });

  it('completes kill-siege-turtles when 2 siege turtles killed', () => {
    campaignNotifyKilled(world, EntityKind.SiegeTurtle);
    campaignNotifyKilled(world, EntityKind.SiegeTurtle);
    campaignSystem(world);
    expect(world.campaign?.objectiveStatus.get('kill-siege-turtles')).toBe(true);
  });

  it('triggers victory when both objectives met', () => {
    campaignNotifyKilled(world, EntityKind.AlphaPredator);
    campaignNotifyKilled(world, EntityKind.SiegeTurtle);
    campaignNotifyKilled(world, EntityKind.SiegeTurtle);
    campaignSystem(world);
    expect(world.campaign?.allObjectivesComplete).toBe(true);

    world.frameCount = (world.campaign?.completedAtFrame ?? 0) + 91;
    campaignSystem(world);
    expect(world.state).toBe('win');
  });
});
