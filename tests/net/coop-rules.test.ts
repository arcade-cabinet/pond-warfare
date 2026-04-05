/**
 * Co-op Multiplayer Rules Tests
 *
 * Tests for shared resource pool, ping messages, co-op difficulty scaling,
 * and both-survive win condition logic.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import {
  applyCoopDifficultyScaling,
  applyCoopPing,
  applyResourceSync,
  buildLodgeDestroyedMessage,
  buildPingMessage,
  buildResourceSyncMessage,
  COOP_ENEMY_STAT_MULT,
  COOP_PING_DURATION,
  checkCoopWinLose,
  tickCoopPings,
} from '@/net/coop-rules';
import * as mp from '@/ui/store-multiplayer';

describe('coop-rules', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    // Reset store signals
    mp.coopMinimapPings.value = [];
    mp.coopPartnerLodgeDestroyed.value = false;
  });

  // ---- Shared Resource Pool ----

  describe('shared resource pool', () => {
    it('buildResourceSyncMessage returns correct message format', () => {
      world.resources.fish = 500;
      world.resources.logs = 200;
      world.resources.rocks = 10;

      const msg = buildResourceSyncMessage(world);

      expect(msg).toEqual({
        type: 'coop-resource',
        fish: 500,
        logs: 200,
        rocks: 10,
      });
    });

    it('applyResourceSync takes max of local and remote resources', () => {
      world.resources.fish = 300;
      world.resources.logs = 100;
      world.resources.rocks = 5;

      applyResourceSync(world, { fish: 500, logs: 50, rocks: 10 });

      expect(world.resources.fish).toBe(500); // Remote was higher
      expect(world.resources.logs).toBe(100); // Local was higher
      expect(world.resources.rocks).toBe(10); // Remote was higher
    });

    it('applyResourceSync does not decrease resources', () => {
      world.resources.fish = 1000;
      world.resources.logs = 500;
      world.resources.rocks = 20;

      applyResourceSync(world, { fish: 100, logs: 50, rocks: 5 });

      expect(world.resources.fish).toBe(1000);
      expect(world.resources.logs).toBe(500);
      expect(world.resources.rocks).toBe(20);
    });
  });

  // ---- Ping Message ----

  describe('ping message', () => {
    it('buildPingMessage returns correct message format', () => {
      const msg = buildPingMessage(150, 300);

      expect(msg).toEqual({
        type: 'coop-ping',
        x: 150,
        y: 300,
      });
    });

    it('applyCoopPing adds ping to world.minimapPings', () => {
      expect(world.minimapPings).toHaveLength(0);

      applyCoopPing(world, 200, 400);

      expect(world.minimapPings).toHaveLength(1);
      expect(world.minimapPings[0]).toMatchObject({
        x: 200,
        y: 400,
        life: COOP_PING_DURATION,
        maxLife: COOP_PING_DURATION,
        color: '56, 189, 248',
      });
    });

    it('applyCoopPing also updates the store signal', () => {
      applyCoopPing(world, 100, 200);

      expect(mp.coopMinimapPings.value).toHaveLength(1);
      expect(mp.coopMinimapPings.value[0].x).toBe(100);
      expect(mp.coopMinimapPings.value[0].y).toBe(200);
    });

    it('COOP_PING_DURATION is 180 frames (3 seconds at 60fps)', () => {
      expect(COOP_PING_DURATION).toBe(180);
    });
  });

  // ---- Both-Survive Win Condition ----

  describe('both-survive win condition', () => {
    it('returns win when no nests remaining', () => {
      const result = checkCoopWinLose(true, false, false);
      expect(result).toBe('win');
    });

    it('returns win when no nests even if partner lodge destroyed', () => {
      const result = checkCoopWinLose(true, false, true);
      expect(result).toBe('win');
    });

    it('returns lose when both lodges destroyed', () => {
      const result = checkCoopWinLose(false, true, true);
      expect(result).toBe('lose');
    });

    it('returns playing when local lodge destroyed but partner alive', () => {
      const result = checkCoopWinLose(false, true, false);
      expect(result).toBe('playing');
    });

    it('returns null when local lodge alive and nests remain (defer to normal)', () => {
      const result = checkCoopWinLose(true, true, false);
      expect(result).toBeNull();
    });

    it('returns null when local lodge alive even if partner lodge destroyed', () => {
      const result = checkCoopWinLose(true, true, true);
      expect(result).toBeNull();
    });
  });

  // ---- Lodge Destroyed Message ----

  describe('lodge destroyed message', () => {
    it('returns correct message format', () => {
      const msg = buildLodgeDestroyedMessage();
      expect(msg).toEqual({ type: 'coop-lodge-destroyed' });
    });
  });

  // ---- Co-op Difficulty Scaling ----

  describe('co-op difficulty scaling', () => {
    it('applies +50% enemy stat multiplier when coopMode is active', () => {
      world.coopMode = true;
      world.enemyStatMult = 1.0;

      applyCoopDifficultyScaling(world);

      expect(world.enemyStatMult).toBe(COOP_ENEMY_STAT_MULT);
    });

    it('stacks with existing enemy stat multiplier', () => {
      world.coopMode = true;
      world.enemyStatMult = 2.0; // e.g. nightmare difficulty

      applyCoopDifficultyScaling(world);

      expect(world.enemyStatMult).toBe(2.0 * COOP_ENEMY_STAT_MULT);
    });

    it('does not modify enemyStatMult when coopMode is false', () => {
      world.coopMode = false;
      world.enemyStatMult = 1.0;

      applyCoopDifficultyScaling(world);

      expect(world.enemyStatMult).toBe(1.0);
    });

    it('COOP_ENEMY_STAT_MULT is 1.5', () => {
      expect(COOP_ENEMY_STAT_MULT).toBe(1.5);
    });
  });

  // ---- Co-op Ping Tick ----

  describe('tickCoopPings', () => {
    it('does nothing when coopMode is false', () => {
      world.coopMode = false;
      mp.coopMinimapPings.value = [{ x: 0, y: 0, life: 100, maxLife: 180 }];

      tickCoopPings(world);

      expect(mp.coopMinimapPings.value).toHaveLength(1);
      expect(mp.coopMinimapPings.value[0].life).toBe(100);
    });

    it('decrements ping life when coopMode is active', () => {
      world.coopMode = true;
      mp.coopMinimapPings.value = [{ x: 0, y: 0, life: 100, maxLife: 180 }];

      tickCoopPings(world);

      expect(mp.coopMinimapPings.value).toHaveLength(1);
      expect(mp.coopMinimapPings.value[0].life).toBe(99);
    });

    it('removes expired pings', () => {
      world.coopMode = true;
      mp.coopMinimapPings.value = [{ x: 0, y: 0, life: 1, maxLife: 180 }];

      tickCoopPings(world);

      expect(mp.coopMinimapPings.value).toHaveLength(0);
    });
  });

  // ---- World Defaults ----

  describe('world defaults', () => {
    it('coopMode defaults to false', () => {
      expect(world.coopMode).toBe(false);
    });

    it('partnerLodgeDestroyed defaults to false', () => {
      expect(world.partnerLodgeDestroyed).toBe(false);
    });

    it('partnerUnitPositions defaults to empty array', () => {
      expect(world.partnerUnitPositions).toEqual([]);
    });

    it('coopResourceCallback defaults to null', () => {
      expect(world.coopResourceCallback).toBeNull();
    });
  });
});
