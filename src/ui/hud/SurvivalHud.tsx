/**
 * SurvivalHud — Wave counter and score display for survival mode.
 * US2: In-game wave counter in top bar with visual escalation.
 */

import { survivalScore, survivalWave } from '../store-gameplay';

export function SurvivalHud() {
  const wave = survivalWave.value;
  const score = survivalScore.value;

  if (wave === 0) return null;

  // Visual escalation: color shifts as waves increase
  const waveColor =
    wave >= 15
      ? 'var(--pw-hp-low)'
      : wave >= 10
        ? 'var(--pw-difficulty-nightmare)'
        : wave >= 5
          ? 'var(--pw-warning)'
          : 'var(--pw-accent)';

  return (
    <div class="flex items-center gap-2" data-testid="survival-hud">
      <div
        class="flex items-center gap-1 px-2 py-0.5 rounded"
        style={{
          background: 'var(--pw-bar-track)',
          border: '1px solid var(--pw-border)',
        }}
      >
        <span class="font-heading text-[10px]" style={{ color: waveColor }}>
          Wave
        </span>
        <span class="font-numbers text-xs font-bold" style={{ color: waveColor }}>
          {wave}
        </span>
      </div>
      <div
        class="flex items-center gap-1 px-2 py-0.5 rounded"
        style={{
          background: 'var(--pw-bar-track)',
          border: '1px solid var(--pw-border)',
        }}
      >
        <span class="font-numbers text-[10px]" style={{ color: 'var(--pw-achievement)' }}>
          {score.toLocaleString()}
        </span>
      </div>
    </div>
  );
}
