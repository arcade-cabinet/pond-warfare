import type { MapScenario } from '@/ui/store';

export type BiomeAccent =
  | 'cricket'
  | 'frog'
  | 'ripple'
  | 'wind'
  | 'reed'
  | 'wave'
  | 'gull'
  | 'drum'
  | 'drip'
  | 'current'
  | 'stone';

export interface BiomeAudioProfile {
  baseFrequency: number;
  shimmerFrequency: number;
  eventMinMs: number;
  eventMaxMs: number;
  dayAccents: readonly BiomeAccent[];
  nightAccents: readonly BiomeAccent[];
}

export const BIOME_AUDIO_PROFILES: Record<MapScenario, BiomeAudioProfile> = {
  standard: {
    baseFrequency: 280,
    shimmerFrequency: 950,
    eventMinMs: 2500,
    eventMaxMs: 4500,
    dayAccents: ['wind', 'reed', 'ripple'],
    nightAccents: ['cricket', 'frog', 'ripple'],
  },
  island: {
    baseFrequency: 240,
    shimmerFrequency: 1150,
    eventMinMs: 2600,
    eventMaxMs: 4200,
    dayAccents: ['wave', 'gull', 'ripple'],
    nightAccents: ['wave', 'gull', 'frog'],
  },
  contested: {
    baseFrequency: 220,
    shimmerFrequency: 840,
    eventMinMs: 1800,
    eventMaxMs: 3200,
    dayAccents: ['drum', 'wind', 'ripple'],
    nightAccents: ['drum', 'frog', 'ripple'],
  },
  labyrinth: {
    baseFrequency: 320,
    shimmerFrequency: 760,
    eventMinMs: 3000,
    eventMaxMs: 4800,
    dayAccents: ['drip', 'ripple', 'reed'],
    nightAccents: ['drip', 'cricket', 'frog'],
  },
  river: {
    baseFrequency: 260,
    shimmerFrequency: 1080,
    eventMinMs: 2200,
    eventMaxMs: 3800,
    dayAccents: ['current', 'wave', 'ripple'],
    nightAccents: ['current', 'frog', 'ripple'],
  },
  peninsula: {
    baseFrequency: 300,
    shimmerFrequency: 1180,
    eventMinMs: 2600,
    eventMaxMs: 4300,
    dayAccents: ['wind', 'stone', 'wave'],
    nightAccents: ['wind', 'stone', 'cricket'],
  },
};
