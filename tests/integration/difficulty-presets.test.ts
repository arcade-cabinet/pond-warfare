/**
 * Difficulty Preset Integration Tests
 *
 * Verifies all 8 presets produce correct game parameters via applyDifficultyModifiers.
 */

import { beforeEach, describe, expect, it } from 'vitest';
import { STARTING_CLAMS, STARTING_TWIGS } from '@/constants';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { applyDifficultyModifiers } from '@/game/difficulty';
import { PRESETS, type PresetKey, presetToDifficulty } from '@/ui/new-game/presets';
import * as store from '@/ui/store';
import { DEFAULT_CUSTOM_SETTINGS } from '@/ui/store-types';

function applyPreset(world: GameWorld, key: PresetKey): void {
  store.customGameSettings.value = { ...DEFAULT_CUSTOM_SETTINGS, ...PRESETS[key] };
  store.selectedDifficulty.value = presetToDifficulty(key);
  applyDifficultyModifiers(world);
}

describe('Difficulty Presets', () => {
  let world: GameWorld;
  beforeEach(() => {
    world = createGameWorld();
  });

  it('each preset produces unique game parameters', () => {
    const keys: PresetKey[] = [
      'easy',
      'normal',
      'hard',
      'nightmare',
      'ultraNightmare',
      'sandbox',
      'speedrun',
      'survival',
    ];
    const sigs = new Set<string>();
    for (const key of keys) {
      const w = createGameWorld();
      applyPreset(w, key);
      sigs.add(
        [
          w.resources.clams,
          w.resources.twigs,
          w.peaceTimer,
          w.evolutionSpeedMod,
          w.enemyEconomyMod,
          w.resourceDensityMod,
          w.nestCountOverride,
          w.permadeath,
        ].join(','),
      );
    }
    expect(sigs.size).toBe(8);
  });

  describe('Easy', () => {
    beforeEach(() => applyPreset(world, 'easy'));

    it('starts with enough resources to build an Armory (180C 120T)', () => {
      expect(world.resources.clams).toBeGreaterThanOrEqual(180);
      expect(world.resources.twigs).toBeGreaterThanOrEqual(120);
      expect(world.resources.clams).toBe(Math.round(STARTING_CLAMS * 2.0));
    });

    it('has long peace and slow evolution', () => {
      expect(world.peaceTimer).toBe(4 * 3600);
      expect(world.evolutionSpeedMod).toBe(1.5);
    });
  });

  describe('Normal', () => {
    beforeEach(() => applyPreset(world, 'normal'));

    it('has base resources and 2-min peace for early tech', () => {
      expect(world.resources.clams).toBe(STARTING_CLAMS);
      expect(world.resources.twigs).toBe(STARTING_TWIGS);
      expect(world.peaceTimer).toBe(2 * 3600);
      expect(world.evolutionSpeedMod).toBe(1.0);
    });
  });

  describe('Sandbox', () => {
    beforeEach(() => applyPreset(world, 'sandbox'));

    it('has very high resources (3x) and long peace', () => {
      expect(world.resources.clams).toBe(Math.round(STARTING_CLAMS * 3.0));
      expect(world.resources.twigs).toBe(Math.round(STARTING_TWIGS * 3.0));
      expect(world.peaceTimer).toBe(10 * 3600);
    });

    it('has slow evolution, weak enemies, abundant density', () => {
      expect(world.evolutionSpeedMod).toBe(1.5);
      expect(world.enemyEconomyMod).toBe(0.5);
      expect(world.resourceDensityMod).toBe(2.0);
    });
  });

  describe('Speedrun', () => {
    beforeEach(() => applyPreset(world, 'speedrun'));

    it('has fast evo, fast gather, rich density, brief peace', () => {
      expect(world.evolutionSpeedMod).toBe(0.5);
      expect(world.gatherSpeedMod).toBe(0.6);
      expect(world.resourceDensityMod).toBe(1.5);
      expect(world.peaceTimer).toBe(1 * 3600);
    });
  });

  describe('Survival', () => {
    beforeEach(() => applyPreset(world, 'survival'));

    it('has no nests, fast evo, strong economy, relentless', () => {
      expect(world.nestCountOverride).toBe(0);
      expect(world.evolutionSpeedMod).toBe(0.5);
      expect(world.enemyEconomyMod).toBe(2.0);
      expect(world.enemyAggressionLevel).toBe('relentless');
    });
  });

  describe('Nightmare / Ultra', () => {
    it('nightmare has zero peace and fast evolution', () => {
      applyPreset(world, 'nightmare');
      expect(world.peaceTimer).toBe(0);
      expect(world.evolutionSpeedMod).toBe(0.5);
    });

    it('ultra nightmare enables permadeath with more nests', () => {
      const w1 = createGameWorld();
      const w2 = createGameWorld();
      applyPreset(w1, 'nightmare');
      applyPreset(w2, 'ultraNightmare');
      expect(w2.permadeath).toBe(true);
      expect(w2.nestCountOverride).toBeGreaterThan(w1.nestCountOverride);
    });
  });
});
