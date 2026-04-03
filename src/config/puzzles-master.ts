/**
 * Master Puzzle Definitions — Puzzles 16-20
 *
 * Five master-tier puzzles covering commander abilities, no-build aggression,
 * weather mastery, gauntlet navigation, and endgame boss fights.
 *
 * All puzzles in this file are "expert" difficulty tier.
 */

import { EntityKind } from '@/types';
import type { PuzzleDef } from './puzzles';

export const MASTER_PUZZLES: PuzzleDef[] = [
  // ---- Puzzle 16: Commander's Trial (Expert) ----
  {
    id: 'commanders-trial',
    name: "Commander's Trial",
    description: 'Win using ONLY commander abilities. Regular attacks are forbidden.',
    difficulty: 5,
    difficultyTier: 'expert',
    mapSeed: 42016,
    scenario: 'contested',
    playerUnits: [
      { kind: EntityKind.Commander, x: 600, y: 600 },
      { kind: EntityKind.Brawler, x: 620, y: 620 },
      { kind: EntityKind.Brawler, x: 640, y: 600 },
      { kind: EntityKind.Shieldbearer, x: 660, y: 620 },
      { kind: EntityKind.Healer, x: 580, y: 620 },
      { kind: EntityKind.Sniper, x: 600, y: 580 },
    ],
    enemyUnits: [
      { kind: EntityKind.Gator, x: 1800, y: 1800 },
      { kind: EntityKind.Gator, x: 1830, y: 1820 },
      { kind: EntityKind.ArmoredGator, x: 1860, y: 1800 },
      { kind: EntityKind.VenomSnake, x: 1800, y: 1860 },
    ],
    objective: {
      type: 'destroy',
      targetKind: EntityKind.PredatorNest,
      targetCount: 1,
      description: 'Destroy the Predator Nest using commander abilities only',
    },
    trainingAllowed: false,
    buildingAllowed: false,
    parTimeFrames: 18000, // 5 minutes
    hint: 'Time your commander ability for maximum impact. Manage cooldowns carefully.',
  },

  // ---- Puzzle 17: No Build Challenge (Expert) ----
  {
    id: 'no-build-challenge',
    name: 'No Build Challenge',
    description: 'Destroy the enemy base with only your starting 10 units. No building.',
    difficulty: 5,
    difficultyTier: 'expert',
    mapSeed: 42017,
    scenario: 'standard',
    playerUnits: [
      { kind: EntityKind.Brawler, x: 300, y: 300 },
      { kind: EntityKind.Brawler, x: 330, y: 320 },
      { kind: EntityKind.Brawler, x: 360, y: 300 },
      { kind: EntityKind.Sniper, x: 300, y: 270 },
      { kind: EntityKind.Sniper, x: 330, y: 270 },
      { kind: EntityKind.Shieldbearer, x: 360, y: 270 },
      { kind: EntityKind.Shieldbearer, x: 390, y: 300 },
      { kind: EntityKind.Healer, x: 310, y: 340 },
      { kind: EntityKind.Healer, x: 340, y: 340 },
      { kind: EntityKind.Commander, x: 345, y: 300 },
    ],
    enemyUnits: [
      { kind: EntityKind.Gator, x: 2000, y: 2000 },
      { kind: EntityKind.Gator, x: 2030, y: 2020 },
      { kind: EntityKind.ArmoredGator, x: 2060, y: 2000 },
      { kind: EntityKind.VenomSnake, x: 2000, y: 2060 },
      { kind: EntityKind.SwampDrake, x: 2030, y: 2060 },
    ],
    objective: {
      type: 'destroy',
      targetKind: EntityKind.PredatorNest,
      targetCount: 2,
      description: 'Destroy both Predator Nests with no building allowed',
    },
    trainingAllowed: false,
    buildingAllowed: false,
    parTimeFrames: 21600, // 6 minutes
    hint: 'Preserve every unit. Focus fire and pull back wounded units to heal.',
  },

  // ---- Puzzle 18: Weather Master (Expert) ----
  {
    id: 'weather-master',
    name: 'Weather Master',
    description: 'Survive 6 minutes as weather cycles every 2 minutes. Adapt or die.',
    difficulty: 5,
    difficultyTier: 'expert',
    mapSeed: 42018,
    scenario: 'island',
    playerUnits: [
      { kind: EntityKind.Commander, x: 1200, y: 1200 },
      { kind: EntityKind.Brawler, x: 1220, y: 1220 },
      { kind: EntityKind.Sniper, x: 1240, y: 1200 },
      { kind: EntityKind.Shaman, x: 1200, y: 1180 },
      { kind: EntityKind.Diver, x: 1260, y: 1220 },
      { kind: EntityKind.Shieldbearer, x: 1180, y: 1220 },
    ],
    enemyUnits: [
      { kind: EntityKind.Gator, x: 600, y: 600 },
      { kind: EntityKind.ArmoredGator, x: 1800, y: 600 },
      { kind: EntityKind.VenomSnake, x: 600, y: 1800 },
      { kind: EntityKind.SwampDrake, x: 1800, y: 1800 },
      { kind: EntityKind.SiegeTurtle, x: 1200, y: 400 },
      { kind: EntityKind.BurrowingWorm, x: 400, y: 1200 },
      { kind: EntityKind.FlyingHeron, x: 2000, y: 1200 },
    ],
    objective: {
      type: 'survive',
      surviveFrames: 21600, // 6 minutes
      description: 'Survive 6 minutes through 3 weather cycles',
    },
    trainingAllowed: false,
    buildingAllowed: false,
    parTimeFrames: 21600,
    hint: 'Each weather type changes combat dynamics. Reposition between cycles.',
  },

  // ---- Puzzle 19: The Gauntlet (Expert) ----
  {
    id: 'the-gauntlet',
    name: 'The Gauntlet',
    description: 'Navigate 5 units through a maze of enemy towers to reach the exit.',
    difficulty: 5,
    difficultyTier: 'expert',
    mapSeed: 42019,
    scenario: 'labyrinth',
    playerUnits: [
      { kind: EntityKind.Scout, x: 200, y: 200 },
      { kind: EntityKind.Diver, x: 230, y: 220 },
      { kind: EntityKind.Brawler, x: 260, y: 200 },
      { kind: EntityKind.Shieldbearer, x: 200, y: 230 },
      { kind: EntityKind.Healer, x: 230, y: 250 },
    ],
    enemyUnits: [
      { kind: EntityKind.Gator, x: 800, y: 600 },
      { kind: EntityKind.ArmoredGator, x: 1200, y: 1000 },
      { kind: EntityKind.VenomSnake, x: 1600, y: 800 },
      { kind: EntityKind.Snake, x: 1000, y: 1400 },
      { kind: EntityKind.Gator, x: 1400, y: 1600 },
    ],
    objective: {
      type: 'reach',
      targetX: 2200,
      targetY: 2200,
      description: 'Guide at least 1 unit through the gauntlet to the exit',
    },
    trainingAllowed: false,
    buildingAllowed: false,
    parTimeFrames: 14400, // 4 minutes
    hint: 'Scout ahead with the Scout. Use Shieldbearer to absorb tower fire.',
  },

  // ---- Puzzle 20: Endgame (Expert) ----
  {
    id: 'endgame',
    name: 'Endgame',
    description: 'Defeat the Alpha Predator with limited resources but full tech.',
    difficulty: 5,
    difficultyTier: 'expert',
    mapSeed: 42020,
    scenario: 'contested',
    playerUnits: [
      { kind: EntityKind.Commander, x: 800, y: 800 },
      { kind: EntityKind.Berserker, x: 830, y: 820 },
      { kind: EntityKind.Sniper, x: 860, y: 800 },
      { kind: EntityKind.Sniper, x: 770, y: 800 },
      { kind: EntityKind.Shieldbearer, x: 800, y: 830 },
      { kind: EntityKind.Shieldbearer, x: 830, y: 850 },
      { kind: EntityKind.Healer, x: 800, y: 770 },
      { kind: EntityKind.Shaman, x: 830, y: 770 },
    ],
    enemyUnits: [
      { kind: EntityKind.AlphaPredator, x: 1800, y: 1800 },
      { kind: EntityKind.ArmoredGator, x: 1750, y: 1780 },
      { kind: EntityKind.ArmoredGator, x: 1850, y: 1780 },
      { kind: EntityKind.SwampDrake, x: 1800, y: 1750 },
      { kind: EntityKind.VenomSnake, x: 1750, y: 1850 },
      { kind: EntityKind.VenomSnake, x: 1850, y: 1850 },
      { kind: EntityKind.SiegeTurtle, x: 1800, y: 1900 },
    ],
    objective: {
      type: 'destroy',
      targetKind: EntityKind.AlphaPredator,
      targetCount: 1,
      description: 'Defeat the Alpha Predator and its elite guard',
    },
    trainingAllowed: false,
    buildingAllowed: false,
    parTimeFrames: 21600, // 6 minutes
    hint: 'Separate the Alpha from its guards. Use Berserker when low HP for max damage.',
  },
];
