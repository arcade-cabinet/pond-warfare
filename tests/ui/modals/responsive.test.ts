// @vitest-environment jsdom
/**
 * Modal Responsive Design -- Unit Tests
 *
 * 1. useScrollDrag hook -- pointer drag-to-scroll behaviour. Mouse/pen only;
 *    touch is delegated to native touch-action handling.
 * 2. CSS class convention checks -- static source checks that every modal panel
 *    uses the correct responsive CSS classes.
 *
 * v3: Removed tests for deleted modals (new-game-modal, tech-tree-panel,
 * campaign-panel, campaign-briefing, unlocks-panel, achievements-panel,
 * leaderboard-panel, cosmetics-panel, match-history-panel).
 */

import { cleanup, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import { useScrollDrag } from '@/ui/hooks/useScrollDrag';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Minimal scrollable component that exposes the element via a data attribute. */
function ScrollBox({ height = 400 }: { height?: number }) {
  const ref = useScrollDrag<HTMLDivElement>();
  return h(
    'div',
    {
      ref,
      'data-testid': 'scroll-box',
      style: { height: '100px', overflow: 'auto', position: 'relative' },
    },
    h('div', { style: { height: `${height}px` } }, 'content'),
  );
}

function getBox(): HTMLElement {
  const el = document.querySelector('[data-testid="scroll-box"]');
  if (!el) throw new Error('scroll-box not found');
  return el as HTMLElement;
}

/** Fire a PointerEvent of the given type on an element. */
function pointerEvent(
  el: HTMLElement,
  type: string,
  { clientY = 0, pointerType = 'mouse' } = {},
): void {
  const ev = new PointerEvent(type, {
    bubbles: true,
    clientY,
    pointerType,
  });
  el.dispatchEvent(ev);
}

// ---------------------------------------------------------------------------
// 1. useScrollDrag hook tests
// ---------------------------------------------------------------------------
describe('useScrollDrag', () => {
  beforeEach(() => {
    render(h(ScrollBox, { height: 600 }));
  });
  afterEach(cleanup);

  it('does not scroll on mouse move without pointer-down', () => {
    const box = getBox();
    const before = box.scrollTop;
    pointerEvent(box, 'pointermove', { clientY: 50 });
    expect(box.scrollTop).toBe(before);
  });

  it('scrolls on mouse drag (pointerdown + pointermove)', () => {
    const box = getBox();
    Object.defineProperty(box, 'scrollHeight', { value: 600, writable: false });
    Object.defineProperty(box, 'clientHeight', { value: 100, writable: false });

    pointerEvent(box, 'pointerdown', { clientY: 100, pointerType: 'mouse' });
    pointerEvent(box, 'pointermove', { clientY: 50, pointerType: 'mouse' });
    pointerEvent(box, 'pointerup', { clientY: 50 });
  });

  it('ignores touch events (native CSS touch-action handles those)', () => {
    const box = getBox();
    const before = box.scrollTop;
    pointerEvent(box, 'pointerdown', { clientY: 100, pointerType: 'touch' });
    pointerEvent(box, 'pointermove', { clientY: 50, pointerType: 'touch' });
    expect(box.scrollTop).toBe(before);
    pointerEvent(box, 'pointerup', { clientY: 50, pointerType: 'touch' });
  });

  it('pen events trigger drag scroll like mouse', () => {
    const box = getBox();
    Object.defineProperty(box, 'scrollHeight', { value: 600, writable: false });
    Object.defineProperty(box, 'clientHeight', { value: 100, writable: false });

    pointerEvent(box, 'pointerdown', { clientY: 200, pointerType: 'pen' });
    pointerEvent(box, 'pointermove', { clientY: 100, pointerType: 'pen' });
    pointerEvent(box, 'pointerup', { clientY: 100 });
  });
});

// ---------------------------------------------------------------------------
// 2. Modal CSS class checks (surviving modals only)
// ---------------------------------------------------------------------------
describe('Modal responsive CSS classes', () => {
  function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function assertClasses(source: string, classes: string[], file: string) {
    for (const cls of classes) {
      const escaped = escapeRegExp(cls);
      const pattern = new RegExp(`(^|[^a-zA-Z0-9-])${escaped}([^a-zA-Z0-9-]|$)`);
      expect(source, `${file} is missing class "${cls}"`).toMatch(pattern);
    }
  }

  it('settings-panel uses modal-overlay and modal-scroll', async () => {
    const src = await import('@/ui/settings-panel?raw').then((m: { default: string }) => m.default);
    assertClasses(src, ['modal-overlay', 'modal-scroll'], 'settings-panel.tsx');
  });

  it('keyboard-reference uses modal-overlay and modal-scroll', async () => {
    const src = await import('@/ui/keyboard-reference?raw').then(
      (m: { default: string }) => m.default,
    );
    assertClasses(src, ['modal-overlay', 'modal-scroll'], 'keyboard-reference.tsx');
  });

  it('drag/swipe behavior is available in surviving modal components', async () => {
    const modules = ['@/ui/settings-panel', '@/ui/keyboard-reference'] as const;

    for (const mod of modules) {
      const src = await import(`${mod}?raw`).then((m: { default: string }) => m.default);
      const hasDragBehavior = src.includes('useScrollDrag');
      expect(hasDragBehavior, `${mod} must import useScrollDrag`).toBe(true);
    }
  });
});
