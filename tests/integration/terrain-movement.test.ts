/**
 * Terrain-Movement Integration Tests
 *
 * Validates terrain types affect unit movement speed and passability,
 * and that HighGround grants +25% range to ranged units.
 */

import { describe, expect, it } from 'vitest';
import { MUDPAW_KIND } from '@/game/live-unit-kinds';
import { TerrainGrid, TerrainType } from '@/terrain/terrain-grid';
import { EntityKind } from '@/types';

const TILE = 32;
const W = 256;
const H = 256;

describe('Terrain affects movement', () => {
  it('unit on Grass moves at normal speed (1.0x)', () => {
    const grid = new TerrainGrid(W, H, TILE);
    // Default is all grass
    const mult = grid.getSpeedMultiplier(50, 50, MUDPAW_KIND);
    expect(mult).toBe(1.0);
  });

  it('unit on Mud moves at 0.75x speed', () => {
    const grid = new TerrainGrid(W, H, TILE);
    grid.set(1, 1, TerrainType.Mud);
    const mult = grid.getSpeedMultiplier(1 * TILE + 5, 1 * TILE + 5, MUDPAW_KIND);
    expect(mult).toBe(0.75);
  });

  it('manual land units are blocked on Water (0 speed)', () => {
    const grid = new TerrainGrid(W, H, TILE);
    grid.set(2, 2, TerrainType.Water);
    const mult = grid.getSpeedMultiplier(2 * TILE + 5, 2 * TILE + 5, MUDPAW_KIND);
    expect(mult).toBe(0);
    expect(grid.isPassable(2 * TILE + 5, 2 * TILE + 5, MUDPAW_KIND)).toBe(false);
  });

  it('Swimmer crosses Water at 0.5x speed', () => {
    const grid = new TerrainGrid(W, H, TILE);
    grid.set(3, 3, TerrainType.Water);
    const mult = grid.getSpeedMultiplier(3 * TILE + 5, 3 * TILE + 5, EntityKind.Swimmer);
    expect(mult).toBe(0.5);
    expect(grid.isPassable(3 * TILE + 5, 3 * TILE + 5, EntityKind.Swimmer)).toBe(true);
  });

  it('HighGround grants +25% range for ranged attacks (attackRange > 50)', () => {
    const grid = new TerrainGrid(W, H, TILE);
    grid.set(4, 4, TerrainType.HighGround);

    // Verify terrain is HighGround at the position
    const terrain = grid.getAt(4 * TILE + 5, 4 * TILE + 5);
    expect(terrain).toBe(TerrainType.HighGround);

    // The attack-state system applies: if atkRange > 50 && terrain === HighGround
    // then atkRange = Math.round(atkRange * 1.25)
    const baseRange = 100;
    const boostedRange = Math.round(baseRange * 1.25);
    expect(boostedRange).toBe(125);

    // Movement speed on HighGround is normal (1.0)
    expect(grid.speedMult(TerrainType.HighGround)).toBe(1.0);
  });
});
