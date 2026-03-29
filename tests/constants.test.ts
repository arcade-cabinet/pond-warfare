/**
 * Constants & Palette Tests
 *
 * Validates the game world dimensions, color palette, day/night time stops,
 * and other game-wide constants as defined in src/constants.ts.
 *
 * These constants were documented in the POC reference file 03-constants-palette.js
 * and are the authoritative source for game balance and visual configuration.
 */

import { describe, expect, it } from 'vitest';
import {
  AGGRO_RADIUS_ENEMY,
  AGGRO_RADIUS_PLAYER,
  ALLY_ASSIST_RADIUS,
  ATTACK_COOLDOWN,
  AUTO_GATHER_RADIUS,
  BUILD_TIMER,
  BUILDING_SIGHT_RADIUS,
  CB_PALETTE,
  COLLISION_PUSH_FORCE,
  DAY_FRAMES,
  EXPLORED_SCALE,
  FOG_TEXTURE_SIZE,
  GATHER_AMOUNT,
  GATHER_TIMER,
  MAP_HEIGHT,
  MAP_WIDTH,
  MAX_WAVE_SIZE,
  MINIMAP_SIZE,
  PALETTE,
  PEACE_TIMER_FRAMES,
  PROJECTILE_SPEED,
  REPAIR_TIMER,
  SPEED_LEVELS,
  STARTING_CLAMS,
  STARTING_TWIGS,
  TILE_SIZE,
  TIME_STOPS,
  TOWER_ATTACK_COOLDOWN,
  TRAIN_TIMER,
  UNIT_SIGHT_RADIUS,
  WAVE_INTERVAL,
  WAVE_SCALE_INTERVAL,
  WORLD_BOUNDS_MARGIN,
  WORLD_HEIGHT,
  WORLD_WIDTH,
} from '@/constants';

describe('World Dimensions', () => {
  it('TILE_SIZE is 32', () => {
    expect(TILE_SIZE).toBe(32);
  });

  it('MAP_WIDTH is 80', () => {
    expect(MAP_WIDTH).toBe(80);
  });

  it('MAP_HEIGHT is 80', () => {
    expect(MAP_HEIGHT).toBe(80);
  });

  it('WORLD_WIDTH equals MAP_WIDTH * TILE_SIZE', () => {
    expect(WORLD_WIDTH).toBe(MAP_WIDTH * TILE_SIZE);
  });

  it('WORLD_HEIGHT equals MAP_HEIGHT * TILE_SIZE', () => {
    expect(WORLD_HEIGHT).toBe(MAP_HEIGHT * TILE_SIZE);
  });

  it('WORLD_WIDTH is 2560', () => {
    expect(WORLD_WIDTH).toBe(2560);
  });

  it('WORLD_HEIGHT is 2560', () => {
    expect(WORLD_HEIGHT).toBe(2560);
  });

  it('world is square', () => {
    expect(WORLD_WIDTH).toBe(WORLD_HEIGHT);
  });
});

describe('Game Timer Constants', () => {
  it('PEACE_TIMER_FRAMES is 10800', () => {
    expect(PEACE_TIMER_FRAMES).toBe(10800);
  });

  it('DAY_FRAMES is 28800', () => {
    expect(DAY_FRAMES).toBe(28800);
  });

  it('WAVE_INTERVAL is 1800', () => {
    expect(WAVE_INTERVAL).toBe(1800);
  });

  it('MAX_WAVE_SIZE is 6', () => {
    expect(MAX_WAVE_SIZE).toBe(6);
  });

  it('WAVE_SCALE_INTERVAL is 7200', () => {
    expect(WAVE_SCALE_INTERVAL).toBe(7200);
  });

  it('GATHER_AMOUNT is positive', () => {
    expect(GATHER_AMOUNT).toBeGreaterThan(0);
  });

  it('GATHER_TIMER is positive', () => {
    expect(GATHER_TIMER).toBeGreaterThan(0);
  });

  it('BUILD_TIMER is positive', () => {
    expect(BUILD_TIMER).toBeGreaterThan(0);
  });

  it('REPAIR_TIMER is positive', () => {
    expect(REPAIR_TIMER).toBeGreaterThan(0);
  });

  it('TRAIN_TIMER is 180', () => {
    expect(TRAIN_TIMER).toBe(180);
  });

  it('ATTACK_COOLDOWN is positive', () => {
    expect(ATTACK_COOLDOWN).toBeGreaterThan(0);
  });

  it('TOWER_ATTACK_COOLDOWN is less than ATTACK_COOLDOWN (towers shoot faster)', () => {
    expect(TOWER_ATTACK_COOLDOWN).toBeLessThan(ATTACK_COOLDOWN);
  });
});

describe('Starting Resources', () => {
  it('STARTING_CLAMS is 200', () => {
    expect(STARTING_CLAMS).toBe(200);
  });

  it('STARTING_TWIGS is 50', () => {
    expect(STARTING_TWIGS).toBe(50);
  });

  it('starting clams exceed starting twigs', () => {
    expect(STARTING_CLAMS).toBeGreaterThan(STARTING_TWIGS);
  });
});

describe('PALETTE', () => {
  const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;
  const RGBA_PATTERN = /^rgba\(\d+,\s*\d+,\s*\d+,\s*[\d.]+\)$/;

  it('has all required color keys', () => {
    const requiredKeys = [
      'otterBase',
      'otterBelly',
      'otterNose',
      'gatorBase',
      'gatorLight',
      'gatorEye',
      'snakeBase',
      'snakeStripe',
      'waterDeep',
      'waterMid',
      'waterShallow',
      'mudDark',
      'mudLight',
      'wood',
      'clamShell',
      'clamMeat',
      'reedGreen',
      'reedBrown',
      'stone',
      'stoneL',
      'shadow',
      'black',
    ];
    for (const key of requiredKeys) {
      expect(PALETTE).toHaveProperty(key);
    }
  });

  it('all non-shadow colors are valid hex codes', () => {
    const hexColors = Object.entries(PALETTE).filter(([key]) => key !== 'shadow');
    for (const [key, value] of hexColors) {
      expect(value, `${key} should be a hex color`).toMatch(HEX_PATTERN);
    }
  });

  it('shadow color is valid rgba', () => {
    expect(PALETTE.shadow).toMatch(RGBA_PATTERN);
  });

  it('black is #000000', () => {
    expect(PALETTE.black).toBe('#000000');
  });

  it('water colors are distinct shades', () => {
    expect(PALETTE.waterDeep).not.toBe(PALETTE.waterMid);
    expect(PALETTE.waterMid).not.toBe(PALETTE.waterShallow);
    expect(PALETTE.waterDeep).not.toBe(PALETTE.waterShallow);
  });

  it('otter body color differs from nose color', () => {
    expect(PALETTE.otterBase).not.toBe(PALETTE.otterNose);
  });

  it('mud colors are distinct', () => {
    expect(PALETTE.mudDark).not.toBe(PALETTE.mudLight);
  });

  it('stone color differs from light stone color', () => {
    expect(PALETTE.stone).not.toBe(PALETTE.stoneL);
  });
});

describe('CB_PALETTE (colorblind-friendly palette)', () => {
  const HEX_PATTERN = /^#[0-9a-fA-F]{6}$/;

  it('has all required accessibility palette keys', () => {
    const keys = [
      'playerColor',
      'enemyColor',
      'healthHigh',
      'healthMid',
      'healthLow',
      'gatherPositive',
      'gatherNegative',
    ];
    for (const key of keys) {
      expect(CB_PALETTE).toHaveProperty(key);
    }
  });

  it('all CB_PALETTE colors are valid hex codes', () => {
    for (const [key, value] of Object.entries(CB_PALETTE)) {
      expect(value, `${key} should be a hex color`).toMatch(HEX_PATTERN);
    }
  });

  it('healthHigh and healthLow are different colors', () => {
    expect(CB_PALETTE.healthHigh).not.toBe(CB_PALETTE.healthLow);
  });

  it('playerColor and enemyColor are distinguishable (different colors)', () => {
    expect(CB_PALETTE.playerColor).not.toBe(CB_PALETTE.enemyColor);
  });
});

describe('TIME_STOPS (day/night cycle)', () => {
  it('has exactly 8 stops', () => {
    expect(TIME_STOPS).toHaveLength(8);
  });

  it('starts at hour 0', () => {
    expect(TIME_STOPS[0].h).toBe(0);
  });

  it('ends at hour 24', () => {
    expect(TIME_STOPS[TIME_STOPS.length - 1].h).toBe(24);
  });

  it('hours are in non-decreasing order', () => {
    for (let i = 1; i < TIME_STOPS.length; i++) {
      expect(TIME_STOPS[i].h).toBeGreaterThanOrEqual(TIME_STOPS[i - 1].h);
    }
  });

  it('each stop has an RGB color array of length 3', () => {
    for (const stop of TIME_STOPS) {
      expect(stop.c).toHaveLength(3);
    }
  });

  it('all RGB components are in valid range [0, 255]', () => {
    for (const stop of TIME_STOPS) {
      for (const channel of stop.c) {
        expect(channel).toBeGreaterThanOrEqual(0);
        expect(channel).toBeLessThanOrEqual(255);
      }
    }
  });

  it('daytime (hour 8-18) uses full-white color for maximum brightness', () => {
    const dayStart = TIME_STOPS.find((s) => s.h === 8);
    const dayEnd = TIME_STOPS.find((s) => s.h === 18);
    expect(dayStart).toBeDefined();
    expect(dayEnd).toBeDefined();
    expect(dayStart!.c).toEqual([255, 255, 255]);
    expect(dayEnd!.c).toEqual([255, 255, 255]);
  });

  it('nighttime (hour 0 and 24) uses a dark color', () => {
    const nightStart = TIME_STOPS[0];
    const nightEnd = TIME_STOPS[TIME_STOPS.length - 1];
    const sumStart = nightStart.c[0] + nightStart.c[1] + nightStart.c[2];
    const sumEnd = nightEnd.c[0] + nightEnd.c[1] + nightEnd.c[2];
    expect(sumStart).toBeLessThan(100);
    expect(sumEnd).toBeLessThan(100);
  });

  it('midnight (h=0) and next-midnight (h=24) share the same color (seamless loop)', () => {
    const midnight = TIME_STOPS[0];
    const nextMidnight = TIME_STOPS[TIME_STOPS.length - 1];
    expect(midnight.c).toEqual(nextMidnight.c as any);
  });

  it('day is brighter than night (transition between h=5 and h=8)', () => {
    const nightStop = TIME_STOPS.find((s) => s.h === 5);
    const dayStop = TIME_STOPS.find((s) => s.h === 8);
    expect(nightStop).toBeDefined();
    expect(dayStop).toBeDefined();
    const nightBrightness = nightStop!.c[0] + nightStop!.c[1] + nightStop!.c[2];
    const dayBrightness = dayStop!.c[0] + dayStop!.c[1] + dayStop!.c[2];
    expect(dayBrightness).toBeGreaterThan(nightBrightness);
  });
});

describe('SPEED_LEVELS', () => {
  it('contains exactly 3 levels', () => {
    expect(SPEED_LEVELS).toHaveLength(3);
  });

  it('starts at 1x speed', () => {
    expect(SPEED_LEVELS[0]).toBe(1);
  });

  it('speeds are in ascending order', () => {
    for (let i = 1; i < SPEED_LEVELS.length; i++) {
      expect(SPEED_LEVELS[i]).toBeGreaterThan(SPEED_LEVELS[i - 1]);
    }
  });

  it('maximum speed is 3x', () => {
    expect(SPEED_LEVELS[SPEED_LEVELS.length - 1]).toBe(3);
  });

  it('all speed levels are positive integers', () => {
    for (const level of SPEED_LEVELS) {
      expect(level).toBeGreaterThan(0);
      expect(Number.isInteger(level)).toBe(true);
    }
  });
});

describe('Rendering Constants', () => {
  it('MINIMAP_SIZE is 200', () => {
    expect(MINIMAP_SIZE).toBe(200);
  });

  it('FOG_TEXTURE_SIZE is a power of 2 (GPU-friendly)', () => {
    const isPowerOf2 = (n: number) => n > 0 && (n & (n - 1)) === 0;
    expect(isPowerOf2(FOG_TEXTURE_SIZE)).toBe(true);
  });

  it('EXPLORED_SCALE is 16', () => {
    expect(EXPLORED_SCALE).toBe(16);
  });
});

describe('AI Radii', () => {
  it('UNIT_SIGHT_RADIUS is positive', () => {
    expect(UNIT_SIGHT_RADIUS).toBeGreaterThan(0);
  });

  it('BUILDING_SIGHT_RADIUS exceeds UNIT_SIGHT_RADIUS (buildings see farther)', () => {
    expect(BUILDING_SIGHT_RADIUS).toBeGreaterThan(UNIT_SIGHT_RADIUS);
  });

  it('AGGRO_RADIUS_ENEMY is positive', () => {
    expect(AGGRO_RADIUS_ENEMY).toBeGreaterThan(0);
  });

  it('AGGRO_RADIUS_PLAYER is positive', () => {
    expect(AGGRO_RADIUS_PLAYER).toBeGreaterThan(0);
  });

  it('AUTO_GATHER_RADIUS is positive', () => {
    expect(AUTO_GATHER_RADIUS).toBeGreaterThan(0);
  });

  it('ALLY_ASSIST_RADIUS is larger than AGGRO_RADIUS_PLAYER', () => {
    expect(ALLY_ASSIST_RADIUS).toBeGreaterThan(AGGRO_RADIUS_PLAYER);
  });

  it('COLLISION_PUSH_FORCE is a small positive fraction', () => {
    expect(COLLISION_PUSH_FORCE).toBeGreaterThan(0);
    expect(COLLISION_PUSH_FORCE).toBeLessThan(1);
  });

  it('WORLD_BOUNDS_MARGIN is positive', () => {
    expect(WORLD_BOUNDS_MARGIN).toBeGreaterThan(0);
  });

  it('PROJECTILE_SPEED is 8', () => {
    expect(PROJECTILE_SPEED).toBe(8);
  });
});