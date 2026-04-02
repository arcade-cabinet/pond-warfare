/**
 * PuzzleSelect + PuzzleComplete + PuzzleHud tests.
 * US1: Puzzle mode UI components.
 */
import { cleanup, fireEvent, render } from '@testing-library/preact';
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

import { PUZZLES } from '@/config/puzzles';
import { PuzzleHud } from '@/ui/hud/PuzzleHud';
import { PuzzleComplete } from '@/ui/screens/PuzzleComplete';
import { PuzzleSelect } from '@/ui/screens/PuzzleSelect';
import { puzzleObjectiveText, puzzleStars, puzzleTimerDisplay } from '@/ui/store-gameplay';

afterEach(cleanup);

describe('PuzzleSelect', () => {
  const allUnlocked = new Set(PUZZLES.map((p) => p.id));
  const noStars: Record<string, number> = {};

  it('renders all 10 puzzle cards', () => {
    const onSelect = vi.fn();
    render(
      h(PuzzleSelect, {
        earnedStars: noStars,
        unlockedPuzzles: allUnlocked,
        onSelectPuzzle: onSelect,
        onClose: vi.fn(),
      }),
    );
    for (const puzzle of PUZZLES) {
      const card = document.querySelector(`[data-testid="puzzle-card-${puzzle.id}"]`);
      expect(card).toBeTruthy();
    }
  });

  it('shows puzzle name and description for unlocked puzzles', () => {
    render(
      h(PuzzleSelect, {
        earnedStars: noStars,
        unlockedPuzzles: allUnlocked,
        onSelectPuzzle: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    expect(document.body.textContent).toContain(PUZZLES[0].name);
    expect(document.body.textContent).toContain(PUZZLES[0].description);
  });

  it('shows "Locked" for locked puzzles', () => {
    const onlyFirst = new Set([PUZZLES[0].id]);
    render(
      h(PuzzleSelect, {
        earnedStars: noStars,
        unlockedPuzzles: onlyFirst,
        onSelectPuzzle: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    // Second puzzle should show "Locked"
    const card = document.querySelector(`[data-testid="puzzle-card-${PUZZLES[1].id}"]`);
    expect(card?.textContent).toContain('Locked');
  });

  it('calls onSelectPuzzle when an unlocked puzzle is clicked', () => {
    const onSelect = vi.fn();
    render(
      h(PuzzleSelect, {
        earnedStars: noStars,
        unlockedPuzzles: allUnlocked,
        onSelectPuzzle: onSelect,
        onClose: vi.fn(),
      }),
    );
    const card = document.querySelector(`[data-testid="puzzle-card-${PUZZLES[0].id}"]`);
    if (card) fireEvent.click(card);
    expect(onSelect).toHaveBeenCalledWith(PUZZLES[0]);
  });

  it('displays earned stars for completed puzzles', () => {
    const stars = { [PUZZLES[0].id]: 3 };
    render(
      h(PuzzleSelect, {
        earnedStars: stars,
        unlockedPuzzles: allUnlocked,
        onSelectPuzzle: vi.fn(),
        onClose: vi.fn(),
      }),
    );
    // Three filled stars should be present
    const card = document.querySelector(`[data-testid="puzzle-card-${PUZZLES[0].id}"]`);
    const _starIcons = card?.querySelectorAll('span');
    // At least 3 star characters in the card
    const starText = card?.textContent || '';
    expect((starText.match(/\u2605/g) || []).length).toBe(3);
  });
});

describe('PuzzleComplete', () => {
  it('renders completion screen with stars and time', () => {
    render(
      h(PuzzleComplete, {
        puzzleName: 'First Strike',
        starsEarned: 2,
        timeTaken: '1:45',
        hasNext: true,
        onNextPuzzle: vi.fn(),
        onRetry: vi.fn(),
        onBack: vi.fn(),
      }),
    );
    expect(document.body.textContent).toContain('Puzzle Complete!');
    expect(document.body.textContent).toContain('First Strike');
    expect(document.body.textContent).toContain('1:45');
  });

  it('shows Next Puzzle button when hasNext=true', () => {
    render(
      h(PuzzleComplete, {
        puzzleName: 'Test',
        starsEarned: 1,
        timeTaken: '2:00',
        hasNext: true,
        onNextPuzzle: vi.fn(),
        onRetry: vi.fn(),
        onBack: vi.fn(),
      }),
    );
    expect(document.querySelector('[data-testid="puzzle-next-btn"]')).toBeTruthy();
  });

  it('hides Next Puzzle button when hasNext=false', () => {
    render(
      h(PuzzleComplete, {
        puzzleName: 'Test',
        starsEarned: 1,
        timeTaken: '2:00',
        hasNext: false,
        onNextPuzzle: vi.fn(),
        onRetry: vi.fn(),
        onBack: vi.fn(),
      }),
    );
    expect(document.querySelector('[data-testid="puzzle-next-btn"]')).toBeNull();
  });

  it('calls onRetry when Retry is clicked', () => {
    const onRetry = vi.fn();
    render(
      h(PuzzleComplete, {
        puzzleName: 'Test',
        starsEarned: 1,
        timeTaken: '2:00',
        hasNext: false,
        onNextPuzzle: vi.fn(),
        onRetry,
        onBack: vi.fn(),
      }),
    );
    fireEvent.click(document.querySelector('[data-testid="puzzle-retry-btn"]')!);
    expect(onRetry).toHaveBeenCalled();
  });
});

describe('PuzzleHud', () => {
  it('renders nothing when no objective text', () => {
    puzzleObjectiveText.value = '';
    const { container } = render(h(PuzzleHud, null));
    expect(container.children.length).toBe(0);
  });

  it('shows objective, timer and stars when active', () => {
    puzzleObjectiveText.value = 'Destroy all enemies';
    puzzleTimerDisplay.value = '2:30';
    puzzleStars.value = 1;
    render(h(PuzzleHud, null));
    expect(document.body.textContent).toContain('Destroy all enemies');
    expect(document.body.textContent).toContain('2:30');
    expect(document.querySelector('[data-testid="puzzle-hud"]')).toBeTruthy();
  });
});
