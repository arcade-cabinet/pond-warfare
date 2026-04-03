/**
 * Campaign Mission Definitions — Missions 6-7
 *
 * Split from mission-defs-late.ts to stay under 300 LOC.
 *   6) The Siege — Wall-gate defense tutorial
 *   7) Allied Waters — Escort mission, teaches stances & rally points
 */

import { EK, type MissionDef } from './mission-types';

export const mission6: MissionDef = {
  id: 'the-siege',
  number: 6,
  title: 'The Siege',
  subtitle: 'Defend against relentless siege waves',
  recommendedBranch: 'fortifications',
  briefing: [
    'Commander, the enemy has massed Siege Turtles and Armored Gators',
    'for an all-out assault on our peninsula stronghold.',
    '',
    'Three waves are incoming. Use the Fortifications branch to build',
    'Walls and Gates around your base. Research Iron Shell to unlock',
    'Shieldbearers -- they can absorb massive damage at the front line.',
    '',
    'Fortified Walls are already researched. Position your defenses',
    'at the narrow land bridge before each wave hits.',
  ].join('\n'),
  objectives: [
    {
      id: 'research-iron-shell',
      type: 'research',
      label: 'Research Iron Shell (unlock Shieldbearers)',
      techId: 'ironShell',
    },
    {
      id: 'build-walls',
      type: 'buildCount',
      label: 'Build 4 Walls',
      entityKind: EK.Wall,
      count: 4,
    },
    {
      id: 'survive-siege-waves',
      type: 'survive',
      label: 'Survive 3 Siege Waves (Evolution Tier 3)',
      tier: 3,
    },
  ],
  dialogues: [
    {
      frame: 60,
      text: 'Commander, fortify the land bridge! Siege Turtles are slow but devastating.',
      duration: 240,
    },
    {
      frame: 600,
      text: 'Build Walls to funnel the enemy. Research Iron Shell for Shieldbearers.',
      duration: 210,
    },
    {
      frame: 1800,
      text: 'First wave incoming! Position Shieldbearers at the front.',
      duration: 180,
    },
    {
      frame: 3600,
      text: 'Armored Gators are tougher than regular ones. Focus fire!',
      duration: 180,
    },
    {
      frame: 5400,
      text: 'Final wave approaching. Hold the line, Commander!',
      duration: 150,
    },
  ],
  settingsOverrides: {
    scenario: 'peninsula',
    enemyNests: 2,
    enemyAggression: 'aggressive',
    peaceMinutes: 2,
    fogOfWar: 'explored',
    resourceDensity: 'rich',
    startingResourcesMult: 1.5,
  },
  worldOverrides: {
    startingTech: ['sturdyMud', 'fortifiedWalls', 'sharpSticks'],
  },
};

export const mission7: MissionDef = {
  id: 'allied-waters',
  number: 7,
  title: 'Allied Waters',
  subtitle: 'Escort the caravan through hostile territory',
  recommendedBranch: 'warfare',
  briefing: [
    'A friendly caravan must cross the river valley to reach safety.',
    'Predator ambushes are set along the route.',
    '',
    'Use Rally Points to position your forces ahead of the caravan.',
    'Research Eagle Eye for extra range on your Snipers, and use',
    'Battle Roar to boost damage near your Commander.',
    '',
    'The caravan follows a fixed path. If it takes too many losses,',
    'the mission fails. Destroy all enemy nests along the route',
    'to clear the path.',
  ].join('\n'),
  objectives: [
    {
      id: 'research-eagle-eye',
      type: 'research',
      label: 'Research Eagle Eye (+20% ranged range)',
      techId: 'eagleEye',
    },
    {
      id: 'destroy-ambush-nests',
      type: 'destroyNest',
      label: 'Destroy 2 Ambush Nests along the route',
      count: 2,
    },
    {
      id: 'survive-escort',
      type: 'survive',
      label: 'Survive to Evolution Tier 2 (escort complete)',
      tier: 2,
    },
  ],
  dialogues: [
    {
      frame: 60,
      text: 'Commander, the caravan is moving. Scout ahead and clear the route!',
      duration: 240,
    },
    {
      frame: 600,
      text: 'Set Rally Points ahead of the caravan. Your troops will hold position there.',
      duration: 210,
    },
    {
      frame: 1200,
      text: 'Ambush! Enemy nests are spawning attackers. Destroy them!',
      duration: 180,
    },
    {
      frame: 2400,
      text: 'Research Eagle Eye at the Armory. Snipers with extra range can cover more ground.',
      duration: 210,
    },
    {
      frame: 3600,
      text: 'Battle Roar boosts damage near the Commander. Lead from the front!',
      duration: 180,
    },
    {
      frame: 5400,
      text: 'Almost there! One more stretch to safety.',
      duration: 150,
    },
  ],
  settingsOverrides: {
    scenario: 'river',
    enemyNests: 2,
    enemyAggression: 'aggressive',
    peaceMinutes: 1,
    fogOfWar: 'full',
    resourceDensity: 'normal',
  },
  worldOverrides: {
    startingTech: ['sharpSticks', 'battleRoar'],
  },
};
