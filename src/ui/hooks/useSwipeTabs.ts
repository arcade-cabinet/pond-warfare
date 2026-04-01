/**
 * useSwipeTabs
 *
 * Horizontal swipe/drag hook for tab navigation. Tracks pointer or
 * touch drag, offsets a CSS transform while dragging, and snaps to
 * the next/prev tab on release when the drag exceeds a threshold.
 *
 * Touch: uses touch events for native swipe feel.
 * Mouse: uses pointer events with pointer capture (same pattern as useScrollDrag).
 * Vertical drags are ignored (if dy > dx early, horizontal tracking aborts).
 * Post-drag clicks are suppressed to prevent accidental activations.
 */

import { useCallback, useEffect, useRef, useState } from 'preact/hooks';

const DEFAULT_THRESHOLD = 50;
const DRAG_DEAD_ZONE = 8;

export interface UseSwipeTabsOptions {
  tabCount: number;
  activeIndex: number;
  onChangeIndex: (index: number) => void;
  threshold?: number;
}

export interface UseSwipeTabsResult {
  containerRef: (node: HTMLElement | null) => void;
  style: { transform: string; transition: string };
  isDragging: boolean;
}

export function useSwipeTabs(options: UseSwipeTabsOptions): UseSwipeTabsResult {
  const { tabCount, activeIndex, onChangeIndex, threshold = DEFAULT_THRESHOLD } = options;
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const cleanupRef = useRef<(() => void) | null>(null);

  // Stable refs for latest values inside event handlers
  const stateRef = useRef({ activeIndex, tabCount, threshold, onChangeIndex });
  stateRef.current = { activeIndex, tabCount, threshold, onChangeIndex };

  const callbackRef = useCallback((node: HTMLElement | null) => {
    if (cleanupRef.current) {
      cleanupRef.current();
      cleanupRef.current = null;
    }
    if (!node) return;

    const el = node;
    let startX = 0;
    let startY = 0;
    let dx = 0;
    let tracking = false;
    let decided = false; // whether we decided horizontal vs vertical
    let didDrag = false;
    let capturedId = -1;

    function begin(clientX: number, clientY: number, pointerId?: number) {
      startX = clientX;
      startY = clientY;
      dx = 0;
      tracking = true;
      decided = false;
      didDrag = false;
      if (pointerId != null) capturedId = pointerId;
    }

    function move(clientX: number, clientY: number) {
      if (!tracking) return;
      const rawDx = clientX - startX;
      const rawDy = clientY - startY;

      if (!decided) {
        if (Math.abs(rawDx) < DRAG_DEAD_ZONE && Math.abs(rawDy) < DRAG_DEAD_ZONE) return;
        // If vertical motion dominates, abort horizontal tracking
        if (Math.abs(rawDy) > Math.abs(rawDx)) {
          tracking = false;
          return;
        }
        decided = true;
      }

      dx = rawDx;
      didDrag = true;

      // Rubber-band at edges: halve offset when dragging past first/last tab
      const { activeIndex: idx, tabCount: count } = stateRef.current;
      const atStart = idx === 0 && dx > 0;
      const atEnd = idx === count - 1 && dx < 0;
      const offset = atStart || atEnd ? dx * 0.3 : dx;

      setDragOffset(offset);
      setIsDragging(true);
    }

    function end() {
      if (!tracking && !didDrag) return;
      tracking = false;
      capturedId = -1;
      const {
        activeIndex: idx,
        tabCount: count,
        threshold: th,
        onChangeIndex: change,
      } = stateRef.current;

      if (didDrag) {
        if (dx < -th && idx < count - 1) change(idx + 1);
        else if (dx > th && idx > 0) change(idx - 1);
      }

      setDragOffset(0);
      setIsDragging(false);
    }

    // --- Touch events ---
    function onTouchStart(e: TouchEvent) {
      const t = e.touches[0];
      if (t) begin(t.clientX, t.clientY);
    }
    function onTouchMove(e: TouchEvent) {
      const t = e.touches[0];
      if (t) move(t.clientX, t.clientY);
    }
    function onTouchEnd() {
      end();
    }

    // --- Pointer events (mouse/pen) ---
    function onPointerDown(e: PointerEvent) {
      if (e.button !== 0 || e.pointerType === 'touch') return;
      begin(e.clientX, e.clientY, e.pointerId);
      if (el.setPointerCapture) el.setPointerCapture(e.pointerId);
    }
    function onPointerMove(e: PointerEvent) {
      if (e.pointerId !== capturedId) return;
      move(e.clientX, e.clientY);
      if (decided) e.preventDefault();
    }
    function onPointerUp(e: PointerEvent) {
      if (e.pointerId !== capturedId) return;
      if (el.releasePointerCapture && el.hasPointerCapture?.(e.pointerId)) {
        el.releasePointerCapture(e.pointerId);
      }
      end();
    }

    function onClickCapture(e: MouseEvent) {
      if (didDrag) {
        e.stopPropagation();
        e.preventDefault();
        didDrag = false;
      }
    }

    el.addEventListener('touchstart', onTouchStart, { passive: true });
    el.addEventListener('touchmove', onTouchMove, { passive: true });
    el.addEventListener('touchend', onTouchEnd, { passive: true });
    el.addEventListener('touchcancel', onTouchEnd, { passive: true });
    el.addEventListener('pointerdown', onPointerDown, { passive: true });
    el.addEventListener('pointermove', onPointerMove, { passive: false });
    el.addEventListener('pointerup', onPointerUp, { passive: true });
    el.addEventListener('pointercancel', onPointerUp, { passive: true });
    el.addEventListener('click', onClickCapture, { capture: true });

    cleanupRef.current = () => {
      el.removeEventListener('touchstart', onTouchStart);
      el.removeEventListener('touchmove', onTouchMove);
      el.removeEventListener('touchend', onTouchEnd);
      el.removeEventListener('touchcancel', onTouchEnd);
      el.removeEventListener('pointerdown', onPointerDown);
      el.removeEventListener('pointermove', onPointerMove);
      el.removeEventListener('pointerup', onPointerUp);
      el.removeEventListener('pointercancel', onPointerUp);
      el.removeEventListener('click', onClickCapture, { capture: true });
    };
  }, []);

  useEffect(
    () => () => {
      cleanupRef.current?.();
      cleanupRef.current = null;
    },
    [],
  );

  const translateX =
    -(activeIndex * 100) +
    (dragOffset / (typeof window !== 'undefined' ? window.innerWidth : 400)) * 100;
  const transition = isDragging ? 'none' : 'transform 0.3s ease-out';

  return {
    containerRef: callbackRef,
    style: { transform: `translateX(${translateX}%)`, transition },
    isDragging,
  };
}
