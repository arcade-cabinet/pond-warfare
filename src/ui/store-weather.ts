/**
 * Store — Weather Signals
 *
 * Weather-related reactive state extracted from store.ts for file size compliance.
 */

import { computed, signal } from '@preact/signals';
import type { WeatherType } from '@/config/weather';

// ---- v2.0.0: Weather ----
export const currentWeather = signal<WeatherType>('clear');
export const nextWeather = signal<WeatherType>('clear');
/** Seconds until next weather transition. */
export const weatherCountdown = signal(0);

/** Weather display label for HUD. */
export const weatherLabel = computed(() => {
  const w = currentWeather.value;
  return w.charAt(0).toUpperCase() + w.slice(1);
});
