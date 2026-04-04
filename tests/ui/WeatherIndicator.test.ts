/**
 * WeatherIndicator + WeatherEffects tests.
 * US3: Weather HUD indicator and US11: Weather visual effects.
 */
import { cleanup, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/platform', async () => {
  const { signal } = await import('@preact/signals');
  return {
    inputMode: signal('pointer'),
    screenClass: signal('large'),
    canDockPanels: signal(true),
  };
});

import { WeatherEffects } from '@/ui/hud/WeatherEffects';
import { WeatherIndicator } from '@/ui/hud/WeatherIndicator';
import { currentWeather, nextWeather, weatherCountdown } from '@/ui/store-weather';

afterEach(cleanup);

describe('WeatherIndicator', () => {
  it('renders weather label for clear weather', () => {
    currentWeather.value = 'clear';
    weatherCountdown.value = 120;
    render(h(WeatherIndicator, { compact: false }));
    expect(document.body.textContent).toContain('Clear');
  });

  it('renders weather label for rain', () => {
    currentWeather.value = 'rain';
    weatherCountdown.value = 60;
    render(h(WeatherIndicator, { compact: false }));
    expect(document.body.textContent).toContain('Rain');
  });

  it('shows countdown timer', () => {
    currentWeather.value = 'fog';
    weatherCountdown.value = 90;
    render(h(WeatherIndicator, { compact: false }));
    expect(document.body.textContent).toContain('1:30');
  });

  it('hides label in compact mode', () => {
    currentWeather.value = 'wind';
    weatherCountdown.value = 45;
    render(h(WeatherIndicator, { compact: true }));
    // Should not contain the text label in compact mode
    expect(document.body.textContent).not.toContain('Wind');
    // But should still show countdown
    expect(document.body.textContent).toContain('0:45');
  });

  it('shows forecast with next weather in non-compact mode', () => {
    currentWeather.value = 'clear';
    nextWeather.value = 'rain';
    weatherCountdown.value = 120;
    render(h(WeatherIndicator, { compact: false }));
    expect(document.body.textContent).toContain('Next: Rain in 2:00');
  });

  it('hides forecast in compact mode', () => {
    currentWeather.value = 'clear';
    nextWeather.value = 'fog';
    weatherCountdown.value = 60;
    render(h(WeatherIndicator, { compact: true }));
    expect(document.body.textContent).not.toContain('Next:');
  });
});

describe('WeatherEffects', () => {
  it('renders nothing for clear weather', () => {
    currentWeather.value = 'clear';
    const { container } = render(h(WeatherEffects, null));
    expect(container.children.length).toBe(0);
  });

  it('renders rain drops for rain weather', () => {
    currentWeather.value = 'rain';
    const { container } = render(h(WeatherEffects, null));
    const drops = container.querySelectorAll('.weather-rain-drop');
    expect(drops.length).toBeGreaterThan(0);
  });

  it('renders fog overlay for fog weather', () => {
    currentWeather.value = 'fog';
    const { container } = render(h(WeatherEffects, null));
    const fog = container.querySelector('.weather-fog-overlay');
    expect(fog).toBeTruthy();
  });

  it('renders wind streaks for wind weather', () => {
    currentWeather.value = 'wind';
    const { container } = render(h(WeatherEffects, null));
    const streaks = container.querySelectorAll('.weather-wind-streak');
    expect(streaks.length).toBeGreaterThan(0);
  });
});
