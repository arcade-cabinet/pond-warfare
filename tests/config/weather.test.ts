import { describe, expect, it } from 'vitest';
import {
  createWeatherState,
  WEATHER_CONFIGS,
  WEATHER_MAX_DURATION,
  WEATHER_MIN_DURATION,
  WEATHER_TYPES,
} from '@/config/weather';

describe('weather configuration', () => {
  it('has 4 weather types', () => {
    expect(WEATHER_TYPES).toHaveLength(4);
  });

  it('all types have configs', () => {
    for (const type of WEATHER_TYPES) {
      const config = WEATHER_CONFIGS[type];
      expect(config).toBeDefined();
      expect(config.type).toBe(type);
      expect(typeof config.grassSpeedMult).toBe('number');
      expect(typeof config.shallowsBlocked).toBe('boolean');
      expect(typeof config.visionMult).toBe('number');
      expect(typeof config.projectileOffset).toBe('number');
    }
  });

  it('duration constants are reasonable', () => {
    expect(WEATHER_MIN_DURATION).toBe(10800); // 3 min
    expect(WEATHER_MAX_DURATION).toBe(18000); // 5 min
    expect(WEATHER_MIN_DURATION).toBeLessThan(WEATHER_MAX_DURATION);
  });

  it('createWeatherState produces valid transition frame', () => {
    const state = createWeatherState(42, 100);
    expect(state.nextTransitionFrame).toBeGreaterThan(100);
    expect(state.nextTransitionFrame).toBeLessThanOrEqual(100 + WEATHER_MAX_DURATION);
    expect(state.nextTransitionFrame).toBeGreaterThanOrEqual(100 + WEATHER_MIN_DURATION);
  });
});
