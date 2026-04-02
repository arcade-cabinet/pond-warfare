/**
 * Campaign Mission Definitions — Missions 1-2 & aggregate export
 *
 * Each mission progressively introduces 1-2 of the 5 tech branches:
 *   1) First Dawn  — basics + Lodge hint
 *   2) Into the Fog — Lodge + Nature intro
 *   3-5 in mission-defs-late.ts
 */

import { mission3, mission4, mission4A, mission4B, mission5 } from './mission-defs-late';
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
    'The Lodge holds secrets of the pond. Research Tidal Harvest',
    'there to help your gatherers collect faster.',
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
      frame: 1800,
      text: 'Tip: Research Tidal Harvest at the Lodge to gather 25% faster.',
      duration: 210,
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
    startingTech: ['cartography'],
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
    'dealing with. Research Cartography at the Lodge to reveal more',
    'of the terrain, then establish a second Lodge to secure expansion.',
    '',
    'The Nature branch holds healing knowledge. We have unlocked',
    'Herbal Medicine to get you started.',
  ].join('\n'),
  objectives: [
    {
      id: 'research-cartography',
      type: 'research',
      label: 'Research Cartography at the Lodge',
      techId: 'cartography',
    },
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
    {
      frame: 300,
      text: 'Research Cartography at the Lodge. It will help our scouts see further.',
      duration: 210,
    },
    {
      frame: 900,
      text: 'We have Herbal Medicine from the Nature branch. Build a Herbalist Hut for healers.',
      duration: 210,
    },
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
  worldOverrides: {
    startingTech: ['herbalMedicine'],
  },
};

export const CAMPAIGN_MISSIONS: MissionDef[] = [mission1, mission2, mission3, mission4, mission5];

/** Branching missions available after Mission 3. */
export const BRANCH_MISSIONS = { A: mission4A, B: mission4B } as const;
