/**
 * Advanced Puzzle Definitions — Puzzles 6-10
 *
 * Five advanced puzzles testing naval, engineering, weather, berserker,
 * and full-economy gameplay.
 */

import { EntityKind } from '@/types';
import type { PuzzleDef } from './puzzles';

export const ADVANCED_PUZZLES: PuzzleDef[] = [
  {
    id: 'naval-ambush',
    name: 'Naval Ambush',
    description: '3 Divers + 1 Warship must destroy the enemy Dock before reinforcements arrive.',
    difficulty: 3,
    difficultyTier: 'intermediate',
    mapSeed: 42006,
    scenario: 'archipelago',
    playerUnits: [
      { kind: EntityKind.Diver, x: 300, y: 600 },
      { kind: EntityKind.Diver, x: 330, y: 620 },
      { kind: EntityKind.Diver, x: 360, y: 600 },
      { kind: EntityKind.OtterWarship, x: 250, y: 650 },
    ],
    enemyUnits: [
      { kind: EntityKind.ArmoredGator, x: 1900, y: 800 },
      { kind: EntityKind.Snake, x: 1850, y: 750 },
      { kind: EntityKind.Gator, x: 1950, y: 850 },
      { kind: EntityKind.VenomSnake, x: 1800, y: 900 },
    ],
    objective: {
      type: 'destroy',
      targetKind: EntityKind.Dock,
      targetCount: 1,
      description: 'Destroy the enemy Dock before reinforcements arrive',
    },
    trainingAllowed: false,
    buildingAllowed: false,
    parTimeFrames: 10800, // 3 minutes
    hint: 'Use Divers to scout underwater while the Warship bombards the Dock.',
  },
  {
    id: 'engineers-bridge',
    name: "Engineer's Bridge",
    description: '2 Engineers + 4 Brawlers must cross the river and destroy the nest.',
    difficulty: 3,
    difficultyTier: 'intermediate',
    mapSeed: 42007,
    scenario: 'river',
    playerUnits: [
      { kind: EntityKind.Engineer, x: 300, y: 1200 },
      { kind: EntityKind.Engineer, x: 330, y: 1220 },
      { kind: EntityKind.Brawler, x: 360, y: 1200 },
      { kind: EntityKind.Brawler, x: 390, y: 1220 },
      { kind: EntityKind.Brawler, x: 420, y: 1200 },
      { kind: EntityKind.Brawler, x: 450, y: 1220 },
    ],
    enemyUnits: [
      { kind: EntityKind.Gator, x: 1700, y: 400 },
      { kind: EntityKind.Gator, x: 1730, y: 420 },
      { kind: EntityKind.ArmoredGator, x: 1760, y: 400 },
    ],
    objective: {
      type: 'destroy',
      targetKind: EntityKind.PredatorNest,
      targetCount: 1,
      description: 'Cross the river and destroy the Predator Nest',
    },
    trainingAllowed: false,
    buildingAllowed: true,
    parTimeFrames: 14400, // 4 minutes
    hint: 'Engineers can build Walls as makeshift bridges. Protect them while building.',
  },
  {
    id: 'weather-warfare',
    name: 'Weather Warfare',
    description: '5 units must survive 5 minutes of changing weather conditions.',
    difficulty: 4,
    difficultyTier: 'intermediate',
    mapSeed: 42008,
    scenario: 'island',
    playerUnits: [
      { kind: EntityKind.Brawler, x: 1200, y: 1200 },
      { kind: EntityKind.Shieldbearer, x: 1230, y: 1220 },
      { kind: EntityKind.Healer, x: 1260, y: 1200 },
      { kind: EntityKind.Sniper, x: 1200, y: 1170 },
      { kind: EntityKind.Shaman, x: 1230, y: 1170 },
    ],
    enemyUnits: [
      { kind: EntityKind.Gator, x: 600, y: 600 },
      { kind: EntityKind.Snake, x: 1800, y: 600 },
      { kind: EntityKind.VenomSnake, x: 600, y: 1800 },
      { kind: EntityKind.ArmoredGator, x: 1800, y: 1800 },
      { kind: EntityKind.SwampDrake, x: 1200, y: 400 },
    ],
    objective: {
      type: 'survive',
      surviveFrames: 18000, // 5 minutes
      description: 'Survive 5 minutes of extreme weather',
    },
    trainingAllowed: false,
    buildingAllowed: false,
    parTimeFrames: 18000,
    hint: 'Weather changes every 60 seconds. Adapt your positioning to each condition.',
  },
  {
    id: 'berserkers-last-stand',
    name: "The Berserker's Last Stand",
    description: '1 Berserker (200 HP) must kill 20 enemies before dying. No healing.',
    difficulty: 4,
    difficultyTier: 'intermediate',
    mapSeed: 42009,
    scenario: 'contested',
    playerUnits: [{ kind: EntityKind.Berserker, x: 1200, y: 1200 }],
    enemyUnits: [
      { kind: EntityKind.Snake, x: 800, y: 800 },
      { kind: EntityKind.Snake, x: 900, y: 750 },
      { kind: EntityKind.Gator, x: 1000, y: 700 },
      { kind: EntityKind.Gator, x: 1500, y: 800 },
      { kind: EntityKind.Snake, x: 1600, y: 900 },
      { kind: EntityKind.Snake, x: 700, y: 1400 },
      { kind: EntityKind.Gator, x: 1500, y: 1500 },
      { kind: EntityKind.VenomSnake, x: 800, y: 1600 },
    ],
    objective: {
      type: 'kill-count',
      targetCount: 20,
      description: 'Kill 20 enemies with the Berserker',
    },
    trainingAllowed: false,
    buildingAllowed: false,
    parTimeFrames: 14400, // 4 minutes
    hint: 'Berserkers deal more damage as HP drops. Pick off weak enemies first.',
  },
  {
    id: 'full-spectrum',
    name: 'Full Spectrum',
    description:
      'Build one of every building, research one tech per branch, train one of every unit.',
    difficulty: 5,
    difficultyTier: 'intermediate',
    mapSeed: 42010,
    scenario: 'standard',
    playerUnits: [
      { kind: EntityKind.Commander, x: 1200, y: 1200 },
      { kind: EntityKind.Gatherer, x: 1220, y: 1220 },
      { kind: EntityKind.Gatherer, x: 1240, y: 1200 },
      { kind: EntityKind.Gatherer, x: 1260, y: 1220 },
      { kind: EntityKind.Gatherer, x: 1280, y: 1200 },
    ],
    enemyUnits: [],
    objective: {
      type: 'build-all',
      description: 'Build every building, research 5 techs (one per branch), train every unit',
    },
    trainingAllowed: true,
    buildingAllowed: true,
    parTimeFrames: 36000, // 10 minutes
    hint: 'Start with economy buildings, then research one tech from each branch.',
  },
];
