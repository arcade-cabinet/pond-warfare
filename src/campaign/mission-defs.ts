/**
 * Campaign Mission Definitions
 *
 * All 5 campaign missions in order.
 */

import { EK, type MissionDef } from './mission-types';

const mission1: MissionDef = {
  id: 'first-dawn',
  number: 1,
  title: 'First Dawn',
  subtitle: 'Learn the basics of survival',
  briefing: [
    'Welcome, Commander. The pond is quiet... for now.',
    '',
    'Our scouts have found a suitable clearing to establish a base.',
    'Build an Armory to unlock military training, then recruit',
    '3 Brawlers to defend our territory.',
    '',
    'The wildlife seems calm. Use this time wisely.',
  ].join('\n'),
  objectives: [
    {
      id: 'build-armory',
      type: 'build',
      label: 'Build an Armory',
      entityKind: EK.Armory,
      count: 1,
    },
    {
      id: 'train-brawlers',
      type: 'train',
      label: 'Train 3 Brawlers',
      entityKind: EK.Brawler,
      count: 3,
    },
  ],
  dialogues: [
    {
      frame: 60,
      text: 'Welcome, Commander. Click me to select, then right-click to move.',
      duration: 240,
    },
    {
      frame: 360,
      text: 'Send gatherers to those Clam deposits. We need resources!',
      duration: 180,
    },
    {
      frame: 900,
      text: 'Now build an Armory so we can train fighters. Click Build in the panel.',
      duration: 180,
    },
    {
      frame: 2400,
      text: "Good work! Train some Brawlers. They're tough in close combat.",
      duration: 180,
    },
  ],
  settingsOverrides: {
    scenario: 'standard',
    enemyNests: 1,
    enemyAggression: 'passive',
    peaceMinutes: 8,
    fogOfWar: 'explored',
    resourceDensity: 'rich',
  },
  worldOverrides: {
    disableEnemyAttacksUntilObjectivesDone: true,
  },
};

const mission2: MissionDef = {
  id: 'into-the-fog',
  number: 2,
  title: 'Into the Fog',
  subtitle: 'Explore the unknown and expand',
  briefing: [
    'The pond stretches far beyond our clearing.',
    '',
    "We need to explore at least half the map to understand what we're",
    'dealing with, and establish a second Lodge to secure our expansion.',
    '',
    'Enemy scouts have been spotted. Stay alert.',
  ].join('\n'),
  objectives: [
    { id: 'explore-map', type: 'explore', label: 'Explore 50% of the map', percent: 50 },
    {
      id: 'build-second-lodge',
      type: 'buildCount',
      label: 'Build a second Lodge',
      entityKind: EK.Lodge,
      count: 2,
    },
  ],
  dialogues: [
    { frame: 60, text: 'Commander, the fog hides both danger and opportunity.', duration: 180 },
    { frame: 300, text: 'Send the Scout ahead. We need eyes on the terrain.', duration: 180 },
    {
      frame: 1200,
      text: "Good scouting! Now let's expand. Build a second Lodge at a strategic location.",
      duration: 180,
    },
    { frame: 3600, text: 'Keep pushing into the fog. Knowledge is power.', duration: 150 },
  ],
  settingsOverrides: {
    scenario: 'standard',
    enemyNests: 1,
    enemyAggression: 'normal',
    peaceMinutes: 2,
    startingResourcesMult: 1.5,
    fogOfWar: 'full',
    resourceDensity: 'rich',
  },
};

const mission3: MissionDef = {
  id: 'the-nest-must-fall',
  number: 3,
  title: 'The Nest Must Fall',
  subtitle: 'Destroy the enemy stronghold',
  briefing: [
    "We've located an enemy nest nearby. It must be destroyed.",
    '',
    'The predators have fortified with towers and a garrison.',
    "Build up your army and strike hard. Don't give them time",
    'to reinforce.',
    '',
    'Victory requires the complete destruction of the nest.',
  ].join('\n'),
  objectives: [
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
      text: 'Build up your forces. We need Brawlers and Snipers for this fight.',
      duration: 180,
    },
    {
      frame: 2400,
      text: 'The enemy is training defenders. We should strike before they get stronger.',
      duration: 180,
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
  worldOverrides: {},
};

const mission4: MissionDef = {
  id: 'evolution',
  number: 4,
  title: 'Evolution',
  subtitle: 'Survive the accelerated evolution',
  briefing: [
    'Something is wrong. The predators are evolving at an alarming rate.',
    '',
    'New, deadlier species are emerging every 2 minutes instead of',
    'the usual 5. You must adapt your army composition to survive',
    'through 3 full evolution tiers.',
    '',
    'Keep your Lodge standing. That is all that matters.',
  ].join('\n'),
  objectives: [
    { id: 'survive-tier-3', type: 'survive', label: 'Survive to Evolution Tier 3', tier: 3 },
  ],
  dialogues: [
    {
      frame: 60,
      text: 'Commander, the enemy is evolving fast. Prepare for anything.',
      duration: 180,
    },
    {
      frame: 1800,
      text: "They're getting stronger! Diversify your army -- Brawlers alone won't cut it.",
      duration: 180,
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
  },
};

const mission5: MissionDef = {
  id: 'alpha-strike',
  number: 5,
  title: 'Alpha Strike',
  subtitle: 'Defeat the Alpha Predator',
  briefing: [
    'This is it, Commander. The Alpha Predator has emerged.',
    '',
    'It leads a massive army of the most evolved predators.',
    'The enemy starts at maximum evolution. You have been granted',
    'extra resources and a full tech tree to match.',
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
      text: 'Use everything at your disposal. Full tech tree is unlocked.',
      duration: 180,
    },
    {
      frame: 2400,
      text: 'The Alpha is powerful. Focus fire and protect your healers.',
      duration: 180,
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

export const CAMPAIGN_MISSIONS: MissionDef[] = [mission1, mission2, mission3, mission4, mission5];
