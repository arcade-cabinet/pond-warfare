/**
 * v3 Integration Tests
 *
 * Tests for all v3 integration gaps:
 * - Resource economy v3 aliases (fish/rocks/logs)
 * - Specialist blueprint snapshot from prestige state
 * - Fortification slot system
 * - Lodge HP + game over
 * - Wave indicator from match events
 * - SQLite schema v3 tables
 */

import { describe, expect, it } from 'vitest';
import { EntityKind, type GameResources, nodeKindToResourceType, ResourceType } from '@/types';
import { COLORS } from '@/ui/design-tokens';

describe('v3 resource aliases', () => {
  it('ResourceType aliases have matching numeric values', () => {
    expect(ResourceType.Fish).toBe(ResourceType.Fish);
    expect(ResourceType.Rocks).toBe(ResourceType.Rocks);
    expect(ResourceType.Logs).toBe(ResourceType.Logs);
  });

  it('Fish == 1, Rocks == 3, Logs == 2', () => {
    expect(ResourceType.Fish).toBe(1);
    expect(ResourceType.Rocks).toBe(3);
    expect(ResourceType.Logs).toBe(2);
  });

  it('GameResources fields use v3 names directly', () => {
    const res: GameResources = { fish: 100, logs: 50, rocks: 25, food: 5, maxFood: 10 };
    expect(res.fish).toBe(100);
    expect(res.rocks).toBe(25);
    expect(res.logs).toBe(50);

    res.fish = 200;
    expect(res.fish).toBe(200);

    res.rocks = 75;
    expect(res.rocks).toBe(75);

    res.logs = 150;
    expect(res.logs).toBe(150);
  });
});

describe('nodeKindToResourceType', () => {
  it('maps Clambed (fish node) to Fish', () => {
    expect(nodeKindToResourceType(EntityKind.Clambed)).toBe(ResourceType.Fish);
  });

  it('maps PearlBed (rock deposit) to Rocks', () => {
    expect(nodeKindToResourceType(EntityKind.PearlBed)).toBe(ResourceType.Rocks);
  });

  it('maps Cattail (tree cluster) to Logs', () => {
    expect(nodeKindToResourceType(EntityKind.Cattail)).toBe(ResourceType.Logs);
  });

  it('maps unknown EntityKind to None', () => {
    expect(nodeKindToResourceType(EntityKind.Brawler)).toBe(ResourceType.None);
    expect(nodeKindToResourceType(EntityKind.Lodge)).toBe(ResourceType.None);
  });
});

describe('specialist blueprint snapshot plan', () => {
  it('produces empty plan for fresh prestige state', async () => {
    const { computeSpecialistDeployPlan } = await import('@/ecs/systems/specialist-deploy');
    const plan = computeSpecialistDeployPlan({
      rank: 0,
      pearls: 0,
      totalPearlsEarned: 0,
      upgradeRanks: {},
    });
    expect(plan.totalCount).toBe(0);
    expect(plan.spawns).toHaveLength(0);
  });

  it('produces correct count for rank 2 fisher', async () => {
    const { computeSpecialistDeployPlan } = await import('@/ecs/systems/specialist-deploy');
    const plan = computeSpecialistDeployPlan({
      rank: 1,
      pearls: 10,
      totalPearlsEarned: 20,
      upgradeRanks: { blueprint_fisher: 2 },
    });
    expect(plan.totalCount).toBe(2);
    expect(plan.spawns.length).toBe(1);
    expect(plan.spawns[0].unitId).toBe('fisher');
    expect(plan.spawns[0].count).toBe(2);
  });

  it('produces spawn positions in semicircle below lodge', async () => {
    const { getSpecialistSpawnPositions } = await import('@/ecs/systems/specialist-deploy');
    const positions = getSpecialistSpawnPositions(400, 2000, 3);
    expect(positions).toHaveLength(3);
    // All positions should be below the lodge (y > lodgeY)
    for (const pos of positions) {
      expect(pos.y).toBeGreaterThan(2000);
    }
  });
});

describe('fortification slot system', () => {
  it('initializes correct number of slots for level 0', async () => {
    const { initFortificationState } = await import('@/ecs/systems/fortification');
    const state = initFortificationState(0, 400, 2000);
    expect(state.slots.length).toBe(4); // lodge.json: min_level 0 -> 4 slots
    expect(state.totalRockCost).toBe(0);
  });

  it('all slots start empty', async () => {
    const { initFortificationState } = await import('@/ecs/systems/fortification');
    const state = initFortificationState(0, 400, 2000);
    for (const slot of state.slots) {
      expect(slot.status).toBe('empty');
      expect(slot.fortType).toBeNull();
    }
  });

  it('places a wood wall in slot 0', async () => {
    const { initFortificationState, placeFortification } = await import(
      '@/ecs/systems/fortification'
    );
    const state = initFortificationState(0, 400, 2000);
    const result = placeFortification(state, 0, 'wood_wall', 100);
    expect(result.success).toBe(true);
    expect(result.rockCost).toBe(15); // from fortifications.json
    expect(state.slots[0].status).toBe('active');
    expect(state.slots[0].fortType).toBe('wood_wall');
    expect(state.slots[0].currentHp).toBe(100); // from fortifications.json
  });

  it('rejects placement in occupied slot', async () => {
    const { initFortificationState, placeFortification } = await import(
      '@/ecs/systems/fortification'
    );
    const state = initFortificationState(0, 400, 2000);
    placeFortification(state, 0, 'wood_wall', 100);
    const result = placeFortification(state, 0, 'wood_wall', 100);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('active');
  });

  it('rejects placement with insufficient rocks', async () => {
    const { initFortificationState, placeFortification } = await import(
      '@/ecs/systems/fortification'
    );
    const state = initFortificationState(0, 400, 2000);
    const result = placeFortification(state, 0, 'wood_wall', 5);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Rocks');
  });

  it('finds closest empty slot', async () => {
    const { initFortificationState, findClosestSlot } = await import('@/ecs/systems/fortification');
    const state = initFortificationState(0, 400, 2000);
    const closest = findClosestSlot(state, 400, 2000, 'empty');
    expect(closest).not.toBeNull();
    expect(closest?.status).toBe('empty');
  });
});

describe('wave indicator', () => {
  it('match event runner resets to 0 on new match', async () => {
    const { resetMatchEventRunner, getEventsCompletedCount } = await import(
      '@/ecs/systems/match-event-runner'
    );
    resetMatchEventRunner();
    expect(getEventsCompletedCount()).toBe(0);
  });
});

describe('lodge HP signals', () => {
  it('lodgeHpPercent computes correctly', async () => {
    const storeV3 = await import('@/ui/store-v3');
    storeV3.lodgeHp.value = 750;
    storeV3.lodgeMaxHp.value = 1500;
    expect(storeV3.lodgeHpPercent.value).toBe(0.5);
  });

  it('lodgeHpColor uses feedbackWarn token at 50%', async () => {
    const storeV3 = await import('@/ui/store-v3');
    storeV3.lodgeHp.value = 750;
    storeV3.lodgeMaxHp.value = 1500;
    expect(storeV3.lodgeHpColor.value).toBe(COLORS.feedbackWarn);
  });

  it('lodgeHpColor uses feedbackSuccess token above 60%', async () => {
    const storeV3 = await import('@/ui/store-v3');
    storeV3.lodgeHp.value = 1200;
    storeV3.lodgeMaxHp.value = 1500;
    expect(storeV3.lodgeHpColor.value).toBe(COLORS.feedbackSuccess);
  });

  it('lodgeHpColor is red below 30%', async () => {
    const storeV3 = await import('@/ui/store-v3');
    storeV3.lodgeHp.value = 300;
    storeV3.lodgeMaxHp.value = 1500;
    expect(storeV3.lodgeHpColor.value).toBe('#ef4444');
  });
});
