/**
 * PuzzleSelect — Puzzle selection screen showing all 10 puzzles.
 * US1: Name, description, star rating, locked/unlocked status, par time.
 */

import { PUZZLES, type PuzzleDef } from '@/config/puzzles';
import { screenClass } from '@/platform';

export interface PuzzleSelectProps {
  /** Stars earned per puzzle (by puzzle ID). 0 = not completed. */
  earnedStars: Record<string, number>;
  /** Which puzzles are unlocked (by puzzle ID). */
  unlockedPuzzles: Set<string>;
  onSelectPuzzle: (puzzle: PuzzleDef) => void;
  onClose: () => void;
}

function StarDisplay({ earned, max }: { earned: number; max: number }) {
  return (
    <span class="flex gap-0.5">
      {Array.from({ length: max }, (_, i) => (
        <span
          key={i}
          style={{
            color: i < earned ? 'var(--pw-achievement)' : 'var(--pw-text-muted)',
            fontSize: '14px',
          }}
        >
          {'\u2605'}
        </span>
      ))}
    </span>
  );
}

function formatParTime(frames: number): string {
  const sec = Math.floor(frames / 60);
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function DifficultyDots({ level }: { level: number }) {
  return (
    <span class="flex gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          class="inline-block w-1.5 h-1.5 rounded-full"
          style={{
            background: i < level ? 'var(--pw-warning)' : 'var(--pw-bar-track)',
          }}
        />
      ))}
    </span>
  );
}

export function PuzzleSelect({
  earnedStars,
  unlockedPuzzles,
  onSelectPuzzle,
  onClose,
}: PuzzleSelectProps) {
  const compact = screenClass.value !== 'large';

  return (
    <div class="absolute inset-0 z-[60] flex items-center justify-center modal-overlay">
      <div
        class="absolute inset-0"
        style={{ background: 'var(--pw-overlay-dark)' }}
        onClick={onClose}
      />
      <div
        class={`relative parchment-panel modal-scroll ${compact ? 'w-[95%] max-w-lg' : 'w-[700px]'} p-4`}
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-heading text-lg" style={{ color: 'var(--pw-accent)' }}>
            Puzzle Missions
          </h2>
          <button type="button" class="hud-btn px-3 py-1 text-xs" onClick={onClose}>
            Close
          </button>
        </div>

        <div class="grid gap-2">
          {PUZZLES.map((puzzle, idx) => {
            const unlocked = unlockedPuzzles.has(puzzle.id);
            const stars = earnedStars[puzzle.id] || 0;

            return (
              <button
                key={puzzle.id}
                type="button"
                class={`action-btn p-3 text-left flex items-start gap-3 ${unlocked ? '' : 'opacity-40 cursor-not-allowed'}`}
                disabled={!unlocked}
                onClick={() => unlocked && onSelectPuzzle(puzzle)}
                data-testid={`puzzle-card-${puzzle.id}`}
              >
                <div
                  class="flex-shrink-0 w-8 h-8 rounded flex items-center justify-center font-numbers font-bold"
                  style={{
                    background: unlocked ? 'var(--pw-accent-dim)' : 'var(--pw-stone-dark)',
                    color: unlocked ? 'var(--pw-text-primary)' : 'var(--pw-text-muted)',
                  }}
                >
                  {idx + 1}
                </div>
                <div class="flex-1 min-w-0">
                  <div class="flex items-center justify-between gap-2">
                    <span
                      class="font-heading text-xs truncate"
                      style={{ color: 'var(--pw-text-primary)' }}
                    >
                      {unlocked ? puzzle.name : 'Locked'}
                    </span>
                    <StarDisplay earned={stars} max={3} />
                  </div>
                  {unlocked && (
                    <>
                      <p
                        class="text-[10px] mt-0.5 line-clamp-2"
                        style={{ color: 'var(--pw-text-muted)' }}
                      >
                        {puzzle.description}
                      </p>
                      <div class="flex items-center gap-3 mt-1">
                        <DifficultyDots level={puzzle.difficulty} />
                        <span
                          class="font-numbers text-[9px]"
                          style={{ color: 'var(--pw-text-muted)' }}
                        >
                          Par: {formatParTime(puzzle.parTimeFrames)}
                        </span>
                      </div>
                    </>
                  )}
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
