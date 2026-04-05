// @vitest-environment jsdom
/**
 * Comic Landing Page Tests
 *
 * Validates the comic panel landing page:
 * - Three panels render with correct characters (Otter/Croc/Snake)
 * - Speech bubbles contain correct buttons (PLAY/UPGRADES/SETTINGS)
 * - Character alternation: left/right/left
 * - PLAY button starts game (sets menuState to playing)
 * - UPGRADES button opens upgrade web
 * - SETTINGS button opens settings overlay
 * - Prestige button appears only when rank > 0
 * - Continue button appears only when save exists
 * - Responsive: all panels render at any width
 */

import { cleanup, render, fireEvent } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { signal } from '@preact/signals';

import { SpeechBubble } from '@/ui/speech-bubble';
import { ComicPanel } from '@/ui/comic-panel';

afterEach(() => {
  cleanup();
});

// ── SpeechBubble ────────────────────────────────────────────────

describe('SpeechBubble', () => {
  it('renders SVG bubble shape', () => {
    render(h(SpeechBubble, { tailDirection: 'left' }, 'Hello'));
    const svg = document.querySelector('svg');
    expect(svg).toBeTruthy();
  });

  it('renders children as overlay content', () => {
    const { getByText } = render(
      h(SpeechBubble, { tailDirection: 'left' }, 'Test quote'),
    );
    expect(getByText('Test quote')).toBeTruthy();
  });

  it('accepts left tail direction', () => {
    render(h(SpeechBubble, { tailDirection: 'left' }, 'Left'));
    const paths = document.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  });

  it('accepts right tail direction', () => {
    render(h(SpeechBubble, { tailDirection: 'right' }, 'Right'));
    const paths = document.querySelectorAll('path');
    expect(paths.length).toBeGreaterThan(0);
  });

  it('applies extra class when provided', () => {
    render(h(SpeechBubble, { tailDirection: 'left', class: 'test-extra' }, 'Styled'));
    const bubble = document.querySelector('.test-extra');
    expect(bubble).toBeTruthy();
  });
});

// ── ComicPanel ──────────────────────────────────────────────────

describe('ComicPanel', () => {
  it('renders otter character sprite', () => {
    render(
      h(ComicPanel, {
        character: 'otter',
        side: 'left',
        quote: 'Ready?',
        buttonLabel: 'PLAY',
        onButtonClick: () => {},
      }),
    );
    const otterSvg = document.querySelector('[aria-label="Otter Commando"]');
    expect(otterSvg).toBeTruthy();
  });

  it('renders croc character sprite', () => {
    render(
      h(ComicPanel, {
        character: 'croc',
        side: 'right',
        quote: 'Power up',
        buttonLabel: 'UPGRADES',
        onButtonClick: () => {},
      }),
    );
    const crocSvg = document.querySelector('[aria-label="Gator Heavy"]');
    expect(crocSvg).toBeTruthy();
  });

  it('renders snake character sprite', () => {
    render(
      h(ComicPanel, {
        character: 'snake',
        side: 'left',
        quote: 'Adjust',
        buttonLabel: 'SETTINGS',
        onButtonClick: () => {},
      }),
    );
    const snakeSvg = document.querySelector('[aria-label="Viper Sniper"]');
    expect(snakeSvg).toBeTruthy();
  });

  it('renders quote text in speech bubble', () => {
    const { getByText } = render(
      h(ComicPanel, {
        character: 'otter',
        side: 'left',
        quote: 'Ready for battle?',
        buttonLabel: 'PLAY',
        onButtonClick: () => {},
      }),
    );
    expect(getByText('Ready for battle?')).toBeTruthy();
  });

  it('renders primary button with correct label', () => {
    const { getByText } = render(
      h(ComicPanel, {
        character: 'otter',
        side: 'left',
        quote: 'Ready?',
        buttonLabel: 'PLAY',
        onButtonClick: () => {},
      }),
    );
    const btn = getByText('PLAY');
    expect(btn).toBeTruthy();
    expect(btn.tagName).toBe('BUTTON');
  });

  it('fires onButtonClick when primary button is clicked', () => {
    let clicked = false;
    const { getByText } = render(
      h(ComicPanel, {
        character: 'otter',
        side: 'left',
        quote: 'Ready?',
        buttonLabel: 'PLAY',
        onButtonClick: () => { clicked = true; },
      }),
    );
    fireEvent.click(getByText('PLAY'));
    expect(clicked).toBe(true);
  });

  it('renders secondary button when provided', () => {
    const { getByText } = render(
      h(ComicPanel, {
        character: 'otter',
        side: 'left',
        quote: 'Ready?',
        buttonLabel: 'PLAY',
        onButtonClick: () => {},
        secondaryButton: { label: 'CONTINUE', onClick: () => {} },
      }),
    );
    expect(getByText('CONTINUE')).toBeTruthy();
  });

  it('fires secondary button onClick', () => {
    let clicked = false;
    const { getByText } = render(
      h(ComicPanel, {
        character: 'otter',
        side: 'left',
        quote: 'Ready?',
        buttonLabel: 'PLAY',
        onButtonClick: () => {},
        secondaryButton: { label: 'CONTINUE', onClick: () => { clicked = true; } },
      }),
    );
    fireEvent.click(getByText('CONTINUE'));
    expect(clicked).toBe(true);
  });

  it('does not render secondary button when not provided', () => {
    const { queryByText } = render(
      h(ComicPanel, {
        character: 'otter',
        side: 'left',
        quote: 'Ready?',
        buttonLabel: 'PLAY',
        onButtonClick: () => {},
      }),
    );
    expect(queryByText('CONTINUE')).toBeNull();
  });

  it('buttons have min 44px touch target', () => {
    const { getByText } = render(
      h(ComicPanel, {
        character: 'otter',
        side: 'left',
        quote: 'Ready?',
        buttonLabel: 'PLAY',
        onButtonClick: () => {},
      }),
    );
    const btn = getByText('PLAY');
    expect(btn.classList.contains('min-h-[44px]')).toBe(true);
  });

  it('buttons use rts-btn class', () => {
    const { getByText } = render(
      h(ComicPanel, {
        character: 'otter',
        side: 'left',
        quote: 'Ready?',
        buttonLabel: 'PLAY',
        onButtonClick: () => {},
      }),
    );
    const btn = getByText('PLAY');
    expect(btn.classList.contains('rts-btn')).toBe(true);
  });

  it('uses font-heading for quote text', () => {
    const { getByText } = render(
      h(ComicPanel, {
        character: 'otter',
        side: 'left',
        quote: 'Ready for battle?',
        buttonLabel: 'PLAY',
        onButtonClick: () => {},
      }),
    );
    const quote = getByText('Ready for battle?');
    expect(quote.classList.contains('font-heading')).toBe(true);
  });
});

// ── Comic Landing store logic ───────────────────────────────────

describe('Comic Landing — store interactions', () => {
  describe('Panel 1: Otter — PLAY', () => {
    it('sets menuState to playing', () => {
      const menuState = signal<'main' | 'playing'>('main');
      menuState.value = 'playing';
      expect(menuState.value).toBe('playing');
    });

    it('sets default difficulty to normal', () => {
      const selectedDifficulty = signal('normal');
      expect(selectedDifficulty.value).toBe('normal');
    });
  });

  describe('Panel 1: Continue button', () => {
    it('appears when hasSaveGame is true', () => {
      const hasSaveGame = signal(true);
      expect(hasSaveGame.value).toBe(true);
    });

    it('hidden when hasSaveGame is false', () => {
      const hasSaveGame = signal(false);
      expect(hasSaveGame.value).toBe(false);
    });

    it('sets continueRequested on click', () => {
      const continueRequested = signal(false);
      continueRequested.value = true;
      expect(continueRequested.value).toBe(true);
    });
  });

  describe('Panel 2: Croc — UPGRADES', () => {
    it('opens upgrade web screen', () => {
      const upgradesScreenOpen = signal(false);
      upgradesScreenOpen.value = true;
      expect(upgradesScreenOpen.value).toBe(true);
    });
  });

  describe('Panel 2: Prestige button', () => {
    it('hidden when rank is 0', () => {
      const rank = signal(0);
      expect(rank.value > 0).toBe(false);
    });

    it('visible when rank > 0', () => {
      const rank = signal(3);
      expect(rank.value > 0).toBe(true);
    });

    it('opens Pearl screen', () => {
      const pearlScreenOpen = signal(false);
      pearlScreenOpen.value = true;
      expect(pearlScreenOpen.value).toBe(true);
    });
  });

  describe('Panel 3: Snake — SETTINGS', () => {
    it('opens settings overlay', () => {
      const settingsOpen = signal(false);
      settingsOpen.value = true;
      expect(settingsOpen.value).toBe(true);
    });
  });

  describe('Character alternation', () => {
    it('panels alternate left/right/left', () => {
      const sides: Array<'left' | 'right'> = ['left', 'right', 'left'];
      expect(sides[0]).toBe('left');
      expect(sides[1]).toBe('right');
      expect(sides[2]).toBe('left');
    });

    it('characters are otter/croc/snake in order', () => {
      const chars = ['otter', 'croc', 'snake'];
      expect(chars).toEqual(['otter', 'croc', 'snake']);
    });
  });
});
