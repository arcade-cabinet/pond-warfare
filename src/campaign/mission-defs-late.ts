/**
 * Campaign Mission Definitions — Missions 3-5
 *
 * Split from mission-defs.ts to stay under 300 LOC.
 *   3) The Nest Must Fall — Warfare + Fortifications intro
 *   4) Evolution — Shadow branch intro
 *   5) Alpha Strike — full 5-branch arsenal
 */

import { EK, type MissionDef } from './mission-types';

export const mission3: MissionDef = {
  id: 'the-nest-must-fall',
  number: 3,
  title: 'The Nest Must Fall',
  subtitle: 'Destroy the enemy stronghold',
  recommendedBranch: 'warfare',
  briefing: [
    "We've located an enemy nest nearby. It must be destroyed.",
    '',
    'The predators have fortified with towers and a garrison.',
    'Research Sharp Sticks at the Armory to boost your melee damage,',
    'then build up your army and strike hard.',
    '',
    "We've reinforced our buildings with Sturdy Mud from the",
    'Fortifications branch. Your base should hold while you attack.',
  ].join('\n'),
  objectives: [
    {
      id: 'research-sharp-sticks',
      type: 'research',
      label: 'Research Sharp Sticks at the Armory',
      techId: 'sharpSticks',
    },
    { id: 'destroy-nest', type: 'destroyNest', label: 'Destroy 1 Enemy Nest', count: 1 },
  ],
  dialogues: [
    {
      frame: 60,
      text: "Commander, the enemy nest is northeast. Let's prepare an assault.",
      duration: 180,
    },
    {
      frame: 600,
      text: 'Research Sharp Sticks at the Armory. The Warfare branch makes our fighters deadlier.',
      duration: 210,
    },
    {
      frame: 1200,
      text: 'Sturdy Mud is already active. Our buildings can take a beating while we push out.',
      duration: 210,
    },
    {
      frame: 2400,
      text: 'The enemy is training defenders. Strike before they get stronger.',
      duration: 180,
    },
    {
      frame: 3600,
      text: 'If you researched Nature, train Divers to scout underwater paths to the nest.',
      duration: 210,
    },
    { frame: 5400, text: "Time's running out. Launch the attack!", duration: 150 },
  ],
  settingsOverrides: {
    scenario: 'standard',
    enemyNests: 1,
    enemyAggression: 'aggressive',
    peaceMinutes: 2,
    fogOfWar: 'full',
    resourceDensity: 'normal',
  },
  worldOverrides: {
    startingTech: ['sturdyMud'],
  },
};

export const mission4: MissionDef = {
  id: 'evolution',
  number: 4,
  title: 'Evolution',
  subtitle: 'Adapt across all branches to survive',
  recommendedBranch: 'shadow',
  briefing: [
    'Something is wrong. The predators are evolving at an alarming rate.',
    '',
    'New, deadlier species are emerging every 2 minutes instead of',
    'the usual 5. You already know Sharp Sticks and Herbal Medicine.',
    'Now research Swift Paws from the Shadow branch to outmaneuver',
    'these faster predators.',
    '',
    'Adapt your strategy across all branches. Keep your Lodge standing.',
  ].join('\n'),
  objectives: [
    {
      id: 'research-swift-paws',
      type: 'research',
      label: 'Research Swift Paws (Shadow branch)',
      techId: 'swiftPaws',
    },
    { id: 'survive-tier-3', type: 'survive', label: 'Survive to Evolution Tier 3', tier: 3 },
  ],
  dialogues: [
    {
      frame: 60,
      text: 'Commander, the enemy is evolving fast. Prepare for anything.',
      duration: 180,
    },
    {
      frame: 600,
      text: 'Research Swift Paws at the Lodge. The Shadow branch gives us speed to dodge attacks.',
      duration: 210,
    },
    {
      frame: 1800,
      text: "They're getting stronger! Use all your branches -- heal, fortify, and strike.",
      duration: 210,
    },
    { frame: 5400, text: 'Tier 2 enemies incoming. Build towers for defense!', duration: 180 },
    { frame: 9000, text: 'Almost there, Commander. Hold the line!', duration: 150 },
  ],
  settingsOverrides: {
    scenario: 'island',
    enemyNests: 2,
    enemyAggression: 'aggressive',
    peaceMinutes: 1,
    evolutionSpeed: 'fast',
    fogOfWar: 'full',
    resourceDensity: 'rich',
  },
  worldOverrides: {
    evolutionSpeedMod: 0.33,
    startingTech: ['sharpSticks', 'herbalMedicine'],
  },
};

export const mission4A: MissionDef = {
  id: 'predators-lair',
  number: 4,
  title: "Predator's Lair",
  subtitle: 'Assault the enemy nests with limited forces',
  recommendedBranch: 'shadow',
  briefing: [
    'Commander, our scouts have located three predator nests deeper in',
    'the swamp. This is a surgical strike -- no time for a full buildup.',
    '',
    'You start with a small strike force and limited resources.',
    'Sharp Sticks and Swift Paws are already researched.',
    'Use aggression and speed to destroy all 3 nests before',
    'they can overwhelm you with reinforcements.',
    '',
    'If you have Shadow tech, Berserkers can cut through defenders fast.',
  ].join('\n'),
  objectives: [
    { id: 'destroy-3-nests', type: 'destroyNest', label: 'Destroy 3 Enemy Nests', count: 3 },
  ],
  dialogues: [
    {
      frame: 60,
      text: 'Strike fast, Commander. We have limited troops but sharp weapons.',
      duration: 210,
    },
    {
      frame: 1200,
      text: 'Use Swift Paws to outmaneuver their patrols. Hit and run!',
      duration: 180,
    },
    { frame: 3600, text: 'Two nests down. One more to go -- stay focused!', duration: 150 },
  ],
  settingsOverrides: {
    scenario: 'contested',
    enemyNests: 3,
    enemyAggression: 'aggressive',
    peaceMinutes: 0,
    fogOfWar: 'full',
    resourceDensity: 'sparse',
  },
  worldOverrides: {
    startingTech: ['sharpSticks', 'swiftPaws'],
    startingResourcesMult: 0.5,
  },
};

export const mission4B: MissionDef = {
  id: 'siege-of-the-lodge',
  number: 4,
  title: 'Siege of the Lodge',
  subtitle: 'Survive 10 mega-waves of predators',
  recommendedBranch: 'fortifications',
  briefing: [
    'The predators are massing for an all-out assault on our Lodge.',
    'We have 10 mega-waves incoming. Survive them all.',
    '',
    'Sturdy Mud and Herbal Medicine are already researched.',
    'Build walls, towers, and healing huts. Fortify everything.',
    'Nature will be your shield.',
  ].join('\n'),
  objectives: [
    { id: 'survive-10-waves', type: 'survive', label: 'Survive 10 Mega-Waves', tier: 5 },
  ],
  dialogues: [
    { frame: 60, text: 'Fortify the Lodge, Commander. The swarm is coming.', duration: 210 },
    {
      frame: 1800,
      text: 'Herbal Medicine keeps our troops alive. Build Herbalist Huts!',
      duration: 180,
    },
    { frame: 5400, text: 'Wave after wave... hold the line, Commander!', duration: 150 },
  ],
  settingsOverrides: {
    scenario: 'island',
    enemyNests: 2,
    enemyAggression: 'relentless',
    peaceMinutes: 1,
    evolutionSpeed: 'fast',
    fogOfWar: 'explored',
    resourceDensity: 'rich',
  },
  worldOverrides: {
    startingTech: ['sturdyMud', 'herbalMedicine'],
    evolutionSpeedMod: 0.5,
  },
};

export const mission5: MissionDef = {
  id: 'alpha-strike',
  number: 5,
  title: 'Alpha Strike',
  subtitle: 'Unleash all 5 branches against the Alpha',
  briefing: [
    'This is it, Commander. The Alpha Predator has emerged.',
    '',
    'It leads a massive army of the most evolved predators.',
    'The enemy starts at maximum evolution. All 5 tech branches',
    'are unlocked -- Lodge, Nature, Warfare, Fortifications, and',
    'Shadow. Use every tool at your disposal.',
    '',
    'Deploy Warships from the Dock to bombard from the water.',
    'Send Engineers to build siege positions. Have your Shaman',
    'support the front line. Unleash Berserkers for the final push.',
    '',
    'Kill the Alpha. End this war.',
  ].join('\n'),
  objectives: [
    {
      id: 'kill-alpha',
      type: 'kill',
      label: 'Defeat the Alpha Predator',
      entityKind: EK.AlphaPredator,
      count: 1,
    },
  ],
  dialogues: [
    {
      frame: 60,
      text: 'The Alpha has appeared. This is our final battle, Commander.',
      duration: 240,
    },
    {
      frame: 600,
      text: 'All 5 branches are yours. Lodge, Nature, Warfare, Fortifications, Shadow -- use them all.',
      duration: 240,
    },
    {
      frame: 1800,
      text: 'Build a Dock for Warships. Engineers can create forward siege positions.',
      duration: 210,
    },
    {
      frame: 2400,
      text: 'The Alpha is powerful. Shamans can debuff it. Berserkers deal more damage as they bleed.',
      duration: 210,
    },
    { frame: 5400, text: 'Keep fighting! We can do this!', duration: 150 },
  ],
  settingsOverrides: {
    scenario: 'contested',
    enemyNests: 3,
    enemyAggression: 'relentless',
    peaceMinutes: 1,
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
