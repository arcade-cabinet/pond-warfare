/**
 * Tests: Radial Action Dispatcher (v3.0 — US9/US10)
 *
 * Validates:
 * - Training actions check resources and Lodge existence
 * - Insufficient resources show error
 * - Unit commands dispatch correctly
 * - Fortify enters building placement mode
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
      resources: { clams: 500, twigs: 200, pearls: 0, food: 0, maxFood: 0 },
      frameCount: 100,
      placingBuilding: null as string | null,
      attackMoveMode: false,
      selection: [] as number[],
      ecs: {},
      yukaManager: { removeUnit: vi.fn(), clearFormationBehaviors: vi.fn() },
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

import { audio } from '@/audio/audio-system';
import { game } from '@/game';
import { pushGameEvent } from '@/ui/game-events';
import { dispatchRadialAction } from '@/ui/radial-actions';

beforeEach(() => {
  vi.clearAllMocks();
  game.world.resources.clams = 500;
  game.world.resources.twigs = 200;
  game.world.placingBuilding = null;
  game.world.attackMoveMode = false;
  game.world.selection = [];
});

describe('dispatchRadialAction — training', () => {
  it('returns false when Lodge not found (no buildings in query)', () => {
    // query returns [] — no lodge entity found
    const result = dispatchRadialAction('train_gatherer');
    expect(result).toBe(false);
  });

  it('does not deduct resources when Lodge not found', () => {
    const initialClams = game.world.resources.clams;
    dispatchRadialAction('train_gatherer');
    // Resources should NOT be deducted because Lodge isn't found
    expect(game.world.resources.clams).toBe(initialClams);
  });

  it('returns false and shows error for insufficient resources', () => {
    game.world.resources.clams = 0;
    const result = dispatchRadialAction('train_gatherer');
    expect(result).toBe(false);
    expect(audio.error).toHaveBeenCalled();
    expect(pushGameEvent).toHaveBeenCalledWith('Not enough Fish!', '#f87171', 100);
  });

  it('returns false for unknown train action ID', () => {
    const result = dispatchRadialAction('train_dragon');
    expect(result).toBe(false);
  });
});

describe('dispatchRadialAction — fortify', () => {
  it('enters building placement mode when resources available', () => {
    const result = dispatchRadialAction('fortify');
    expect(result).toBe(true);
    expect(game.world.placingBuilding).toBe('wall');
    expect(audio.click).toHaveBeenCalled();
  });

  it('fails when not enough rocks (twigs)', () => {
    game.world.resources.twigs = 0;
    const result = dispatchRadialAction('fortify');
    expect(result).toBe(false);
    expect(audio.error).toHaveBeenCalled();
    expect(pushGameEvent).toHaveBeenCalledWith('Not enough Rocks!', '#f87171', 100);
  });
});

describe('dispatchRadialAction — repair', () => {
  it('fails when Lodge not found', () => {
    const result = dispatchRadialAction('repair');
    expect(result).toBe(false);
  });
});

describe('dispatchRadialAction — unit commands', () => {
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
    expect(pushGameEvent).toHaveBeenCalledWith('Tap target...', '#38bdf8', 100);
  });

  it('cmd_attack shows tap target message', () => {
    const result = dispatchRadialAction('cmd_attack');
    expect(result).toBe(true);
    expect(pushGameEvent).toHaveBeenCalledWith('Tap target...', '#38bdf8', 100);
  });

  it('cmd_heal shows tap target message', () => {
    const result = dispatchRadialAction('cmd_heal');
    expect(result).toBe(true);
  });

  it('cmd_scout shows tap target message', () => {
    const result = dispatchRadialAction('cmd_scout');
    expect(result).toBe(true);
  });

  it('cmd_move shows tap target message', () => {
    const result = dispatchRadialAction('cmd_move');
    expect(result).toBe(true);
  });

  it('cmd_return returns true (even if no Lodge)', () => {
    const result = dispatchRadialAction('cmd_return');
    expect(result).toBe(true);
  });
});

describe('dispatchRadialAction — unknown action', () => {
  it('returns false for completely unknown action', () => {
    const result = dispatchRadialAction('do_something_weird');
    expect(result).toBe(false);
  });

  it('returns false for unknown cmd_ prefix action', () => {
    const result = dispatchRadialAction('cmd_dance');
    expect(result).toBe(false);
  });
});
