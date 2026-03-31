/**
 * useScrollDrag
 *
 * Adds pointer drag-to-scroll behaviour to any scrollable container.
 *
 * - Mouse (pointerType === 'mouse' / 'pen'): click-and-drag scrolls the
 *   element — identical UX to a native scrollbar, works on desktop/tablet.
 * - Touch (pointerType === 'touch'): ignored here; native touch-scroll via
 *   CSS `touch-action: pan-y` (or `pan-x pan-y`) handles it with momentum.
 *
 * A 6-pixel dead-zone prevents mis-fires when the user just clicks a button
 * inside the scrollable area.
 *
 * Usage:
 *   const scrollRef = useScrollDrag<HTMLDivElement>();
 *   return <div ref={scrollRef} class="overflow-y-auto">…long content…</div>
 */

import type { RefObject } from 'preact';
import { useEffect, useRef } from 'preact/hooks';

/** Minimum pointer movement in px before drag mode activates. */
const DRAG_THRESHOLD = 6;

export function useScrollDrag<T extends HTMLElement = HTMLDivElement>(): RefObject<T> {
  const ref = useRef<T>(null);

  useEffect(() => {
    const el = ref.current;
    if (el === null) return;
    // Capture as a typed const so TypeScript preserves the non-null type
    // inside the event-listener closures (control-flow narrowing does not
    // cross function boundaries in TypeScript).
    const node: T = el;

    let startY = 0;
    let startX = 0;
    let startScrollTop = 0;
    let startScrollLeft = 0;
    let dragActive = false;
    let capturedId = -1;

    function onPointerDown(e: PointerEvent) {
      // Only respond to primary mouse/pen button; touch uses native scroll.
      if (e.button !== 0 || e.pointerType === 'touch') return;
      startY = e.clientY;
      startX = e.clientX;
      startScrollTop = node.scrollTop;
      startScrollLeft = node.scrollLeft;
      dragActive = false;
      capturedId = e.pointerId;
    }

    function onPointerMove(e: PointerEvent) {
      if (e.pointerId !== capturedId) return;
      const dy = e.clientY - startY;
      const dx = e.clientX - startX;
      // Dead zone — ignore tiny wiggles so button clicks still fire.
      if (!dragActive && Math.abs(dy) < DRAG_THRESHOLD && Math.abs(dx) < DRAG_THRESHOLD) return;
      dragActive = true;
      node.scrollTop = startScrollTop - dy;
      node.scrollLeft = startScrollLeft - dx;
      // Prevent text selection while dragging.
      e.preventDefault();
    }

    function onPointerUp(e: PointerEvent) {
      if (e.pointerId !== capturedId) return;
      dragActive = false;
      capturedId = -1;
    }

    node.addEventListener('pointerdown', onPointerDown, { passive: true });
    node.addEventListener('pointermove', onPointerMove, { passive: false });
    node.addEventListener('pointerup', onPointerUp, { passive: true });
    node.addEventListener('pointercancel', onPointerUp, { passive: true });

    return () => {
      node.removeEventListener('pointerdown', onPointerDown);
      node.removeEventListener('pointermove', onPointerMove);
      node.removeEventListener('pointerup', onPointerUp);
      node.removeEventListener('pointercancel', onPointerUp);
    };
  }, []);

  return ref;
}
