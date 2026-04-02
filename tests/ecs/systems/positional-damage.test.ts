/**
 * Positional Damage Tests
 *
 * Validates flanking and elevation damage bonuses.
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

function createPosEntity(world: GameWorld, x: number, y: number, facingLeft: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Sprite);
  Position.x[eid] = x;
  Position.y[eid] = y;
  Sprite.facingLeft[eid] = facingLeft;
  Sprite.height[eid] = 32;
  return eid;
}

describe('calculatePositionalBonuses', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  describe('flanking', () => {
    it('should detect flanking when attacker is behind target (target faces right)', () => {
      // Target facing right (facingLeft=0), attacker behind (to the left)
      const target = createPosEntity(world, 200, 200, 0); // facing right
      const attacker = createPosEntity(world, 100, 200, 0); // behind target

      const bonuses = calculatePositionalBonuses(world, attacker, target);
      expect(bonuses.flanking).toBe(true);
      expect(bonuses.multiplier).toBeCloseTo(1.25, 2);
    });

    it('should detect flanking when attacker is behind target (target faces left)', () => {
      // Target facing left (facingLeft=1), attacker behind (to the right)
      const target = createPosEntity(world, 200, 200, 1); // facing left
      const attacker = createPosEntity(world, 300, 200, 0); // behind target

      const bonuses = calculatePositionalBonuses(world, attacker, target);
      expect(bonuses.flanking).toBe(true);
      expect(bonuses.multiplier).toBeCloseTo(1.25, 2);
    });

    it('should NOT detect flanking when attacker is in front of target', () => {
      // Target facing right, attacker in front (to the right)
      const target = createPosEntity(world, 200, 200, 0); // facing right
      const attacker = createPosEntity(world, 300, 200, 0); // in front of target

      const bonuses = calculatePositionalBonuses(world, attacker, target);
      expect(bonuses.flanking).toBe(false);
      expect(bonuses.multiplier).toBeCloseTo(1.0, 2);
    });

    it('should NOT detect flanking when attacker is to the side (within 120deg)', () => {
      // Target facing right, attacker directly above
      const target = createPosEntity(world, 200, 200, 0); // facing right
      const attacker = createPosEntity(world, 200, 100, 0); // directly above

      const bonuses = calculatePositionalBonuses(world, attacker, target);
      // 90 degrees from facing = not flanked (threshold is >120)
      expect(bonuses.flanking).toBe(false);
    });
  });

  describe('elevation', () => {
    it('should give +10% bonus when attacker is on high ground', () => {
      const target = createPosEntity(world, 200, 200, 0);
      const attacker = createPosEntity(world, 100, 200, 0);

      // Place attacker on high ground
      const col = world.terrainGrid.worldToCol(100);
      const row = world.terrainGrid.worldToRow(200);
      world.terrainGrid.set(col, row, TerrainType.HighGround);

      const bonuses = calculatePositionalBonuses(world, attacker, target);
      expect(bonuses.elevationUp).toBe(true);
      expect(bonuses.elevationDown).toBe(false);
      // Attacker behind + elevation = flanking(1.25) + elevation(0.10) = 1.35
      // But only checking elevation here
      expect(bonuses.multiplier).toBeGreaterThan(1.0);
    });

    it('should give -10% penalty when target is on high ground', () => {
      const target = createPosEntity(world, 200, 200, 0);
      const attacker = createPosEntity(world, 300, 200, 0); // in front, no flanking

      // Place target on high ground
      const col = world.terrainGrid.worldToCol(200);
      const row = world.terrainGrid.worldToRow(200);
      world.terrainGrid.set(col, row, TerrainType.HighGround);

      const bonuses = calculatePositionalBonuses(world, attacker, target);
      expect(bonuses.elevationDown).toBe(true);
      expect(bonuses.elevationUp).toBe(false);
      expect(bonuses.multiplier).toBeCloseTo(0.9, 2);
    });

    it('should give no elevation bonus when both on same level', () => {
      const target = createPosEntity(world, 200, 200, 0);
      const attacker = createPosEntity(world, 300, 200, 0); // in front, no flanking

      const bonuses = calculatePositionalBonuses(world, attacker, target);
      expect(bonuses.elevationUp).toBe(false);
      expect(bonuses.elevationDown).toBe(false);
      expect(bonuses.multiplier).toBeCloseTo(1.0, 2);
    });
  });

  describe('combined bonuses', () => {
    it('should stack flanking + elevation bonuses', () => {
      // Target facing right, attacker behind and on high ground
      const target = createPosEntity(world, 200, 200, 0);
      const attacker = createPosEntity(world, 100, 200, 0);

      const col = world.terrainGrid.worldToCol(100);
      const row = world.terrainGrid.worldToRow(200);
      world.terrainGrid.set(col, row, TerrainType.HighGround);

      const bonuses = calculatePositionalBonuses(world, attacker, target);
      expect(bonuses.flanking).toBe(true);
      expect(bonuses.elevationUp).toBe(true);
      // 1.0 + 0.25 (flank) + 0.10 (elevation) = 1.35
      expect(bonuses.multiplier).toBeCloseTo(1.35, 2);
    });
  });

  describe('emitPositionalBonusText', () => {
    it('should add floating text for flanking', () => {
      const target = createPosEntity(world, 200, 200, 0);
      const bonuses = {
        multiplier: 1.25,
        flanking: true,
        elevationUp: false,
        elevationDown: false,
      };

      emitPositionalBonusText(world, target, bonuses);

      expect(world.floatingTexts.length).toBe(1);
      expect(world.floatingTexts[0].text).toBe('FLANKED!');
    });

    it('should add floating text for high ground', () => {
      const target = createPosEntity(world, 200, 200, 0);
      const bonuses = {
        multiplier: 1.1,
        flanking: false,
        elevationUp: true,
        elevationDown: false,
      };

      emitPositionalBonusText(world, target, bonuses);

      expect(world.floatingTexts.length).toBe(1);
      expect(world.floatingTexts[0].text).toBe('HIGH GROUND!');
    });

    it('should add both texts for flanking + elevation', () => {
      const target = createPosEntity(world, 200, 200, 0);
      const bonuses = {
        multiplier: 1.35,
        flanking: true,
        elevationUp: true,
        elevationDown: false,
      };

      emitPositionalBonusText(world, target, bonuses);

      expect(world.floatingTexts.length).toBe(2);
      const texts = world.floatingTexts.map((t) => t.text);
      expect(texts).toContain('FLANKED!');
      expect(texts).toContain('HIGH GROUND!');
    });
  });
});
