/**
 * Threat Escalation System
 *
 * Long-game systems that ramp difficulty over time:
 * - Nest production multiplier increases
 * - Swarm speed buff expiry
 * - Mega-waves every 5 minutes
 * - Random events every 3-5 minutes
 */

import { Health, Velocity } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { swarmBuffOriginalSpeeds, triggerMegaWave } from './mega-wave';
import { triggerRandomEvent } from './random-events';

/** Frames per 5-minute mega-wave interval (5 * 60 * 60 = 18000). */
const MEGA_WAVE_INTERVAL = 18000;

/** Frames per random event check (every 60 seconds). */
const RANDOM_EVENT_CHECK_INTERVAL = 3600;

/** Minimum frames between random events (~3 minutes). */
const RANDOM_EVENT_MIN_GAP = 10800;

/** Maximum frames between random events (~5 minutes). */
const RANDOM_EVENT_MAX_GAP = 18000;

/**
 * Threat escalation for long games. Called from evolutionSystem.
 *
 * - Mega-waves every 5 minutes (escalating intensity)
 * - Nest production ramp over time
 * - Random events every 3-5 minutes
 * - Swarm speed buff expiry
 */
export function threatEscalationSystem(world: GameWorld): void {
  if (world.frameCount < world.peaceTimer) return;

  const evo = world.enemyEvolution;
  const framesSincePeace = world.frameCount - world.peaceTimer;

  // --- Nest production ramp ---
  if (framesSincePeace >= 162000) {
    evo.nestProductionMultiplier = 5;
  } else if (framesSincePeace >= 108000) {
    evo.nestProductionMultiplier = 3;
  } else if (framesSincePeace >= 54000) {
    evo.nestProductionMultiplier = 2;
  } else {
    evo.nestProductionMultiplier = 1;
  }

  // --- Swarm speed buff expiry: restore original speeds ---
  if (evo.swarmSpeedBuffExpiry > 0 && world.frameCount >= evo.swarmSpeedBuffExpiry) {
    evo.swarmSpeedBuffExpiry = 0;
    for (const [eid, origSpeed] of swarmBuffOriginalSpeeds) {
      if (Health.current[eid] > 0) {
        Velocity.speed[eid] = origSpeed;
      }
    }
    swarmBuffOriginalSpeeds.clear();
  }

  // --- Mega-wave check (every 18000 frames = 5 min after peace) ---
  if (framesSincePeace >= MEGA_WAVE_INTERVAL) {
    const megaWaveNumber = Math.floor(framesSincePeace / MEGA_WAVE_INTERVAL);
    const expectedFrame = world.peaceTimer + megaWaveNumber * MEGA_WAVE_INTERVAL;

    if (evo.lastMegaWaveFrame < expectedFrame) {
      evo.lastMegaWaveFrame = world.frameCount;
      triggerMegaWave(world, megaWaveNumber);
    }
  }

  // --- Random events (check every 60s, fire every 3-5 min) ---
  if (world.frameCount % RANDOM_EVENT_CHECK_INTERVAL === 0 && framesSincePeace >= 10800) {
    const sinceLastEvent = world.frameCount - evo.lastRandomEventFrame;
    const gap =
      RANDOM_EVENT_MIN_GAP + Math.random() * (RANDOM_EVENT_MAX_GAP - RANDOM_EVENT_MIN_GAP);
    if (sinceLastEvent >= gap) {
      evo.lastRandomEventFrame = world.frameCount;
      triggerRandomEvent(world);
    }
  }
}
