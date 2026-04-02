/**
 * WeatherEffects — Visual weather particle effects overlay.
 * US11: Rain drops, fog overlay, wind streaks rendered as lightweight CSS.
 * Placed as a pointer-events:none overlay on the game container.
 */

import { useMemo } from 'preact/hooks';
import { currentWeather } from '../store-weather';

/** Generate deterministic pseudo-random positions for particles. */
function seededPositions(count: number, seed: number): Array<{ x: number; y: number; d: number }> {
  let s = seed;
  const next = () => {
    s = (s * 1103515245 + 12345) & 0x7fffffff;
    return (s >>> 16) / 32768;
  };
  const result: Array<{ x: number; y: number; d: number }> = [];
  for (let i = 0; i < count; i++) {
    result.push({ x: next() * 100, y: next() * 100, d: next() });
  }
  return result;
}

function RainEffect() {
  const drops = useMemo(() => seededPositions(40, 42), []);

  return (
    <>
      {drops.map((drop, i) => (
        <div
          key={i}
          class="weather-rain-drop"
          style={{
            left: `${drop.x}%`,
            top: '-10px',
            animationDuration: `${0.6 + drop.d * 0.6}s`,
            animationDelay: `${drop.d * 2}s`,
          }}
        />
      ))}
    </>
  );
}

function FogEffect() {
  return <div class="weather-fog-overlay" />;
}

function WindEffect() {
  const streaks = useMemo(() => seededPositions(15, 99), []);

  return (
    <>
      {streaks.map((s, i) => (
        <div
          key={i}
          class="weather-wind-streak"
          style={{
            top: `${s.y}%`,
            left: '-100px',
            animationDuration: `${1.5 + s.d * 2}s`,
            animationDelay: `${s.d * 3}s`,
          }}
        />
      ))}
    </>
  );
}

export function WeatherEffects() {
  const weather = currentWeather.value;

  if (weather === 'clear') return null;

  return (
    <div class="absolute inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 15 }}>
      {weather === 'rain' && <RainEffect />}
      {weather === 'fog' && <FogEffect />}
      {weather === 'wind' && <WindEffect />}
    </div>
  );
}
