/**
 * AI Personality Configuration
 *
 * Defines AI behavior presets that modify how the enemy AI builds,
 * trains, and attacks. Applied as multipliers on top of difficulty settings.
 */

export type AIPersonality = 'balanced' | 'turtle' | 'rush' | 'economic' | 'random';

export interface PersonalityConfig {
  name: string;
  description: string;
  buildPriority: 'defense' | 'offense' | 'economy';
  /** Multiplier for army size before attacking. >1 = waits longer, <1 = attacks earlier. */
  attackThresholdMult: number;
  /** Multiplier for tower build rate. >1 = builds more towers, <1 = fewer. */
  towerBuildRate: number;
  /** Multiplier for expansion (nest building). >1 = expands faster, <1 = slower. */
  expansionRate: number;
  /** Preferred unit composition bias. */
  trainingPreference: 'melee' | 'ranged' | 'balanced' | 'siege';
}

export const AI_PERSONALITIES: Record<Exclude<AIPersonality, 'random'>, PersonalityConfig> = {
  balanced: {
    name: 'Balanced',
    description: 'Standard AI behavior with no particular bias.',
    buildPriority: 'offense',
    attackThresholdMult: 1.0,
    towerBuildRate: 1.0,
    expansionRate: 1.0,
    trainingPreference: 'balanced',
  },
  turtle: {
    name: 'Turtle',
    description: 'Builds heavy defenses and waits for a large army before striking.',
    buildPriority: 'defense',
    attackThresholdMult: 2.0,
    towerBuildRate: 2.5,
    expansionRate: 0.5,
    trainingPreference: 'ranged',
  },
  rush: {
    name: 'Rush',
    description: 'Attacks early and often with cheap melee units.',
    buildPriority: 'offense',
    attackThresholdMult: 0.3,
    towerBuildRate: 0.5,
    expansionRate: 0.2,
    trainingPreference: 'melee',
  },
  economic: {
    name: 'Economic',
    description: 'Expands aggressively and builds a massive late-game army.',
    buildPriority: 'economy',
    attackThresholdMult: 1.5,
    towerBuildRate: 0.5,
    expansionRate: 2.0,
    trainingPreference: 'balanced',
  },
};

/** Interval in frames before the "random" personality switches (5 minutes at 60fps). */
export const RANDOM_SWITCH_INTERVAL = 18000;

/** Available concrete personalities for the random switcher to cycle through. */
const CONCRETE_PERSONALITIES: Exclude<AIPersonality, 'random'>[] = [
  'balanced',
  'turtle',
  'rush',
  'economic',
];

/**
 * Resolve the active personality config.
 * For 'random', picks based on the current frame count cycling every RANDOM_SWITCH_INTERVAL.
 */
export function resolvePersonality(
  personality: AIPersonality,
  frameCount: number,
): PersonalityConfig {
  if (personality === 'random') {
    const idx = Math.floor(frameCount / RANDOM_SWITCH_INTERVAL) % CONCRETE_PERSONALITIES.length;
    return AI_PERSONALITIES[CONCRETE_PERSONALITIES[idx]];
  }
  return AI_PERSONALITIES[personality];
}
