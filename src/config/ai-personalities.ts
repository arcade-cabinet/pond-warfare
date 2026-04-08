/**
 * AI Personality Configuration
 *
 * Defines AI behavior presets that modify how the enemy AI builds,
 * trains, and attacks. Applied as multipliers on top of difficulty settings.
 *
 * Each personality produces measurably different game outcomes:
 * - Turtle: 2x towers, walls first, only attacks with army >= 10
 * - Rush: trains melee immediately, attacks within 90s, skips economy
 * - Economic: expands to 3 nests, 2x gatherers, huge late army
 * - Balanced: standard behavior
 * - Random: cycles every 3 minutes
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
  /** Multiplier for enemy harvester spawning rate. >1 = more harvesters, <1 = fewer. */
  gathererRate: number;
  /** Minimum army size before considering an attack (overrides dynamic threshold). */
  minArmyForAttack: number;
  /** Maximum gatherers per nest. Higher = more economic investment. */
  maxGatherersPerNest: number;
  /** How many nests the AI tries to build before switching to army. */
  targetNestCount: number;
  /** Multiplier for training speed (lower interval = faster training). */
  trainSpeedMult: number;
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
    gathererRate: 1.0,
    minArmyForAttack: 5,
    maxGatherersPerNest: 3,
    targetNestCount: 2,
    trainSpeedMult: 1.0,
  },
  turtle: {
    name: 'Turtle',
    description: 'Builds heavy defenses and waits for a massive army.',
    buildPriority: 'defense',
    attackThresholdMult: 2.5,
    towerBuildRate: 2.5,
    expansionRate: 0.3,
    trainingPreference: 'ranged',
    gathererRate: 1.2,
    minArmyForAttack: 10,
    maxGatherersPerNest: 4,
    targetNestCount: 1,
    trainSpeedMult: 0.8,
  },
  rush: {
    name: 'Rush',
    description: 'Attacks early and often, skipping economy for speed.',
    buildPriority: 'offense',
    attackThresholdMult: 0.2,
    towerBuildRate: 0.0,
    expansionRate: 0.0,
    trainingPreference: 'melee',
    gathererRate: 0.3,
    minArmyForAttack: 3,
    maxGatherersPerNest: 1,
    targetNestCount: 1,
    trainSpeedMult: 1.5,
  },
  economic: {
    name: 'Economic',
    description: 'Expands aggressively for a devastating late-game army.',
    buildPriority: 'economy',
    attackThresholdMult: 1.8,
    towerBuildRate: 0.5,
    expansionRate: 2.5,
    trainingPreference: 'balanced',
    gathererRate: 2.0,
    minArmyForAttack: 8,
    maxGatherersPerNest: 6,
    targetNestCount: 3,
    trainSpeedMult: 1.2,
  },
};

/** Interval in frames before the "random" personality switches (3 minutes at 60fps). */
export const RANDOM_SWITCH_INTERVAL = 10800;

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
