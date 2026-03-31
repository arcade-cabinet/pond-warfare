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
 * Uses a callback ref so listeners are correctly attached even when the
 * element is conditionally rendered (late ref attachment).
 *
 * Uses setPointerCapture to guarantee pointermove/pointerup delivery even
 * when the pointer leaves the element.
 *
 * Suppresses the click event that fires after a drag to prevent accidental
 * button activations.
 *
 * Usage:
 *   const scrollRef = useScrollDrag<HTMLDivElement>();
 *   return <div ref={scrollRef} class="overflow-y-auto">…long content…</div>
 */

import { useCallback, useEffect, useRef } from 'preact/hooks';

/** Minimum pointer movement in px before drag mode activates. */
const DRAG_THRESHOLD = 6;

export function useScrollDrag<T extends HTMLElement = HTMLDivElement>(): (node: T | null) => void {
  const cleanupRef = useRef<(() => void) | null>(null);

  const callbackRef = useCallback((node: T | null) => {
    // Tear down listeners from previous node (if any).
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }

    if (!node) return;

    // Capture as a typed const so TypeScript preserves the non-null type
    // inside the event-listener closures (control-flow narrowing does not
    // cross function boundaries in TypeScript).
    const el: T = node;

    let startY = 0;
    let startX = 0;
    let startScrollTop = 0;
    let startScrollLeft = 0;
    let dragActive = false;
    let didDrag = false;
    let capturedId = -1;

    function onPointerDown(e: PointerEvent) {
      // Only respond to primary mouse/pen button; touch uses native scroll.
      if (e.button !== 0 || e.pointerType === 'touch') return;
      startY = e.clientY;
      startX = e.clientX;
      startScrollTop = el.scrollTop;
      startScrollLeft = el.scrollLeft;
      dragActive = false;
      didDrag = false;
      capturedId = e.pointerId;
      // Capture the pointer so we receive move/up even outside the element.
      // Guarded for environments that don't implement it (e.g. JSDOM).
      if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
      if (e.pointerId !== capturedId) return;
      const dy = e.clientY - startY;
      const dx = e.clientX - startX;
      // Dead zone — ignore tiny wiggles so button clicks still fire.
      if (!dragActive && Math.abs(dy) < DRAG_THRESHOLD && Math.abs(dx) < DRAG_THRESHOLD) return;
      dragActive = true;
      didDrag = true;
      el.scrollTop = startScrollTop - dy;
      el.scrollLeft = startScrollLeft - dx;
      // Prevent text selection while dragging.
      e.preventDefault();
    }

    function onPointerUp(e: PointerEvent) {
      if (e.pointerId !== capturedId) return;
      // Release capture — guarded for environments without the API.
      if (el.releasePointerCapture && el.hasPointerCapture?.(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
      dragActive = false;
      capturedId = -1;
    }

    /** Suppress the click that fires after a drag to prevent accidental activations. */
    function onClickCapture(e: MouseEvent) {
      if (didDrag) {
        e.stopPropagation();
        e.preventDefault();
        didDrag = false;
      }
    }

    el.addEventListener('pointerdown', onPointerDown, { passive: true });
    el.addEventListener('pointermove', onPointerMove, { passive: false });
    el.addEventListener('pointerup', onPointerUp, { passive: true });
    el.addEventListener('pointercancel', onPointerUp, { passive: true });
    // Capture-phase click handler to eat post-drag clicks before children see them.
    el.addEventListener('click', onClickCapture, { capture: true });

    cleanupRef.current = () => {
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('click', onClickCapture, { capture: true });
    };
  }, []);

  // Final cleanup when the component unmounts.
  useEffect(
    () => () => {
      if (cleanupRef.current) {
        cleanupRef.current();
        cleanupRef.current = null;
      }
    },
    [],
  );

  return callbackRef;
}
