/**
 * WeatherIndicator — Top bar weather display.
 * US3: Shows current weather icon + label and countdown to next change.
 */

import { currentWeather, nextWeatherLabel, weatherCountdown, weatherLabel } from '../store-weather';

const WEATHER_ICONS: Record<string, string> = {
  clear: '\u2600', // sun
  rain: '\u{1F327}', // rain cloud
  fog: '\u{1F32B}', // fog
  wind: '\u{1F4A8}', // wind
};

const WEATHER_COLORS: Record<string, string> = {
  clear: 'var(--pw-weather-clear)',
  rain: 'var(--pw-weather-rain)',
  fog: 'var(--pw-weather-fog)',
  wind: 'var(--pw-weather-wind)',
};

function formatCountdown(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function WeatherIndicator({ compact }: { compact: boolean }) {
  const weather = currentWeather.value;
  const label = weatherLabel.value;
  const countdown = weatherCountdown.value;
  const nextLabel = nextWeatherLabel.value;
  const icon = WEATHER_ICONS[weather] || '';
  const color = WEATHER_COLORS[weather] || 'var(--pw-text-secondary)';

  return (
    <div class="flex items-center gap-1" title={`Weather: ${label}`}>
      <span style={{ fontSize: compact ? '12px' : '14px' }}>{icon}</span>
      {!compact && (
        <span class="font-heading text-[10px]" style={{ color }}>
          {label}
        </span>
      )}
      {countdown > 0 && (
        <span
          class="font-numbers text-[9px]"
          style={{ color: countdown < 30 ? 'var(--pw-warning)' : 'var(--pw-text-muted)' }}
        >
          {formatCountdown(countdown)}
        </span>
      )}
      {!compact && countdown > 0 && (
        <span class="font-numbers text-[9px]" style={{ color: 'var(--pw-text-muted)' }}>
          Next: {nextLabel} in {formatCountdown(countdown)}
        </span>
      )}
    </div>
  );
}
