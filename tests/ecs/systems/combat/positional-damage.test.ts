/**
 * Positional Damage Subsystem Tests
 *
 * Validates flanking and elevation bonuses calculated by
 * calculatePositionalBonuses(). Tests the pure calculation
 * function directly (no system loop needed).
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { Position, Sprite } from '@/ecs/components';
import {
  calculatePositionalBonuses,
  emitPositionalBonusText,
} from '@/ecs/systems/combat/positional-damage';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { TerrainType } from '@/terrain/terrain-grid';

/** Helper: create an entity with position and sprite facing. */
function spawn(world: GameWorld, x: number, y: number, facingLeft: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Sprite);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Sprite.facingLeft[eid] = facingLeft;
  Sprite.height[eid] = 32;
  return eid;
}

/** Helper: create a position-only entity (no Sprite component). */
function spawnNoSprite(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  Position.x[eid] = x;
  Position.y[eid] = y;
  return eid;
}

describe('calculatePositionalBonuses', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  describe('flanking', () => {
    it('detects flank when attacker is directly behind a right-facing target', () => {
      const target = spawn(world, 200, 200, 0); // facing right
      const attacker = spawn(world, 100, 200, 0); // directly behind

      const b = calculatePositionalBonuses(world, attacker, target);
      expect(b.flanking).toBe(true);
      expect(b.multiplier).toBeCloseTo(1.25, 2);
    });

    it('detects flank when attacker is directly behind a left-facing target', () => {
      const target = spawn(world, 200, 200, 1); // facing left
      const attacker = spawn(world, 300, 200, 0); // directly behind

      const b = calculatePositionalBonuses(world, attacker, target);
      expect(b.flanking).toBe(true);
      expect(b.multiplier).toBeCloseTo(1.25, 2);
    });

    it('does NOT flank when attacker is directly in front', () => {
      const target = spawn(world, 200, 200, 0); // facing right
      const attacker = spawn(world, 300, 200, 0); // in front

      const b = calculatePositionalBonuses(world, attacker, target);
      expect(b.flanking).toBe(false);
      expect(b.multiplier).toBeCloseTo(1.0, 2);
    });

    it('does NOT flank when attacker is at 90 degrees (side)', () => {
      const target = spawn(world, 200, 200, 0); // facing right
      const attacker = spawn(world, 200, 100, 0); // directly above = 90 deg

      const b = calculatePositionalBonuses(world, attacker, target);
      expect(b.flanking).toBe(false);
    });

    it('skips flanking check when target has no Sprite component', () => {
      const target = spawnNoSprite(world, 200, 200);
      const attacker = spawn(world, 100, 200, 0); // behind

      const b = calculatePositionalBonuses(world, attacker, target);
      expect(b.flanking).toBe(false);
      expect(b.multiplier).toBeCloseTo(1.0, 2);
    });

    it('detects flank from behind-left diagonal on a right-facing target', () => {
      // Attacker at ~150 degrees from facing direction (> 120 threshold)
      const target = spawn(world, 200, 200, 0); // facing right
      // Place attacker behind and slightly up-left
      const attacker = spawn(world, 100, 100, 0);

      const b = calculatePositionalBonuses(world, attacker, target);
      expect(b.flanking).toBe(true);
    });
  });

  describe('elevation', () => {
    it('gives +15% bonus when attacker is on high ground and target is not', () => {
      const target = spawn(world, 200, 200, 0);
      const attacker = spawn(world, 300, 200, 0); // in front, no flanking

      // Place attacker on high ground
      const col = world.terrainGrid.worldToCol(300);
      const row = world.terrainGrid.worldToRow(200);
      world.terrainGrid.set(col, row, TerrainType.HighGround);

      const b = calculatePositionalBonuses(world, attacker, target);
      expect(b.elevationUp).toBe(true);
      expect(b.elevationDown).toBe(false);
      expect(b.multiplier).toBeCloseTo(1.15, 2);
    });

    it('gives -10% penalty when target is on high ground and attacker is not', () => {
      const target = spawn(world, 200, 200, 0);
      const attacker = spawn(world, 300, 200, 0); // in front, no flanking

      const col = world.terrainGrid.worldToCol(200);
      const row = world.terrainGrid.worldToRow(200);
      world.terrainGrid.set(col, row, TerrainType.HighGround);

      const b = calculatePositionalBonuses(world, attacker, target);
      expect(b.elevationDown).toBe(true);
      expect(b.elevationUp).toBe(false);
      expect(b.multiplier).toBeCloseTo(0.9, 2);
    });

    it('gives no elevation bonus when both are on same level', () => {
      const target = spawn(world, 200, 200, 0);
      const attacker = spawn(world, 300, 200, 0);

      const b = calculatePositionalBonuses(world, attacker, target);
      expect(b.elevationUp).toBe(false);
      expect(b.elevationDown).toBe(false);
      expect(b.multiplier).toBeCloseTo(1.0, 2);
    });

    it('gives no elevation bonus when both are on high ground', () => {
      const target = spawn(world, 200, 200, 0);
      const attacker = spawn(world, 300, 200, 0);

      // Both on high ground
      const col1 = world.terrainGrid.worldToCol(200);
      const row1 = world.terrainGrid.worldToRow(200);
      world.terrainGrid.set(col1, row1, TerrainType.HighGround);
      const col2 = world.terrainGrid.worldToCol(300);
      const row2 = world.terrainGrid.worldToRow(200);
      world.terrainGrid.set(col2, row2, TerrainType.HighGround);

      const b = calculatePositionalBonuses(world, attacker, target);
      expect(b.elevationUp).toBe(false);
      expect(b.elevationDown).toBe(false);
      expect(b.multiplier).toBeCloseTo(1.0, 2);
    });
  });

  describe('combined bonuses', () => {
    it('stacks flanking + elevation for +40% total', () => {
      const target = spawn(world, 200, 200, 0); // facing right
      const attacker = spawn(world, 100, 200, 0); // behind = flanking

      // Attacker on high ground
      const col = world.terrainGrid.worldToCol(100);
      const row = world.terrainGrid.worldToRow(200);
      world.terrainGrid.set(col, row, TerrainType.HighGround);

      const b = calculatePositionalBonuses(world, attacker, target);
      expect(b.flanking).toBe(true);
      expect(b.elevationUp).toBe(true);
      // 1.0 + 0.25 (flank) + 0.15 (elevation) = 1.40
      expect(b.multiplier).toBeCloseTo(1.4, 2);
    });

    it('flanking with uphill penalty yields +15% net', () => {
      const target = spawn(world, 200, 200, 0); // facing right
      const attacker = spawn(world, 100, 200, 0); // behind = flanking

      // Target on high ground (attacker attacking uphill)
      const col = world.terrainGrid.worldToCol(200);
      const row = world.terrainGrid.worldToRow(200);
      world.terrainGrid.set(col, row, TerrainType.HighGround);

      const b = calculatePositionalBonuses(world, attacker, target);
      expect(b.flanking).toBe(true);
      expect(b.elevationDown).toBe(true);
      // 1.0 + 0.25 (flank) - 0.10 (uphill) = 1.15
      expect(b.multiplier).toBeCloseTo(1.15, 2);
    });
  });

  describe('edge cases', () => {
    it('returns neutral bonuses when attacker has no Position', () => {
      const target = spawn(world, 200, 200, 0);
      const attackerNoPos = addEntity(world.ecs);

      const b = calculatePositionalBonuses(world, attackerNoPos, target);
      expect(b.multiplier).toBe(1.0);
      expect(b.flanking).toBe(false);
    });

    it('returns neutral bonuses when target has no Position', () => {
      const attacker = spawn(world, 100, 200, 0);
      const targetNoPos = addEntity(world.ecs);

      const b = calculatePositionalBonuses(world, attacker, targetNoPos);
      expect(b.multiplier).toBe(1.0);
      expect(b.flanking).toBe(false);
    });
  });

  describe('emitPositionalBonusText', () => {
    it('emits FLANKED floating text', () => {
      const target = spawn(world, 200, 200, 0);
      const bonuses = {
        multiplier: 1.25,
        flanking: true,
        elevationUp: false,
        elevationDown: false,
      };

      emitPositionalBonusText(world, target, bonuses);

      expect(world.floatingTexts).toHaveLength(1);
      expect(world.floatingTexts[0].text).toBe('FLANKED!');
      expect(world.floatingTexts[0].color).toBe('#f59e0b');
    });

    it('emits HIGH GROUND floating text', () => {
      const target = spawn(world, 200, 200, 0);
      const bonuses = {
        multiplier: 1.15,
        flanking: false,
        elevationUp: true,
        elevationDown: false,
      };

      emitPositionalBonusText(world, target, bonuses);

      expect(world.floatingTexts).toHaveLength(1);
      expect(world.floatingTexts[0].text).toBe('HIGH GROUND!');
      expect(world.floatingTexts[0].color).toBe('#3b82f6');
    });

    it('emits both texts when flanking + elevation', () => {
      const target = spawn(world, 200, 200, 0);
      const bonuses = { multiplier: 1.4, flanking: true, elevationUp: true, elevationDown: false };

      emitPositionalBonusText(world, target, bonuses);

      expect(world.floatingTexts).toHaveLength(2);
      const texts = world.floatingTexts.map((t) => t.text);
      expect(texts).toContain('FLANKED!');
      expect(texts).toContain('HIGH GROUND!');
    });

    it('emits nothing when no bonuses', () => {
      const target = spawn(world, 200, 200, 0);
      const bonuses = {
        multiplier: 1.0,
        flanking: false,
        elevationUp: false,
        elevationDown: false,
      };

      emitPositionalBonusText(world, target, bonuses);

      expect(world.floatingTexts).toHaveLength(0);
    });

    it('does nothing when target has no Position', () => {
      const targetNoPos = addEntity(world.ecs);
      const bonuses = {
        multiplier: 1.25,
        flanking: true,
        elevationUp: false,
        elevationDown: false,
      };

      emitPositionalBonusText(world, targetNoPos, bonuses);

      expect(world.floatingTexts).toHaveLength(0);
    });
  });
});
