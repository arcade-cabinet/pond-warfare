/**
 * Fortification Slot System Tests (v3.0 — US7)
 *
 * Validates fort slot placement, Rock cost deduction,
 * fortification HP, tower attack cooldowns, and wall blocking.
 */

import { describe, expect, it } from 'vitest';
import { getFortDef, getFortificationsConfig } from '@/config/config-loader';
import {
  canTowerAttack,
  countActiveForts,
  damageFortification,
  type FortificationState,
  findClosestSlot,
  getActiveTowers,
  getBlockingForts,
  getEmptySlots,
  initFortificationState,
  placeFortification,
  recordTowerAttack,
} from '@/ecs/systems/fortification';

// ── Helper ────────────────────────────────────────────────────────

function makeState(level = 0): FortificationState {
  return initFortificationState(level, 500, 900);
}

// ── Initialization tests ──────────────────────────────────────────

describe('Fortification state initialization', () => {
  it('should create 4 slots at progression level 0', () => {
    const state = makeState(0);
    expect(state.slots).toHaveLength(4);
    expect(state.totalRockCost).toBe(0);
  });

  it('should create 8 slots at progression level 10', () => {
    const state = makeState(10);
    expect(state.slots).toHaveLength(8);
  });

  it('should create 12 slots at progression level 30', () => {
    const state = makeState(30);
    expect(state.slots).toHaveLength(12);
  });

  it('all slots start empty', () => {
    const state = makeState(10);
    for (const slot of state.slots) {
      expect(slot.status).toBe('empty');
      expect(slot.fortType).toBeNull();
      expect(slot.currentHp).toBe(0);
      expect(slot.maxHp).toBe(0);
    }
  });

  it('slots have world positions offset from Lodge', () => {
    const lodgeX = 500;
    const lodgeY = 900;
    const state = initFortificationState(0, lodgeX, lodgeY);

    for (const slot of state.slots) {
      // Slots should be near Lodge but not exactly at Lodge position
      const dx = Math.abs(slot.worldX - lodgeX);
      const dy = Math.abs(slot.worldY - lodgeY);
      const dist = Math.sqrt(dx * dx + dy * dy);
      expect(dist).toBeGreaterThan(20);
      expect(dist).toBeLessThan(120);
    }
  });

  it('slots have sequential indices', () => {
    const state = makeState(10);
    for (let i = 0; i < state.slots.length; i++) {
      expect(state.slots[i].index).toBe(i);
    }
  });
});

// ── Placement tests ──────────────────────────────────────────────

describe('Fort placement', () => {
  it('should place a wood wall in an empty slot', () => {
    const state = makeState(0);
    const result = placeFortification(state, 0, 'wood_wall', 100);

    expect(result.success).toBe(true);
    expect(result.rockCost).toBe(15);
    expect(result.slot).toBeDefined();
    expect(state.slots[0].status).toBe('active');
    expect(state.slots[0].fortType).toBe('wood_wall');
    expect(state.slots[0].currentHp).toBe(100); // from config
    expect(state.slots[0].maxHp).toBe(100);
  });

  it('should place a watchtower with damage and range', () => {
    const state = makeState(0);
    const result = placeFortification(state, 1, 'watchtower', 100);

    expect(result.success).toBe(true);
    expect(state.slots[1].damage).toBe(5);
    expect(state.slots[1].range).toBe(200);
  });

  it('should fail when slot already occupied', () => {
    const state = makeState(0);
    placeFortification(state, 0, 'wood_wall', 100);
    const result = placeFortification(state, 0, 'stone_wall', 100);

    expect(result.success).toBe(false);
    expect(result.reason).toContain('active');
  });

  it('should fail when not enough Rocks', () => {
    const state = makeState(0);
    const result = placeFortification(state, 0, 'stone_wall', 10); // stone_wall costs 40

    expect(result.success).toBe(false);
    expect(result.reason).toContain('Need');
    expect(result.reason).toContain('40');
  });

  it('should fail for invalid slot index', () => {
    const state = makeState(0);
    expect(placeFortification(state, -1, 'wood_wall', 100).success).toBe(false);
    expect(placeFortification(state, 99, 'wood_wall', 100).success).toBe(false);
  });

  it('should fail for unknown fort type', () => {
    const state = makeState(0);
    const result = placeFortification(state, 0, 'plasma_cannon', 100);
    expect(result.success).toBe(false);
    expect(result.reason).toContain('Unknown');
  });

  it('should accumulate total rock cost', () => {
    const state = makeState(0);
    placeFortification(state, 0, 'wood_wall', 100); // 15 rocks
    placeFortification(state, 1, 'watchtower', 100); // 30 rocks

    expect(state.totalRockCost).toBe(45);
  });

  it('should place all four fort types from config', () => {
    const state = makeState(10); // 8 slots
    const config = getFortificationsConfig();
    const types = Object.keys(config.types);

    for (let i = 0; i < types.length; i++) {
      const result = placeFortification(state, i, types[i], 1000);
      expect(result.success, `placing ${types[i]}`).toBe(true);
    }
  });
});

// ── Damage tests ──────────────────────────────────────────────────

describe('Fort damage', () => {
  it('should reduce HP when damaged', () => {
    const state = makeState(0);
    placeFortification(state, 0, 'wood_wall', 100);

    const applied = damageFortification(state, 0, 30);
    expect(applied).toBe(30);
    expect(state.slots[0].currentHp).toBe(70);
  });

  it('should destroy fort when HP reaches 0', () => {
    const state = makeState(0);
    placeFortification(state, 0, 'wood_wall', 100);

    damageFortification(state, 0, 100);
    expect(state.slots[0].status).toBe('destroyed');
    expect(state.slots[0].currentHp).toBe(0);
  });

  it('should cap damage at remaining HP', () => {
    const state = makeState(0);
    placeFortification(state, 0, 'wood_wall', 100);

    const applied = damageFortification(state, 0, 999);
    expect(applied).toBe(100);
    expect(state.slots[0].currentHp).toBe(0);
    expect(state.slots[0].status).toBe('destroyed');
  });

  it('should not damage empty slots', () => {
    const state = makeState(0);
    expect(damageFortification(state, 0, 50)).toBe(0);
  });

  it('should not damage destroyed forts', () => {
    const state = makeState(0);
    placeFortification(state, 0, 'wood_wall', 100);
    damageFortification(state, 0, 100);
    expect(damageFortification(state, 0, 50)).toBe(0);
  });

  it('should return 0 for invalid slot index', () => {
    const state = makeState(0);
    expect(damageFortification(state, -1, 50)).toBe(0);
    expect(damageFortification(state, 99, 50)).toBe(0);
  });
});

// ── Tower attack tests ────────────────────────────────────────────

describe('Tower attacks', () => {
  it('towers can attack when cooldown is ready', () => {
    const state = makeState(0);
    placeFortification(state, 0, 'watchtower', 100);

    expect(canTowerAttack(state.slots[0], 100)).toBe(true);
  });

  it('towers cannot attack during cooldown', () => {
    const state = makeState(0);
    placeFortification(state, 0, 'watchtower', 100);

    recordTowerAttack(state.slots[0], 100);
    expect(canTowerAttack(state.slots[0], 100)).toBe(false);
    expect(canTowerAttack(state.slots[0], 150)).toBe(false);
    // Cooldown is 90 frames
    expect(canTowerAttack(state.slots[0], 190)).toBe(true);
  });

  it('walls cannot attack', () => {
    const state = makeState(0);
    placeFortification(state, 0, 'wood_wall', 100);

    expect(canTowerAttack(state.slots[0], 100)).toBe(false);
  });

  it('destroyed towers cannot attack', () => {
    const state = makeState(0);
    placeFortification(state, 0, 'watchtower', 100);
    damageFortification(state, 0, 150);

    expect(canTowerAttack(state.slots[0], 100)).toBe(false);
  });
});

// ── Query tests ──────────────────────────────────────────────────

describe('Fortification queries', () => {
  function makePopulatedState(): FortificationState {
    const state = makeState(10); // 8 slots
    placeFortification(state, 0, 'wood_wall', 1000);
    placeFortification(state, 1, 'stone_wall', 1000);
    placeFortification(state, 2, 'watchtower', 1000);
    placeFortification(state, 3, 'siege_tower', 1000);
    // slots 4-7 remain empty
    return state;
  }

  it('getBlockingForts returns walls only', () => {
    const state = makePopulatedState();
    const blocking = getBlockingForts(state);

    expect(blocking.length).toBe(2); // wood_wall + stone_wall
    for (const fort of blocking) {
      expect(['wood_wall', 'stone_wall']).toContain(fort.fortType);
    }
  });

  it('getActiveTowers returns towers only', () => {
    const state = makePopulatedState();
    const towers = getActiveTowers(state);

    expect(towers.length).toBe(2); // watchtower + siege_tower
    for (const tower of towers) {
      expect(tower.damage).toBeGreaterThan(0);
    }
  });

  it('getEmptySlots returns unoccupied slots', () => {
    const state = makePopulatedState();
    const empty = getEmptySlots(state);

    expect(empty.length).toBe(4); // 8 total - 4 placed
  });

  it('countActiveForts returns type counts', () => {
    const state = makePopulatedState();
    const counts = countActiveForts(state);

    expect(counts.wood_wall).toBe(1);
    expect(counts.stone_wall).toBe(1);
    expect(counts.watchtower).toBe(1);
    expect(counts.siege_tower).toBe(1);
  });

  it('findClosestSlot returns nearest slot', () => {
    const state = makeState(0);
    // Slot 0 is at some position
    const slot0X = state.slots[0].worldX;
    const slot0Y = state.slots[0].worldY;

    const closest = findClosestSlot(state, slot0X, slot0Y);
    expect(closest).not.toBeNull();
    expect(closest!.index).toBe(0);
  });

  it('findClosestSlot with status filter', () => {
    const state = makePopulatedState();
    // Find closest empty slot
    const empty = findClosestSlot(state, 500, 900, 'empty');
    expect(empty).not.toBeNull();
    expect(empty!.status).toBe('empty');
  });

  it('findClosestSlot returns null when no match', () => {
    const state = makeState(0);
    // Fill all slots
    for (let i = 0; i < state.slots.length; i++) {
      placeFortification(state, i, 'wood_wall', 1000);
    }
    const empty = findClosestSlot(state, 500, 900, 'empty');
    expect(empty).toBeNull();
  });
});

// ── Config integration tests ──────────────────────────────────────

describe('Fortification config integration', () => {
  it('all fort types have positive HP', () => {
    const config = getFortificationsConfig();
    for (const [id, def] of Object.entries(config.types)) {
      expect(def.hp, `${id} HP`).toBeGreaterThan(0);
    }
  });

  it('all fort types have rock costs', () => {
    const config = getFortificationsConfig();
    for (const [id, def] of Object.entries(config.types)) {
      expect(def.cost.rocks, `${id} rock cost`).toBeGreaterThan(0);
    }
  });

  it('towers have damage and range', () => {
    const watchtower = getFortDef('watchtower');
    expect(watchtower.damage).toBeGreaterThan(0);
    expect(watchtower.range).toBeGreaterThan(0);

    const siege = getFortDef('siege_tower');
    expect(siege.damage).toBeGreaterThan(0);
    expect(siege.range).toBeGreaterThan(0);
  });

  it('walls block movement', () => {
    const woodWall = getFortDef('wood_wall');
    const stoneWall = getFortDef('stone_wall');

    expect(woodWall.blocks_movement).toBe(true);
    expect(stoneWall.blocks_movement).toBe(true);
  });

  it('stone wall is tougher than wood wall', () => {
    const wood = getFortDef('wood_wall');
    const stone = getFortDef('stone_wall');

    expect(stone.hp).toBeGreaterThan(wood.hp);
    expect(stone.cost.rocks!).toBeGreaterThan(wood.cost.rocks!);
  });
});
