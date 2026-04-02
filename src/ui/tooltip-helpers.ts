/**
 * Tooltip Helpers
 *
 * Shared functions for showing/hiding the global tooltip from any component.
 * Centralizes the positioning logic and store manipulation.
 */

import type { TooltipData } from '@/types';
import * as store from './store';

const TOOLTIP_W = 220;
const TOOLTIP_H = 120;
const MARGIN = 10;

/** Show the tooltip at the mouse position with the given data. */
export function showTooltip(e: MouseEvent, data: TooltipData): void {
  store.tooltipData.value = data;
  const rawX = e.clientX + 12;
  const rawY = e.clientY - 10;
  const maxX = window.innerWidth - TOOLTIP_W - MARGIN;
  const maxY = window.innerHeight - TOOLTIP_H - MARGIN;
  store.tooltipX.value = Math.min(Math.max(rawX, 0), maxX);
  store.tooltipY.value = Math.min(Math.max(rawY, 0), maxY);
  store.tooltipVisible.value = true;
}

/** Hide the tooltip. */
export function hideTooltip(): void {
  store.tooltipVisible.value = false;
  store.tooltipData.value = null;
}
