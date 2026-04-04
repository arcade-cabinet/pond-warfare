/**
 * Weather System Configuration
 *
 * Defines weather types, their gameplay modifiers, and transition timing.
 * Weather changes every 3-5 minutes, seeded from the map seed for determinism.
 */

export type WeatherType = 'clear' | 'rain' | 'fog' | 'wind';

export interface WeatherConfig {
  type: WeatherType;
  /** Speed multiplier applied to units on Grass terrain (rain = mud). */
  grassSpeedMult: number;
  /** Whether Shallows tiles become impassable (flooding from rain). */
  shallowsBlocked: boolean;
  /** Vision range multiplier (fog reduces). */
  visionMult: number;
  /** Projectile offset in pixels applied along wind direction. */
  projectileOffset: number;
  /** Wind direction in radians (only relevant for wind weather). */
  windDirection: number;
  /** Gathering speed multiplier (rain slows gathering). */
  gatherSpeedMult: number;
  /** Enemy attack threshold multiplier (fog makes enemies wait longer). */
  attackThresholdMult: number;
}

/** Gameplay modifiers for each weather type. */
export const WEATHER_CONFIGS: Record<WeatherType, Omit<WeatherConfig, 'windDirection'>> = {
  clear: {
    type: 'clear',
    grassSpeedMult: 1.0,
    shallowsBlocked: false,
    visionMult: 1.0,
    projectileOffset: 0,
    gatherSpeedMult: 1.0,
    attackThresholdMult: 1.0,
  },
  rain: {
    type: 'rain',
    grassSpeedMult: 0.85, // -15% speed on grass
    shallowsBlocked: true, // Shallows become impassable (flooding)
    visionMult: 1.0,
    projectileOffset: 0,
    gatherSpeedMult: 0.9, // -10% gathering speed
    attackThresholdMult: 1.0,
  },
  fog: {
    type: 'fog',
    grassSpeedMult: 1.0,
    shallowsBlocked: false,
    visionMult: 0.6, // -40% vision range
    projectileOffset: 0,
    gatherSpeedMult: 1.0,
    attackThresholdMult: 1.5, // +50% enemy attack threshold (less aggressive)
  },
  wind: {
    type: 'wind',
    grassSpeedMult: 1.0,
    shallowsBlocked: false,
    visionMult: 1.0,
    projectileOffset: 20, // +-20px drift on projectiles
    gatherSpeedMult: 1.0,
    attackThresholdMult: 1.0,
  },
};

/** Weather types in rotation order. */
export const WEATHER_TYPES: WeatherType[] = ['clear', 'rain', 'fog', 'wind'];

/** Min/max duration of each weather period in frames (3-5 minutes at 60fps). */
export const WEATHER_MIN_DURATION = 10800; // 3 minutes
export const WEATHER_MAX_DURATION = 18000; // 5 minutes

export interface WeatherState {
  current: WeatherType;
  /** Frame when the current weather started. */
  startFrame: number;
  /** Frame when the next transition occurs. */
  nextTransitionFrame: number;
  /** Wind direction in radians (randomized each wind period). */
  windDirection: number;
  /** Next weather type (for HUD preview). */
  next: WeatherType;
}

/**
 * Simple seeded PRNG for deterministic weather.
 * Uses the mulberry32 algorithm.
 */
export function createWeatherRng(seed: number): () => number {
  let s = seed | 0;
  return () => {
    s = (s + 0x6d2b79f5) | 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Create initial weather state from a map seed. */
export function createWeatherState(mapSeed: number, startFrame: number): WeatherState {
  const rng = createWeatherRng(mapSeed);
  const firstType = WEATHER_TYPES[Math.floor(rng() * WEATHER_TYPES.length)];
  const duration =
    WEATHER_MIN_DURATION + Math.floor(rng() * (WEATHER_MAX_DURATION - WEATHER_MIN_DURATION));
  const nextType = WEATHER_TYPES[Math.floor(rng() * WEATHER_TYPES.length)];
  return {
    current: firstType,
    startFrame,
    nextTransitionFrame: startFrame + duration,
    windDirection: rng() * Math.PI * 2,
    next: nextType,
  };
}
