/**
 * PuzzleComplete — Completion screen after finishing a puzzle.
 * US1: Stars earned, time taken, "Next Puzzle" button.
 */

import { Frame9Slice } from '../components/frame';

export interface PuzzleCompleteProps {
  puzzleName: string;
  starsEarned: number;
  timeTaken: string;
  hasNext: boolean;
  onNextPuzzle: () => void;
  onRetry: () => void;
  onBack: () => void;
}

function StarDisplay({ earned, max }: { earned: number; max: number }) {
  return (
    <span class="flex gap-1 justify-center">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          style={{
            color: i < earned ? 'var(--pw-achievement)' : 'var(--pw-text-muted)',
            fontSize: '28px',
          }}
        >
          {'\u2605'}
        </span>
      ))}
    </span>
  );
}

export function PuzzleComplete({
  puzzleName,
  starsEarned,
  timeTaken,
  hasNext,
  onNextPuzzle,
  onRetry,
  onBack,
}: PuzzleCompleteProps) {
  return (
    <div class="absolute inset-0 z-[60] flex items-center justify-center modal-overlay">
      <div class="absolute inset-0" style={{ background: 'var(--pw-overlay-dark)' }} />
      <div class="relative max-w-sm w-[90%]">
        <Frame9Slice>
          <div class="p-6 text-center">
            <h2 class="font-heading text-xl mb-1" style={{ color: 'var(--pw-accent)' }}>
              Puzzle Complete!
            </h2>
            <p class="font-heading text-sm mb-3" style={{ color: 'var(--pw-text-secondary)' }}>
              {puzzleName}
            </p>

            <div class="mb-3">
              <StarDisplay earned={starsEarned} max={3} />
            </div>

            <div class="mb-4">
              <span class="font-numbers text-sm" style={{ color: 'var(--pw-text-muted)' }}>
                Time: {timeTaken}
              </span>
            </div>

            <div class="flex gap-2 justify-center flex-wrap">
              {hasNext && (
                <button
                  type="button"
                  class="action-btn px-4 py-2 font-heading text-xs"
                  style={{ color: 'var(--pw-accent)' }}
                  onClick={onNextPuzzle}
                  data-testid="puzzle-next-btn"
                >
                  Next Puzzle
                </button>
              )}
              <button
                type="button"
                class="action-btn px-4 py-2 font-heading text-xs"
                style={{ color: 'var(--pw-warning)' }}
                onClick={onRetry}
                data-testid="puzzle-retry-btn"
              >
                Retry
              </button>
              <button
                type="button"
                class="action-btn px-4 py-2 font-heading text-xs"
                style={{ color: 'var(--pw-text-muted)' }}
                onClick={onBack}
              >
                Back
              </button>
            </div>
          </div>
        </Frame9Slice>
      </div>
    </div>
  );
}
