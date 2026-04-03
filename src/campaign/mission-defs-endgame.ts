/**
 * Campaign Mission Definitions — Missions 9-10
 *
 * Split from mission-defs-finale-late.ts to stay under 300 LOC.
 *   9)  Last Stand — Survival defense, surrounded on all sides
 *   10) Pond's End — Final boss encounter with Alpha Predator
 */

import { EK, type MissionDef } from './mission-types';

export const mission9: MissionDef = {
  id: 'last-stand',
  number: 9,
  title: 'Last Stand',
  subtitle: 'Survive escalating waves from all sides',
  recommendedBranch: 'nature',
  briefing: [
    'We are surrounded. Every predator species in the pond is',
    'converging on our island. No nests to destroy -- they come',
    'from the map edges in ever-increasing waves.',
    '',
    'You have 4 tech branches pre-researched. Use Nature healing',
    'to keep your forces alive, Fortifications for walls and towers,',
    'Warfare for damage, and Shadow for crowd control.',
    '',
    'Survive until Evolution Tier 4. Economy management is critical.',
  ].join('\n'),
  objectives: [
    {
      id: 'survive-tier-4',
      type: 'survive',
      label: 'Survive to Evolution Tier 4',
      tier: 4,
    },
    {
      id: 'build-defenses',
      type: 'buildCount',
      label: 'Build 6 Walls',
      entityKind: EK.Wall,
      count: 6,
    },
  ],
  dialogues: [
    {
      frame: 60,
      text: 'Commander, they are everywhere. Fortify the island and hold!',
      duration: 240,
    },
    {
      frame: 600,
      text: 'Build walls around every approach. Leave gaps for your units to sortie.',
      duration: 210,
    },
    {
      frame: 1800,
      text: 'Use Herbalist Huts behind your walls. Healers keep the front line alive.',
      duration: 210,
    },
    {
      frame: 3600,
      text: 'Tier 2 enemies inbound. Towers and traps will thin the herd.',
      duration: 180,
    },
    {
      frame: 7200,
      text: 'Tier 3! Everything we have, Commander. Hold the line!',
      duration: 180,
    },
    {
      frame: 9000,
      text: 'Almost there. Do not let them break through!',
      duration: 150,
    },
  ],
  settingsOverrides: {
    scenario: 'island',
    enemyNests: 0,
    enemyAggression: 'relentless',
    peaceMinutes: 1,
    evolutionSpeed: 'fast',
    fogOfWar: 'explored',
    resourceDensity: 'rich',
    startingResourcesMult: 1.5,
  },
  worldOverrides: {
    nestCount: 0,
    evolutionSpeedMod: 0.5,
    startingTech: [
      'sharpSticks',
      'herbalMedicine',
      'sturdyMud',
      'fortifiedWalls',
      'swiftPaws',
      'cunningTraps',
    ],
  },
};

export const mission10: MissionDef = {
  id: 'ponds-end',
  number: 10,
  title: "Pond's End",
  subtitle: 'Defeat the Alpha Predator and end the war',
  briefing: [
    'This is the final battle, Commander. The Alpha Predator has',
    'returned -- stronger than ever, flanked by two Siege Turtles.',
    '',
    'All 5 tech branches are unlocked. Build your ultimate army.',
    'Catapults for range. Shieldbearers for the front line. Shamans',
    'to debuff the boss. Divers to flank. Your Commander leads the charge.',
    '',
    'The Alpha has 5x HP and special attack patterns. Time your',
    'abilities carefully. This is everything we have trained for.',
  ].join('\n'),
  objectives: [
    {
      id: 'kill-alpha-final',
      type: 'kill',
      label: 'Defeat the Alpha Predator',
      entityKind: EK.AlphaPredator,
      count: 1,
    },
    {
      id: 'kill-siege-turtles',
      type: 'kill',
      label: 'Destroy 2 Siege Turtles',
      entityKind: EK.SiegeTurtle,
      count: 2,
    },
  ],
  dialogues: [
    {
      frame: 60,
      text: 'Commander, the Alpha has returned. This ends today.',
      duration: 240,
    },
    {
      frame: 600,
      text: 'All 5 branches are yours. Use every tool. Build Catapults, Shieldbearers, Shamans.',
      duration: 240,
    },
    {
      frame: 1800,
      text: 'Take out the Siege Turtles first. They protect the Alpha.',
      duration: 210,
    },
    {
      frame: 3600,
      text: 'The Alpha is exposed! Focus fire, use abilities, and push!',
      duration: 210,
    },
    {
      frame: 5400,
      text: 'One final push, Commander. End this war!',
      duration: 150,
    },
  ],
  settingsOverrides: {
    scenario: 'labyrinth',
    enemyNests: 3,
    enemyAggression: 'relentless',
    peaceMinutes: 2,
    evolutionSpeed: 'instant',
    resourceDensity: 'abundant',
    startingResourcesMult: 2.0,
  },
  worldOverrides: {
    startingResourcesMult: 2.0,
    fullTechTree: true,
    maxEnemyEvolution: true,
    spawnAlphaPredator: true,
    heroMode: true,
  },
};
