/**
 * Modal Responsive Design — Unit Tests
 *
 * 1. useScrollDrag hook — pointer drag-to-scroll behaviour. Mouse/pen only;
 *    touch is delegated to native touch-action handling.
 * 2. CSS class convention checks — static source checks that every modal panel
 *    uses the correct responsive CSS classes.
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
function firePointer(
  el: HTMLElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup' | 'pointercancel',
  opts: Partial<PointerEventInit> = {},
) {
  el.dispatchEvent(
    new PointerEvent(type, {
      bubbles: true,
      cancelable: true,
      pointerId: 1,
      pointerType: 'mouse',
      button: 0,
      clientX: 0,
      clientY: 0,
      ...opts,
    }),
  );
}

// useScrollDrag tests

describe('useScrollDrag', () => {
  beforeEach(() => {
    render(h(ScrollBox, { height: 600 }));
  });

  afterEach(() => {
    cleanup();
  });

  it('scrolls downward when pointer is dragged upward (drag up = scroll down)', () => {
    const box = getBox();
    box.scrollTop = 0;

    firePointer(box, 'pointerdown', { clientY: 100, clientX: 0 });
    // Move 50px up — the element should scroll 50px down.
    firePointer(box, 'pointermove', { clientY: 50, clientX: 0 });

    expect(box.scrollTop).toBe(50);
  });

  it('scrolls upward when pointer is dragged downward', () => {
    const box = getBox();
    box.scrollTop = 100;

    firePointer(box, 'pointerdown', { clientY: 50, clientX: 0 });
    // Move 20px down — the element should scroll 20px up.
    firePointer(box, 'pointermove', { clientY: 70, clientX: 0 });

    expect(box.scrollTop).toBe(80);
  });

  it('does NOT scroll when pointer movement is under the dead-zone threshold (6px)', () => {
    const box = getBox();
    box.scrollTop = 0;

    firePointer(box, 'pointerdown', { clientY: 100, clientX: 0 });
    // Only 3px — under the DRAG_THRESHOLD of 6px.
    firePointer(box, 'pointermove', { clientY: 97, clientX: 0 });

    expect(box.scrollTop).toBe(0);
  });

  it('ignores touch pointer type (touch handled natively via touch-action CSS)', () => {
    const box = getBox();
    box.scrollTop = 0;

    firePointer(box, 'pointerdown', { clientY: 100, pointerType: 'touch' });
    firePointer(box, 'pointermove', { clientY: 50, pointerType: 'touch' });

    // scrollTop must remain untouched — native scroll handles touch.
    expect(box.scrollTop).toBe(0);
  });

  it('ignores non-primary button (button !== 0)', () => {
    const box = getBox();
    box.scrollTop = 0;

    firePointer(box, 'pointerdown', { clientY: 100, button: 2 });
    firePointer(box, 'pointermove', { clientY: 50, button: 2 });

    expect(box.scrollTop).toBe(0);
  });

  it('stops scrolling after pointerup', () => {
    const box = getBox();
    box.scrollTop = 0;

    firePointer(box, 'pointerdown', { clientY: 100 });
    firePointer(box, 'pointermove', { clientY: 50 });
    // scrollTop should now be 50.
    expect(box.scrollTop).toBe(50);

    firePointer(box, 'pointerup', { clientY: 50 });
    // Further move events after pointerup must NOT scroll.
    firePointer(box, 'pointermove', { clientY: 0 });
    expect(box.scrollTop).toBe(50);
  });

  it('stops scrolling after pointercancel', () => {
    const box = getBox();
    box.scrollTop = 0;

    firePointer(box, 'pointerdown', { clientY: 100 });
    firePointer(box, 'pointermove', { clientY: 50 });
    expect(box.scrollTop).toBe(50);

    firePointer(box, 'pointercancel', { clientY: 50 });
    firePointer(box, 'pointermove', { clientY: 0 });
    // Must not continue scrolling after cancel.
    expect(box.scrollTop).toBe(50);
  });

  it('ignores move events from a different pointerId', () => {
    const box = getBox();
    box.scrollTop = 0;

    firePointer(box, 'pointerdown', { pointerId: 1, clientY: 100 });
    // Different pointerId — should be ignored.
    firePointer(box, 'pointermove', { pointerId: 2, clientY: 50 });

    expect(box.scrollTop).toBe(0);
  });

  it('scrolls horizontally when pointer is dragged sideways', () => {
    const box = getBox();
    // Force horizontal overflow via inline style so scrollLeft can change.
    (box as HTMLElement).style.width = '100px';
    (box.firstChild as HTMLElement).style.width = '600px';
    box.scrollLeft = 0;

    firePointer(box, 'pointerdown', { clientX: 100, clientY: 0 });
    firePointer(box, 'pointermove', { clientX: 50, clientY: 0 });

    expect(box.scrollLeft).toBe(50);
  });

  it('suppresses click event after a drag to prevent accidental activations', () => {
    const box = getBox();
    box.scrollTop = 0;

    let clickFired = false;
    box.addEventListener('click', () => {
      clickFired = true;
    });

    // Perform a drag (exceeds dead zone)
    firePointer(box, 'pointerdown', { clientY: 100 });
    firePointer(box, 'pointermove', { clientY: 50 });
    firePointer(box, 'pointerup', { clientY: 50 });

    // Fire a click — the capture-phase handler should eat it.
    box.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    expect(clickFired).toBe(false);
  });
});

// CSS class convention checks

describe('Modal responsive CSS classes', () => {
  /** Asserts class names appear as standalone tokens in the given source. */
  function escapeRegExp(value: string): string {
    return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }

  function assertClasses(source: string, classes: string[], file: string) {
    for (const cls of classes) {
      const escaped = escapeRegExp(cls);
      // Ensure the class name appears as a standalone token, not just as a prefix.
      const pattern = new RegExp(`(^|[^a-zA-Z0-9-])${escaped}([^a-zA-Z0-9-]|$)`);
      expect(source, `${file} is missing class "${cls}"`).toMatch(pattern);
    }
  }

  it('settings-panel uses modal-overlay on backdrop and modal-scroll on card', async () => {
    const src = await import('@/ui/settings-panel?raw').then((m: { default: string }) => m.default);
    assertClasses(src, ['modal-overlay', 'modal-scroll'], 'settings-panel.tsx');
  });

  it('new-game-modal uses modal-overlay on backdrop and modal-scroll-lg on card', async () => {
    const src = await import('@/ui/new-game-modal?raw').then((m: { default: string }) => m.default);
    assertClasses(src, ['modal-overlay', 'modal-scroll-lg'], 'new-game-modal.tsx');
  });

  it('tech-tree-panel uses modal-scroll-both for two-axis panning', async () => {
    const src = await import('@/ui/tech-tree-panel?raw').then(
      (m: { default: string }) => m.default,
    );
    assertClasses(src, ['modal-scroll-both'], 'tech-tree-panel.tsx');
  });

  it('achievements-panel uses modal-overlay and modal-scroll', async () => {
    const src = await import('@/ui/achievements-panel?raw').then(
      (m: { default: string }) => m.default,
    );
    assertClasses(src, ['modal-overlay', 'modal-scroll'], 'achievements-panel.tsx');
  });

  it('leaderboard-panel uses modal-overlay and modal-scroll', async () => {
    const src = await import('@/ui/leaderboard-panel?raw').then(
      (m: { default: string }) => m.default,
    );
    assertClasses(src, ['modal-overlay', 'modal-scroll'], 'leaderboard-panel.tsx');
  });

  it('unlocks-panel uses modal-overlay and modal-scroll-lg', async () => {
    const src = await import('@/ui/unlocks-panel?raw').then((m: { default: string }) => m.default);
    assertClasses(src, ['modal-overlay', 'modal-scroll-lg'], 'unlocks-panel.tsx');
  });

  it('keyboard-reference uses modal-overlay and modal-scroll', async () => {
    const src = await import('@/ui/keyboard-reference?raw').then(
      (m: { default: string }) => m.default,
    );
    assertClasses(src, ['modal-overlay', 'modal-scroll'], 'keyboard-reference.tsx');
  });

  it('cosmetics-panel uses modal-overlay and modal-scroll', async () => {
    const src = await import('@/ui/cosmetics-panel?raw').then(
      (m: { default: string }) => m.default,
    );
    assertClasses(src, ['modal-overlay', 'modal-scroll'], 'cosmetics-panel.tsx');
  });

  it('campaign-panel uses modal-overlay for both briefing and mission-select views', async () => {
    const src = await import('@/ui/campaign-panel?raw').then((m: { default: string }) => m.default);
    // Both views should use the class; counting occurrences validates both.
    const count = (src.match(/modal-overlay/g) ?? []).length;
    expect(
      count,
      'campaign-panel.tsx should have modal-overlay in both briefing and select views',
    ).toBeGreaterThanOrEqual(2);
  });

  it('drag/swipe behavior is available in all nine modal components', async () => {
    const modules = [
      '@/ui/settings-panel',
      '@/ui/new-game-modal',
      '@/ui/tech-tree-panel',
      '@/ui/achievements-panel',
      '@/ui/leaderboard-panel',
      '@/ui/unlocks-panel',
      '@/ui/keyboard-reference',
      '@/ui/cosmetics-panel',
      '@/ui/campaign-panel',
    ] as const;

    for (const mod of modules) {
      const src = await import(`${mod}?raw`).then((m: { default: string }) => m.default);
      const hasDragBehavior = src.includes('useScrollDrag') || src.includes('SwipeableTabView');
      expect(hasDragBehavior, `${mod} must import useScrollDrag or SwipeableTabView`).toBe(true);
    }
  });
});
