/**
 * Campaign Mission Integration Tests — Missions 4-5
 *
 * Verifies overrides, objectives, starting techs, and victory
 * conditions for the late-game campaign missions.
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';
import { campaignNotifyKilled, campaignSystem } from '@/campaign/campaign-system';
import { getMission } from '@/campaign/missions';
import { EntityKind } from '@/types';
import { setupMission, type WorldWithCampaign } from './campaign-helpers';

vi.mock('@/storage', () => ({
  isDatabaseReady: vi.fn().mockReturnValue(false),
  persist: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('@capacitor-community/sqlite', () => ({
  CapacitorSQLite: {},
  SQLiteConnection: vi.fn(),
}));

// ---------------------------------------------------------------------------
// Mission 4: Evolution
// ---------------------------------------------------------------------------

describe('Mission 4 — Evolution', () => {
  let world: WorldWithCampaign;

  beforeEach(() => {
    world = setupMission('evolution');
    world.viewWidth = 800;
    world.viewHeight = 600;
    world.frameCount = 1;
  });

  it('applies evolutionSpeedMod = 0.33 from worldOverrides', () => {
    // settingsOverrides sets evolutionSpeed: 'fast' (0.5), but
    // worldOverrides overwrites to 0.33 — verify the final value.
    expect(world.evolutionSpeedMod).toBe(0.33);
  });

  it('applies island scenario with 2 nests', () => {
    expect(world.scenarioOverride).toBe('island');
    expect(world.nestCountOverride).toBe(2);
  });

  it('pre-unlocks sharpSticks and herbalMedicine', () => {
    expect(world.tech.sharpSticks).toBe(true);
    expect(world.tech.herbalMedicine).toBe(true);
  });

  it('completes research-swift-paws when researched', () => {
    world.tech.swiftPaws = true;
    campaignSystem(world);
    expect(world.campaign?.objectiveStatus.get('research-swift-paws')).toBe(true);
  });

  it('completes survive-tier-3 at evolution tier 3', () => {
    world.enemyEvolution.tier = 3;
    world.tech.swiftPaws = true;
    campaignSystem(world);
    expect(world.campaign?.objectiveStatus.get('survive-tier-3')).toBe(true);
  });

  it('triggers victory when both objectives met', () => {
    world.tech.swiftPaws = true;
    world.enemyEvolution.tier = 3;
    campaignSystem(world);
    expect(world.campaign?.allObjectivesComplete).toBe(true);

    world.frameCount = (world.campaign?.completedAtFrame ?? 0) + 91;
    campaignSystem(world);
    expect(world.state).toBe('win');
  });
});

// ---------------------------------------------------------------------------
// Mission 5: Alpha Strike
// ---------------------------------------------------------------------------

describe('Mission 5 — Alpha Strike', () => {
  let world: WorldWithCampaign;

  beforeEach(() => {
    world = setupMission('alpha-strike');
    world.viewWidth = 800;
    world.viewHeight = 600;
    world.frameCount = 1;
  });

  it('unlocks full tech tree (all 25 techs)', () => {
    const techKeys = Object.keys(world.tech);
    expect(techKeys.length).toBe(25);
    for (const key of techKeys) {
      expect(world.tech[key as keyof typeof world.tech]).toBe(true);
    }
  });

  it('sets heroMode = true (2x commander HP, 1.5x damage, 1.25x speed)', () => {
    expect(world.heroMode).toBe(true);
  });

  it('sets maxEnemyEvolution (tier 5)', () => {
    expect(world.enemyEvolution.tier).toBe(5);
  });

  it('marks spawnAlphaPredator for entity init', () => {
    const mission = getMission('alpha-strike')!;
    expect(mission.worldOverrides?.spawnAlphaPredator).toBe(true);
    expect(world.campaign?.mission?.worldOverrides?.spawnAlphaPredator).toBe(true);
  });

  it('applies contested scenario with 3 nests', () => {
    expect(world.scenarioOverride).toBe('contested');
    expect(world.nestCountOverride).toBe(3);
  });

  it('applies relentless aggression', () => {
    expect(world.enemyAggressionLevel).toBe('relentless');
  });

  it('completes kill-alpha when alpha predator is killed', () => {
    campaignNotifyKilled(world, EntityKind.AlphaPredator);
    campaignSystem(world);
    expect(world.campaign?.objectiveStatus.get('kill-alpha')).toBe(true);
  });

  it('triggers victory after killing the alpha', () => {
    campaignNotifyKilled(world, EntityKind.AlphaPredator);
    campaignSystem(world);
    expect(world.campaign?.allObjectivesComplete).toBe(true);

    world.frameCount = (world.campaign?.completedAtFrame ?? 0) + 91;
    campaignSystem(world);
    expect(world.state).toBe('win');
  });
});
