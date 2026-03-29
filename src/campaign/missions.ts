/**
 * Campaign Mission Definitions
 *
 * Each mission defines objectives, scripted dialogues, custom spawn rules,
 * and win/lose conditions. Missions are played in order; completing one
 * unlocks the next.
 */

import type { CustomGameSettings } from '@/ui/store';

// ---------------------------------------------------------------------------
// Dialogue step shown as floating text from the Commander
// ---------------------------------------------------------------------------

export interface MissionDialogue {
  /** Trigger frame (absolute game frame count). */
  frame: number;
  /** Text shown above the Commander. */
  text: string;
  /** Duration in frames the text remains visible. */
  duration: number;
}

// ---------------------------------------------------------------------------
// Objective types
// ---------------------------------------------------------------------------

export type ObjectiveType =
  | 'build' // Build a specific building kind
  | 'train' // Train N units of a specific kind
  | 'explore' // Explore X% of the map
  | 'destroyNest' // Destroy N enemy nests
  | 'survive' // Survive until a condition (evolution tier)
  | 'kill' // Kill a specific entity kind (e.g., AlphaPredator)
  | 'buildCount'; // Build N of a specific building (e.g., second Lodge)

export interface MissionObjective {
  id: string;
  type: ObjectiveType;
  label: string;
  /** EntityKind value for build/train/kill objectives. */
  entityKind?: number;
  /** Target count for train/destroyNest/buildCount. */
  count?: number;
  /** Target percentage for explore objectives (0-100). */
  percent?: number;
  /** Target evolution tier for survive objectives. */
  tier?: number;
}

// ---------------------------------------------------------------------------
// Mission definition
// ---------------------------------------------------------------------------

export interface MissionDef {
  id: string;
  /** Display number (1-5). */
  number: number;
  title: string;
  subtitle: string;
  /** Multi-line briefing text shown before the mission starts. */
  briefing: string;
  /** Objectives that must ALL be completed to win. */
  objectives: MissionObjective[];
  /** Scripted dialogue lines shown at specific frames. */
  dialogues: MissionDialogue[];
  /** Custom game settings overrides applied when starting this mission. */
  settingsOverrides: Partial<CustomGameSettings>;
  /** Extra world-level overrides applied after settings (peace timer, etc.). */
  worldOverrides?: {
    peaceTimerFrames?: number;
    startingClams?: number;
    startingTwigs?: number;
    evolutionSpeedMod?: number;
    nestCount?: number;
    heroMode?: boolean;
    fogOfWar?: 'full' | 'explored' | 'revealed';
    /** If true, suppress enemy AI attacks until all objectives are complete. */
    disableEnemyAttacksUntilObjectivesDone?: boolean;
    /** Spawn an Alpha Predator immediately. */
    spawnAlphaPredator?: boolean;
    /** Extra starting resources multiplier. */
    startingResourcesMult?: number;
    /** Start with full tech tree unlocked. */
    fullTechTree?: boolean;
    /** Start at max enemy evolution tier. */
    maxEnemyEvolution?: boolean;
  };
}

// ---------------------------------------------------------------------------
// Entity kind values (mirror of EntityKind enum to avoid circular imports)
// ---------------------------------------------------------------------------

const EK = {
  Brawler: 1,
  Lodge: 5,
  Armory: 7,
  PredatorNest: 9,
  Scout: 16,
  AlphaPredator: 24,
} as const;

// ---------------------------------------------------------------------------
// Mission 1: First Dawn (Tutorial)
// ---------------------------------------------------------------------------

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

// ---------------------------------------------------------------------------
// Mission 2: Into the Fog (Scouting & Expansion)
// ---------------------------------------------------------------------------

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
    {
      id: 'explore-map',
      type: 'explore',
      label: 'Explore 50% of the map',
      percent: 50,
    },
    {
      id: 'build-second-lodge',
      type: 'buildCount',
      label: 'Build a second Lodge',
      entityKind: EK.Lodge,
      count: 2,
    },
  ],
  dialogues: [
    {
      frame: 60,
      text: 'Commander, the fog hides both danger and opportunity.',
      duration: 180,
    },
    {
      frame: 300,
      text: 'Send the Scout ahead. We need eyes on the terrain.',
      duration: 180,
    },
    {
      frame: 1200,
      text: "Good scouting! Now let's expand. Build a second Lodge at a strategic location.",
      duration: 180,
    },
    {
      frame: 3600,
      text: 'Keep pushing into the fog. Knowledge is power.',
      duration: 150,
    },
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
    startingResourcesMult: 1.5,
  },
};

// ---------------------------------------------------------------------------
// Mission 3: The Nest Must Fall (Offense)
// ---------------------------------------------------------------------------

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
    {
      id: 'destroy-nest',
      type: 'destroyNest',
      label: 'Destroy 1 Enemy Nest',
      count: 1,
    },
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
    {
      frame: 5400,
      text: "Time's running out. Launch the attack!",
      duration: 150,
    },
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

// ---------------------------------------------------------------------------
// Mission 4: Evolution (Adaptation)
// ---------------------------------------------------------------------------

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
    {
      id: 'survive-tier-3',
      type: 'survive',
      label: 'Survive to Evolution Tier 3',
      tier: 3,
    },
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
    {
      frame: 5400,
      text: 'Tier 2 enemies incoming. Build towers for defense!',
      duration: 180,
    },
    {
      frame: 9000,
      text: 'Almost there, Commander. Hold the line!',
      duration: 150,
    },
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
    evolutionSpeedMod: 0.33, // ~2 min per tier instead of 5
  },
};

// ---------------------------------------------------------------------------
// Mission 5: Alpha Strike (Boss Battle)
// ---------------------------------------------------------------------------

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
    {
      frame: 5400,
      text: 'Keep fighting! We can do this!',
      duration: 150,
    },
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

// ---------------------------------------------------------------------------
// All missions in order
// ---------------------------------------------------------------------------

export const CAMPAIGN_MISSIONS: MissionDef[] = [mission1, mission2, mission3, mission4, mission5];

/** Look up a mission by its string ID. */
export function getMission(id: string): MissionDef | undefined {
  return CAMPAIGN_MISSIONS.find((m) => m.id === id);
}
