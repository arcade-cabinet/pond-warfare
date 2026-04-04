/**
 * Weather System
 *
 * Manages dynamic weather transitions and applies gameplay modifiers.
 * Weather changes every 3-5 minutes (seeded from mapSeed for determinism).
 *
 * Effects:
 * - Rain: -15% speed on Grass, Shallows become impassable, -10% gather speed
 * - Fog: -40% vision range, +50% enemy attack threshold (less aggressive)
 * - Wind: projectiles drift +-20px in wind direction
 * - Clear: no modifiers
 *
 * Visual particles (rain drops, fog overlay, wind leaves) are spawned here
 * and rendered by the existing particle/effects pipeline.
 */

import { audio } from '@/audio/audio-system';
import {
  createWeatherRng,
  WEATHER_CONFIGS,
  WEATHER_MAX_DURATION,
  WEATHER_MIN_DURATION,
  WEATHER_TYPES,
} from '@/config/weather';
import type { GameWorld } from '@/ecs/world';
import { currentWeather, nextWeather, weatherCountdown } from '@/ui/store-weather';
import { spawnParticle } from '@/utils/particles';

/** How often to spawn weather particles (every N frames). */
const PARTICLE_INTERVAL = 3;

/** How often to check for weather transition (every N frames). */
const TRANSITION_CHECK_INTERVAL = 60;

export function weatherSystem(world: GameWorld): void {
  const { weather, frameCount } = world;

  // Check for weather transition
  if (frameCount % TRANSITION_CHECK_INTERVAL === 0 && frameCount >= weather.nextTransitionFrame) {
    advanceWeather(world);
  }

  // Spawn visual particles for current weather
  if (frameCount % PARTICLE_INTERVAL === 0) {
    spawnWeatherParticles(world);
  }

  // Sync weather state to UI store (every 30 frames, aligned with syncUIStore)
  if (frameCount % 30 === 0) {
    currentWeather.value = weather.current;
    nextWeather.value = weather.next;
    const framesLeft = Math.max(0, weather.nextTransitionFrame - frameCount);
    weatherCountdown.value = Math.ceil(framesLeft / 60);
  }
}

/** Transition to the next weather type using deterministic RNG. */
function advanceWeather(world: GameWorld): void {
  const { weather, mapSeed, frameCount } = world;
  const rng = createWeatherRng(mapSeed + frameCount);

  weather.current = weather.next;
  weather.startFrame = frameCount;

  const duration =
    WEATHER_MIN_DURATION + Math.floor(rng() * (WEATHER_MAX_DURATION - WEATHER_MIN_DURATION));
  weather.nextTransitionFrame = frameCount + duration;

  // Pick next weather (avoid repeating same type)
  let nextIdx = Math.floor(rng() * WEATHER_TYPES.length);
  if (WEATHER_TYPES[nextIdx] === weather.current) {
    nextIdx = (nextIdx + 1) % WEATHER_TYPES.length;
  }
  weather.next = WEATHER_TYPES[nextIdx];

  // New wind direction for wind weather
  weather.windDirection = rng() * Math.PI * 2;

  // Play weather transition sound
  audio.weatherTransition(weather.current);

  // Announce weather change
  world.floatingTexts.push({
    x: world.camX + world.viewWidth / 2,
    y: world.camY + 40,
    text: `Weather: ${weather.current.charAt(0).toUpperCase() + weather.current.slice(1)}`,
    color: '#38bdf8',
    life: 120,
  });
}

/** Spawn visual particles for rain, fog, or wind. */
function spawnWeatherParticles(world: GameWorld): void {
  const { weather, camX, camY, viewWidth, viewHeight } = world;

  switch (weather.current) {
    case 'rain': {
      // Blue rain drops falling downward
      for (let i = 0; i < 4; i++) {
        const x = camX + world.gameRng.next() * viewWidth;
        const y = camY + world.gameRng.next() * 40;
        spawnParticle(world, x, y, 0, 4, 30, '#60a5fa', 1);
      }
      break;
    }
    case 'fog': {
      // Pale gray fog wisps drifting slowly
      const x = camX + world.gameRng.next() * viewWidth;
      const y = camY + world.gameRng.next() * viewHeight;
      spawnParticle(
        world,
        x,
        y,
        (world.gameRng.next() - 0.5) * 0.3,
        0,
        90,
        'rgba(200,200,200,0.3)',
        4,
      );
      break;
    }
    case 'wind': {
      // Wind-blown leaf particles moving in wind direction
      const dir = weather.windDirection;
      const x = camX + world.gameRng.next() * viewWidth;
      const y = camY + world.gameRng.next() * viewHeight;
      spawnParticle(world, x, y, Math.cos(dir) * 3, Math.sin(dir) * 3, 40, '#86efac', 2);
      break;
    }
    // Clear: no particles
  }
}

/**
 * Get the current weather speed modifier for Grass terrain.
 * Called by movement system to apply weather-based speed penalty.
 */
export function getWeatherGrassSpeedMult(world: GameWorld): number {
  return WEATHER_CONFIGS[world.weather.current].grassSpeedMult;
}

/**
 * Check if shallows are blocked by current weather (rain flooding).
 * Called by terrain grid speed calculations.
 */
export function areShallowsBlocked(world: GameWorld): boolean {
  return WEATHER_CONFIGS[world.weather.current].shallowsBlocked;
}

/**
 * Get the vision multiplier for the current weather.
 * Called by fog-of-war system to reduce reveal radius.
 */
export function getWeatherVisionMult(world: GameWorld): number {
  return WEATHER_CONFIGS[world.weather.current].visionMult;
}

/**
 * Get projectile drift offset for wind weather.
 * Returns {dx, dy} offset to apply to projectile targets.
 */
export function getWeatherProjectileOffset(world: GameWorld): { dx: number; dy: number } {
  const config = WEATHER_CONFIGS[world.weather.current];
  if (config.projectileOffset === 0) return { dx: 0, dy: 0 };
  const dir = world.weather.windDirection;
  return {
    dx: Math.cos(dir) * config.projectileOffset,
    dy: Math.sin(dir) * config.projectileOffset,
  };
}

/**
 * Get gathering speed multiplier for current weather.
 * Rain reduces gathering speed by 10%. Applied on top of difficulty gatherSpeedMod.
 */
export function getWeatherGatherMult(world: GameWorld): number {
  if (!world.weather) return 1.0;
  return WEATHER_CONFIGS[world.weather.current].gatherSpeedMult;
}

/**
 * Get enemy attack threshold multiplier for current weather.
 * Fog increases attack threshold by 50% (enemies wait longer to attack).
 */
export function getWeatherAttackThresholdMult(world: GameWorld): number {
  if (!world.weather) return 1.0;
  return WEATHER_CONFIGS[world.weather.current].attackThresholdMult;
}
