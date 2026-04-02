import { describe, expect, it } from 'vitest';
import {
  createWeatherRng,
  createWeatherState,
  WEATHER_CONFIGS,
  WEATHER_TYPES,
} from '@/config/weather';
import {
  areShallowsBlocked,
  getWeatherGrassSpeedMult,
  getWeatherProjectileOffset,
  getWeatherVisionMult,
  weatherSystem,
} from '@/ecs/systems/weather';
import { createGameWorld } from '@/ecs/world';

describe('weather config', () => {
  it('defines all 4 weather types', () => {
    expect(WEATHER_TYPES).toEqual(['clear', 'rain', 'fog', 'wind']);
    for (const type of WEATHER_TYPES) {
      expect(WEATHER_CONFIGS[type]).toBeDefined();
    }
  });

  it('rain reduces grass speed by 15%', () => {
    expect(WEATHER_CONFIGS.rain.grassSpeedMult).toBe(0.85);
  });

  it('rain blocks shallows', () => {
    expect(WEATHER_CONFIGS.rain.shallowsBlocked).toBe(true);
  });

  it('fog reduces vision by 40%', () => {
    expect(WEATHER_CONFIGS.fog.visionMult).toBe(0.6);
  });

  it('wind has 15px projectile offset', () => {
    expect(WEATHER_CONFIGS.wind.projectileOffset).toBe(15);
  });

  it('clear has no modifiers', () => {
    const clear = WEATHER_CONFIGS.clear;
    expect(clear.grassSpeedMult).toBe(1.0);
    expect(clear.shallowsBlocked).toBe(false);
    expect(clear.visionMult).toBe(1.0);
    expect(clear.projectileOffset).toBe(0);
  });
});

describe('createWeatherRng', () => {
  it('produces deterministic values from same seed', () => {
    const rng1 = createWeatherRng(42);
    const rng2 = createWeatherRng(42);
    expect(rng1()).toBe(rng2());
    expect(rng1()).toBe(rng2());
    expect(rng1()).toBe(rng2());
  });

  it('produces different values from different seeds', () => {
    const rng1 = createWeatherRng(42);
    const rng2 = createWeatherRng(99);
    // Very unlikely to be equal, but technically possible
    const v1 = rng1();
    const v2 = rng2();
    expect(v1).not.toBe(v2);
  });

  it('produces values in [0, 1)', () => {
    const rng = createWeatherRng(12345);
    for (let i = 0; i < 100; i++) {
      const v = rng();
      expect(v).toBeGreaterThanOrEqual(0);
      expect(v).toBeLessThan(1);
    }
  });
});

describe('createWeatherState', () => {
  it('creates initial state with valid weather type', () => {
    const state = createWeatherState(42, 0);
    expect(WEATHER_TYPES).toContain(state.current);
    expect(WEATHER_TYPES).toContain(state.next);
    expect(state.startFrame).toBe(0);
    expect(state.nextTransitionFrame).toBeGreaterThan(0);
    expect(state.windDirection).toBeGreaterThanOrEqual(0);
    expect(state.windDirection).toBeLessThan(Math.PI * 2);
  });

  it('is deterministic from the same seed', () => {
    const s1 = createWeatherState(42, 0);
    const s2 = createWeatherState(42, 0);
    expect(s1.current).toBe(s2.current);
    expect(s1.next).toBe(s2.next);
    expect(s1.nextTransitionFrame).toBe(s2.nextTransitionFrame);
  });
});

describe('weatherSystem', () => {
  it('transitions weather when frame exceeds nextTransitionFrame', () => {
    const world = createGameWorld();
    world.weather.nextTransitionFrame = 100;
    world.weather.current = 'clear';
    world.weather.next = 'rain';
    world.frameCount = 120; // Past transition
    world.viewWidth = 800;
    world.viewHeight = 600;

    weatherSystem(world);

    expect(world.weather.current).toBe('rain');
    expect(world.weather.startFrame).toBe(120);
    expect(world.weather.nextTransitionFrame).toBeGreaterThan(120);
  });

  it('does not transition before nextTransitionFrame', () => {
    const world = createGameWorld();
    world.weather.nextTransitionFrame = 10000;
    world.weather.current = 'clear';
    world.frameCount = 60;

    weatherSystem(world);

    expect(world.weather.current).toBe('clear');
  });
});

describe('weather helper functions', () => {
  it('getWeatherGrassSpeedMult returns correct modifier', () => {
    const world = createGameWorld();
    world.weather.current = 'rain';
    expect(getWeatherGrassSpeedMult(world)).toBe(0.85);

    world.weather.current = 'clear';
    expect(getWeatherGrassSpeedMult(world)).toBe(1.0);
  });

  it('areShallowsBlocked returns true for rain', () => {
    const world = createGameWorld();
    world.weather.current = 'rain';
    expect(areShallowsBlocked(world)).toBe(true);

    world.weather.current = 'clear';
    expect(areShallowsBlocked(world)).toBe(false);
  });

  it('getWeatherVisionMult returns 0.6 for fog', () => {
    const world = createGameWorld();
    world.weather.current = 'fog';
    expect(getWeatherVisionMult(world)).toBe(0.6);

    world.weather.current = 'clear';
    expect(getWeatherVisionMult(world)).toBe(1.0);
  });

  it('getWeatherProjectileOffset returns non-zero for wind', () => {
    const world = createGameWorld();
    world.weather.current = 'wind';
    world.weather.windDirection = 0; // East
    const offset = getWeatherProjectileOffset(world);
    expect(offset.dx).toBeCloseTo(15, 0);
    expect(offset.dy).toBeCloseTo(0, 0);
  });

  it('getWeatherProjectileOffset returns zero for non-wind', () => {
    const world = createGameWorld();
    world.weather.current = 'clear';
    const offset = getWeatherProjectileOffset(world);
    expect(offset.dx).toBe(0);
    expect(offset.dy).toBe(0);
  });
});
