/**
 * Morale System Tests
 *
 * Validates demoralization from outnumbering and commander death.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { Combat, EntityTypeTag, FactionTag, Health, Position } from '@/ecs/components';
import { COMMANDER_DEATH_DEMORALIZE_FRAMES, moraleSystem } from '@/ecs/systems/morale';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { SAPPER_KIND } from '@/game/live-unit-kinds';
import { type EntityKind, Faction } from '@/types';

function createUnit(
  world: GameWorld,
  x: number,
  y: number,
  faction: Faction,
  kind: EntityKind = SAPPER_KIND,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, Combat);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 60;
  Health.max[eid] = 60;
  Combat.damage[eid] = 6;
  Combat.attackRange[eid] = 40;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = kind;

  return eid;
}

describe('moraleSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.spatialHash = undefined as never;
    world.frameCount = 0;
  });

  describe('outnumbered demoralization', () => {
    it('should demoralize a lone player unit surrounded by 3+ enemies', () => {
      const player = createUnit(world, 100, 100, Faction.Player);
      createUnit(world, 110, 100, Faction.Enemy);
      createUnit(world, 120, 100, Faction.Enemy);
      createUnit(world, 130, 100, Faction.Enemy);

      moraleSystem(world);

      expect(world.demoralizedUnits.has(player)).toBe(true);
    });

    it('should NOT demoralize when allies balance the ratio', () => {
      const player = createUnit(world, 100, 100, Faction.Player);
      createUnit(world, 105, 100, Faction.Player); // ally
      createUnit(world, 110, 100, Faction.Enemy);
      createUnit(world, 120, 100, Faction.Enemy);
      createUnit(world, 130, 100, Faction.Enemy);

      moraleSystem(world);

      // 2 allies (player + 1), 3 enemies. 3 < 2*3 = 6, so NOT outnumbered 3:1
      expect(world.demoralizedUnits.has(player)).toBe(false);
    });

    it('should NOT demoralize when enemies are far away', () => {
      const player = createUnit(world, 100, 100, Faction.Player);
      // Enemies far beyond MORALE_CHECK_RADIUS (200)
      createUnit(world, 500, 500, Faction.Enemy);
      createUnit(world, 510, 500, Faction.Enemy);
      createUnit(world, 520, 500, Faction.Enemy);

      moraleSystem(world);

      expect(world.demoralizedUnits.has(player)).toBe(false);
    });

    it('should NOT demoralize dead enemies counting toward ratio', () => {
      const player = createUnit(world, 100, 100, Faction.Player);
      const enemy1 = createUnit(world, 110, 100, Faction.Enemy);
      const enemy2 = createUnit(world, 120, 100, Faction.Enemy);
      const _enemy3 = createUnit(world, 130, 100, Faction.Enemy);

      // Kill two enemies
      Health.current[enemy1] = 0;
      Health.current[enemy2] = 0;

      moraleSystem(world);

      // Only 1 living enemy vs 1 player, not outnumbered
      expect(world.demoralizedUnits.has(player)).toBe(false);
    });
  });

  describe('commander death demoralization', () => {
    it('should demoralize all player units when commander death timer is active', () => {
      const player1 = createUnit(world, 100, 100, Faction.Player);
      const player2 = createUnit(world, 200, 200, Faction.Player);

      // Simulate commander death - set demoralization timer
      world.commanderDeathDemoralizeUntil = world.frameCount + COMMANDER_DEATH_DEMORALIZE_FRAMES;

      moraleSystem(world);

      expect(world.demoralizedUnits.has(player1)).toBe(true);
      expect(world.demoralizedUnits.has(player2)).toBe(true);
    });

    it('should clear commander death demoralization after timer expires', () => {
      const player1 = createUnit(world, 100, 100, Faction.Player);

      world.commanderDeathDemoralizeUntil = 100;
      world.frameCount = 120; // Past the timer

      moraleSystem(world);

      expect(world.commanderDeathDemoralizeUntil).toBe(0);
      // Not demoralized by commander death anymore (may still be by outnumbering)
      expect(world.demoralizedUnits.has(player1)).toBe(false);
    });
  });

  describe('refresh cadence', () => {
    it('should only rebuild demoralized set on frame % 60 === 0', () => {
      const player = createUnit(world, 100, 100, Faction.Player);
      createUnit(world, 110, 100, Faction.Enemy);
      createUnit(world, 120, 100, Faction.Enemy);
      createUnit(world, 130, 100, Faction.Enemy);

      // Frame 0 should trigger refresh
      world.frameCount = 0;
      moraleSystem(world);
      expect(world.demoralizedUnits.has(player)).toBe(true);

      // Clear it manually
      world.demoralizedUnits.clear();

      // Frame 30 should NOT trigger refresh
      world.frameCount = 30;
      moraleSystem(world);
      expect(world.demoralizedUnits.size).toBe(0); // Not refreshed
    });
  });
});
