// @vitest-environment jsdom
/**
 * Tests: Radial Action Dispatcher (v3.0 -- US9/US10)
 *
 * Validates:
 * - Training actions check resources and Lodge existence
 * - Insufficient resources show error
 * - Unit commands dispatch correctly
 * - Fortify enters building placement mode (v3: fort_wood_wall, Rocks)
 * - Unknown actions return false
 */

import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock bitecs BEFORE any import that uses soa()
vi.mock('bitecs', async () => {
  const actual = await vi.importActual<typeof import('bitecs')>('bitecs');
  return {
    ...actual,
    query: vi.fn().mockReturnValue([]),
    hasComponent: vi.fn().mockReturnValue(false),
  };
});

// Mock the game module
vi.mock('@/game', () => ({
  game: {
    world: {
      resources: { fish: 500, twigs: 200, pearls: 100, food: 0, maxFood: 0 },
      frameCount: 100,
      placingBuilding: null as string | null,
      attackMoveMode: false,
      selection: [] as number[],
      ecs: {},
      yukaManager: { removeUnit: vi.fn(), clearFormationBehaviors: vi.fn() },
      fortifications: null,
      specialistAssignments: new Map(),
      pendingSpecialistAssignment: null as { eid: number; mode: 'single_zone' | 'dual_zone' } | null,
    },
    syncUIStore: vi.fn(),
  },
}));

// Mock audio
vi.mock('@/audio/audio-system', () => ({
  audio: {
    click: vi.fn(),
    error: vi.fn(),
  },
}));

// Mock game events
vi.mock('@/ui/game-events', () => ({
  pushGameEvent: vi.fn(),
}));

// Mock fortification system (since initFortificationState needs lodge-renderer)
vi.mock('@/ecs/systems/fortification', () => ({
  initFortificationState: vi.fn().mockReturnValue({
    slots: [
      {
        index: 0,
        worldX: 100,
        worldY: 100,
        ring: 0,
        status: 'empty',
        fortType: null,
        currentHp: 0,
        maxHp: 0,
        damage: 0,
        range: 0,
        lastAttackFrame: 0,
      },
    ],
    totalRockCost: 0,
  }),
  findClosestSlot: vi.fn(),
  placeFortification: vi.fn(),
}));

// Mock store-v3
vi.mock('@/ui/store-v3', () => ({
  progressionLevel: { value: 0 },
}));

import { audio } from '@/audio/audio-system';
import { game } from '@/game';
import { pushGameEvent } from '@/ui/game-events';
import { dispatchRadialAction } from '@/ui/radial-actions';
import { radialMenuTargetEntityId } from '@/ui/store-radial';

beforeEach(() => {
  vi.clearAllMocks();
  game.world.resources.fish = 500;
  game.world.resources.logs = 200;
  game.world.resources.rocks = 100;
  game.world.placingBuilding = null;
  game.world.attackMoveMode = false;
  game.world.selection = [];
  game.world.fortifications = null;
  game.world.specialistAssignments = new Map();
  game.world.pendingSpecialistAssignment = null;
  radialMenuTargetEntityId.value = -1;
});

describe('dispatchRadialAction -- training', () => {
  it('returns false when Lodge not found (no buildings in query)', () => {
    // query returns [] -- no lodge entity found
    const result = dispatchRadialAction('train_mudpaw');
    expect(result).toBe(false);
  });

  it('does not deduct resources when Lodge not found', () => {
    const initialClams = game.world.resources.fish;
    dispatchRadialAction('train_mudpaw');
    // Resources should NOT be deducted because Lodge isn't found
    expect(game.world.resources.fish).toBe(initialClams);
  });

  it('returns false and shows error for insufficient resources', () => {
    game.world.resources.fish = 0;
    const result = dispatchRadialAction('train_mudpaw');
    expect(result).toBe(false);
    expect(audio.error).toHaveBeenCalled();
    expect(pushGameEvent).toHaveBeenCalledWith('Not enough Fish!', '#f87171', 100);
  });

  it('returns false for unknown train action ID', () => {
    const result = dispatchRadialAction('train_dragon');
    expect(result).toBe(false);
  });
});

describe('dispatchRadialAction -- fortify', () => {
  it('enters fort placement mode when Rocks available', () => {
    game.world.resources.rocks = 100; // Rocks mapped to pearls
    const result = dispatchRadialAction('fortify');
    expect(result).toBe(true);
    expect(game.world.placingBuilding).toBe('fort_wood_wall');
    expect(audio.click).toHaveBeenCalled();
  });

  it('fails when not enough Rocks (pearls internally)', () => {
    game.world.resources.rocks = 0;
    const result = dispatchRadialAction('fortify');
    expect(result).toBe(false);
    expect(audio.error).toHaveBeenCalled();
    expect(pushGameEvent).toHaveBeenCalledWith('Not enough Rocks!', '#f87171', 100);
  });
});

describe('dispatchRadialAction -- repair', () => {
  it('fails when Lodge not found', () => {
    const result = dispatchRadialAction('repair');
    expect(result).toBe(false);
  });
});

describe('dispatchRadialAction -- unit commands', () => {
  it('cmd_hold returns true (halts selected)', () => {
    const result = dispatchRadialAction('cmd_hold');
    expect(result).toBe(true);
  });

  it('cmd_amove activates attack move mode', () => {
    const result = dispatchRadialAction('cmd_amove');
    expect(result).toBe(true);
    expect(game.world.attackMoveMode).toBe(true);
  });

  it('cmd_gather shows tap target message', () => {
    const result = dispatchRadialAction('cmd_gather');
    expect(result).toBe(true);
    expect(pushGameEvent).toHaveBeenCalledWith('Tap resource node...', '#38bdf8', 100);
  });

  it('cmd_attack shows tap target message', () => {
    const result = dispatchRadialAction('cmd_attack');
    expect(result).toBe(true);
    expect(pushGameEvent).toHaveBeenCalledWith('Tap enemy...', '#38bdf8', 100);
  });

  it('cmd_heal shows tap target message', () => {
    const result = dispatchRadialAction('cmd_heal');
    expect(result).toBe(true);
    expect(pushGameEvent).toHaveBeenCalledWith('Tap wounded ally...', '#38bdf8', 100);
  });

  it('cmd_scout shows tap target message', () => {
    const result = dispatchRadialAction('cmd_scout');
    expect(result).toBe(true);
    expect(pushGameEvent).toHaveBeenCalledWith('Tap terrain to recon...', '#38bdf8', 100);
  });

  it('cmd_move shows tap target message', () => {
    const result = dispatchRadialAction('cmd_move');
    expect(result).toBe(true);
    expect(pushGameEvent).toHaveBeenCalledWith('Tap terrain to move...', '#38bdf8', 100);
  });

  it('cmd_return returns true (even if no Lodge)', () => {
    const result = dispatchRadialAction('cmd_return');
    expect(result).toBe(true);
  });

  it('cmd_assign_area starts pending specialist assignment for the radial target', () => {
    radialMenuTargetEntityId.value = 91;
    game.world.specialistAssignments.set(91, {
      runtimeId: 'fisher',
      canonicalId: 'fisher',
      label: 'Fisher',
      mode: 'single_zone',
      operatingRadius: 160,
      centerX: 0,
      centerY: 0,
      anchorX: 0,
      anchorY: 0,
      anchorRadius: 0,
      engagementRadius: 0,
      engagementX: 0,
      engagementY: 0,
      projectionRange: 0,
    });

    const result = dispatchRadialAction('cmd_assign_area');

    expect(result).toBe(true);
    expect(game.world.pendingSpecialistAssignment).toEqual({ eid: 91, mode: 'single_zone' });
    expect(pushGameEvent).toHaveBeenCalledWith('Tap terrain to set operating area', '#38bdf8', 100);
  });
});

describe('dispatchRadialAction -- unknown action', () => {
  it('returns false for completely unknown action', () => {
    const result = dispatchRadialAction('do_something_weird');
    expect(result).toBe(false);
  });

  it('returns false for unknown cmd_ prefix action', () => {
    const result = dispatchRadialAction('cmd_dance');
    expect(result).toBe(false);
  });
});
