/**
 * PuzzleHud — Objective text, timer, and star target shown during puzzle gameplay.
 * US1: Puzzle HUD overlay during gameplay.
 */

import { puzzleObjectiveText, puzzleStars, puzzleTimerDisplay } from '../store-gameplay';

function StarDisplay({ earned, max }: { earned: number; max: number }) {
  return (
    <span class="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          style={{
            color: i < earned ? 'var(--pw-achievement)' : 'var(--pw-text-muted)',
            fontSize: '12px',
          }}
        >
          {'\u2605'}
        </span>
      ))}
    </span>
  );
}

export function PuzzleHud() {
  const objective = puzzleObjectiveText.value;
  const timer = puzzleTimerDisplay.value;
  const stars = puzzleStars.value;

  if (!objective) return null;

  return (
    <div
      class="absolute top-12 left-1/2 -translate-x-1/2 flex items-center gap-3 px-3 py-1.5 rounded-lg"
      style={{
        background: 'var(--pw-overlay-medium)',
        border: '1px solid var(--pw-border)',
        zIndex: 'var(--pw-z-hud)',
        backdropFilter: 'blur(6px)',
      }}
      data-testid="puzzle-hud"
    >
      <StarDisplay earned={stars} max={3} />
      <span class="font-game text-[11px]" style={{ color: 'var(--pw-text-primary)' }}>
        {objective}
      </span>
      {timer && (
        <span class="font-numbers text-xs font-bold" style={{ color: 'var(--pw-warning)' }}>
          {timer}
        </span>
      )}
    </div>
  );
}
