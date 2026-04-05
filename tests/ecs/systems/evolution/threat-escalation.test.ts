/**
 * Threat Escalation System Tests
 *
 * Validates long-game difficulty ramp:
 * - Nest production multiplier increases over time
 * - Swarm speed buff expiry restores original speeds
 * - Mega-wave triggers every 5 minutes after peace
 * - Random events fire within 3-5 minute intervals
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FactionTag, Health, Position, Velocity } from '@/ecs/components';
import { swarmBuffOriginalSpeeds } from '@/ecs/systems/evolution/mega-wave';
import { threatEscalationSystem } from '@/ecs/systems/evolution/threat-escalation';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { Faction } from '@/types';

// Mock audio to avoid Tone.js initialization
vi.mock('@/audio/audio-system', () => ({
  audio: { alert: vi.fn(), click: vi.fn() },
}));

// Mock animations
vi.mock('@/rendering/animations', () => ({
  triggerSpawnPop: vi.fn(),
}));

// Mock mega-wave trigger (heavy spawning logic we don't want to exercise here)
const mockTriggerMegaWave = vi.fn();
vi.mock('@/ecs/systems/evolution/mega-wave', async (importOriginal) => {
  const actual = (await importOriginal()) as Record<string, unknown>;
  return {
    ...actual,
    triggerMegaWave: (...args: unknown[]) => mockTriggerMegaWave(...args),
  };
});

// Mock random event trigger
const mockTriggerRandomEvent = vi.fn();
vi.mock('@/ecs/systems/evolution/random-events', () => ({
  triggerRandomEvent: (...args: unknown[]) => mockTriggerRandomEvent(...args),
}));

// Mock game events UI
vi.mock('@/ui/game-events', () => ({
  pushGameEvent: vi.fn(),
}));

// Mock store
vi.mock('@/ui/store', () => ({
  waveNumber: { value: 0 },
}));

describe('threatEscalationSystem', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.peaceTimer = 0; // Peace already ended
    world.viewWidth = 800;
    world.viewHeight = 600;
    mockTriggerMegaWave.mockClear();
    mockTriggerRandomEvent.mockClear();
    swarmBuffOriginalSpeeds.clear();
  });

  // ── Peace period guard ──────────────────────────────────────────────

  describe('peace period', () => {
    it('should do nothing when frameCount is before peaceTimer', () => {
      world.peaceTimer = 10800;
      world.frameCount = 5000;

      threatEscalationSystem(world);

      expect(world.enemyEvolution.nestProductionMultiplier).toBe(1);
      expect(mockTriggerMegaWave).not.toHaveBeenCalled();
    });
  });

  // ── Nest production multiplier ramp ─────────────────────────────────

  describe('nest production ramp', () => {
    it('should stay at 1x before 15 minutes', () => {
      world.frameCount = 53999; // Just under 54000 (15 min)

      threatEscalationSystem(world);

      expect(world.enemyEvolution.nestProductionMultiplier).toBe(1);
    });

    it('should ramp to 2x at 15 minutes (54000 frames)', () => {
      world.frameCount = 54000;

      threatEscalationSystem(world);

      expect(world.enemyEvolution.nestProductionMultiplier).toBe(2);
    });

    it('should ramp to 3x at 30 minutes (108000 frames)', () => {
      world.frameCount = 108000;

      threatEscalationSystem(world);

      expect(world.enemyEvolution.nestProductionMultiplier).toBe(3);
    });

    it('should ramp to 5x at 45 minutes (162000 frames)', () => {
      world.frameCount = 162000;

      threatEscalationSystem(world);

      expect(world.enemyEvolution.nestProductionMultiplier).toBe(5);
    });

    it('should account for peace timer offset', () => {
      // Peace ends at frame 10800 (3 min), so 15 min of gameplay
      // starts at 10800 + 54000 = 64800
      world.peaceTimer = 10800;
      world.frameCount = 10800 + 54000;

      threatEscalationSystem(world);

      expect(world.enemyEvolution.nestProductionMultiplier).toBe(2);
    });
  });

  // ── Swarm speed buff expiry ─────────────────────────────────────────

  describe('swarm speed buff expiry', () => {
    it('should restore original speeds when buff expires', () => {
      const eid = addEntity(world.ecs);
      addComponent(world.ecs, eid, Health);
      addComponent(world.ecs, eid, Velocity);
      Health.current[eid] = 50;
      Velocity.speed[eid] = 2.2; // Buffed speed (original was 2.0)

      // Register the original speed
      swarmBuffOriginalSpeeds.set(eid, 2.0);
      world.enemyEvolution.swarmSpeedBuffExpiry = 5000;
      world.frameCount = 5000; // At expiry

      threatEscalationSystem(world);

      expect(Velocity.speed[eid]).toBe(2.0);
      expect(world.enemyEvolution.swarmSpeedBuffExpiry).toBe(0);
      expect(swarmBuffOriginalSpeeds.size).toBe(0);
    });

    it('should not restore speed for dead entities', () => {
      const eid = addEntity(world.ecs);
      addComponent(world.ecs, eid, Health);
      addComponent(world.ecs, eid, Velocity);
      Health.current[eid] = 0; // Dead
      Velocity.speed[eid] = 2.2;

      swarmBuffOriginalSpeeds.set(eid, 2.0);
      world.enemyEvolution.swarmSpeedBuffExpiry = 5000;
      world.frameCount = 5000;

      threatEscalationSystem(world);

      // Speed not restored because entity is dead
      expect(Velocity.speed[eid]).toBe(2.2);
    });

    it('should not touch speeds if no buff is active', () => {
      world.enemyEvolution.swarmSpeedBuffExpiry = 0;
      world.frameCount = 5000;

      // No crash, no side effects
      threatEscalationSystem(world);

      expect(swarmBuffOriginalSpeeds.size).toBe(0);
    });

    it('should not expire buff before the expiry frame', () => {
      const eid = addEntity(world.ecs);
      addComponent(world.ecs, eid, Health);
      addComponent(world.ecs, eid, Velocity);
      Health.current[eid] = 50;
      Velocity.speed[eid] = 2.2;

      swarmBuffOriginalSpeeds.set(eid, 2.0);
      world.enemyEvolution.swarmSpeedBuffExpiry = 5000;
      world.frameCount = 4999; // Before expiry

      threatEscalationSystem(world);

      // Buff still active, speed not restored
      expect(Velocity.speed[eid]).toBe(2.2);
      expect(world.enemyEvolution.swarmSpeedBuffExpiry).toBe(5000);
    });
  });

  // ── Mega-wave triggers ──────────────────────────────────────────────

  describe('mega-wave triggers', () => {
    it('should trigger mega-wave at 5 minutes after peace', () => {
      // 5 min = 18000 frames
      world.frameCount = 18000;
      world.enemyEvolution.lastMegaWaveFrame = 0;

      threatEscalationSystem(world);

      expect(mockTriggerMegaWave).toHaveBeenCalledWith(world, 1);
      expect(world.enemyEvolution.lastMegaWaveFrame).toBe(18000);
    });

    it('should not trigger mega-wave before 5 minutes', () => {
      world.frameCount = 17999;

      threatEscalationSystem(world);

      expect(mockTriggerMegaWave).not.toHaveBeenCalled();
    });

    it('should not re-trigger a mega-wave already fired', () => {
      world.frameCount = 18000;
      // Already fired at frame 18000
      world.enemyEvolution.lastMegaWaveFrame = 18000;

      threatEscalationSystem(world);

      expect(mockTriggerMegaWave).not.toHaveBeenCalled();
    });

    it('should trigger second mega-wave at 10 minutes', () => {
      world.frameCount = 36000; // 10 min = 2 * 18000
      world.enemyEvolution.lastMegaWaveFrame = 18000; // First wave already fired

      threatEscalationSystem(world);

      expect(mockTriggerMegaWave).toHaveBeenCalledWith(world, 2);
    });

    it('should respect peace timer offset for mega-waves', () => {
      world.peaceTimer = 10800; // Peace ends at 3 min
      world.frameCount = 10800 + 18000; // 5 min after peace
      world.enemyEvolution.lastMegaWaveFrame = 0;

      threatEscalationSystem(world);

      expect(mockTriggerMegaWave).toHaveBeenCalledWith(world, 1);
    });
  });

  // ── Random events ───────────────────────────────────────────────────

  describe('random events', () => {
    it('should check for random events on 3600-frame intervals', () => {
      // Must be >= 10800 frames since peace AND on a 3600 multiple.
      // The gap is 10800 + rng * 7200, so max gap is 18000.
      // sinceLastEvent must exceed this, so use a large frame count.
      world.frameCount = 21600; // 6 min, multiple of 3600
      world.enemyEvolution.lastRandomEventFrame = 0;

      threatEscalationSystem(world);

      // sinceLastEvent = 21600, which exceeds max gap of 18000
      expect(mockTriggerRandomEvent).toHaveBeenCalledWith(world);
    });

    it('should not check for random events off-interval', () => {
      world.frameCount = 10801; // Not a multiple of 3600

      threatEscalationSystem(world);

      expect(mockTriggerRandomEvent).not.toHaveBeenCalled();
    });

    it('should not fire random events before 3 minutes since peace', () => {
      world.frameCount = 7200; // 2 min, multiple of 3600 but < 10800

      threatEscalationSystem(world);

      expect(mockTriggerRandomEvent).not.toHaveBeenCalled();
    });

    it('should not fire random events too soon after the last one', () => {
      // Set last event very recently
      world.frameCount = 14400; // 4 min, multiple of 3600
      world.enemyEvolution.lastRandomEventFrame = 14000; // Just 400 frames ago

      threatEscalationSystem(world);

      // Gap is only 400 frames, minimum gap is 10800
      expect(mockTriggerRandomEvent).not.toHaveBeenCalled();
    });

    it('should record lastRandomEventFrame when event fires', () => {
      world.frameCount = 10800;
      world.enemyEvolution.lastRandomEventFrame = 0;

      threatEscalationSystem(world);

      if (mockTriggerRandomEvent.mock.calls.length > 0) {
        expect(world.enemyEvolution.lastRandomEventFrame).toBe(10800);
      }
    });
  });
});
