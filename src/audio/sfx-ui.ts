/**
 * UI Navigation SFX
 *
 * Subtle sound effects for accordion sections, tab switches, and other
 * UI navigation interactions. All sounds are short (<100ms), quiet tones.
 */

import type { SfxManager } from './sfx';

/** Subtle "pop" when an accordion section opens. */
export function accordionOpenEffect(mgr: SfxManager): void {
  mgr.playAt(600, 'sine', 0.06, 0.03, 900);
}

/** Reverse "pop" when an accordion section closes. */
export function accordionCloseEffect(mgr: SfxManager): void {
  mgr.playAt(900, 'sine', 0.06, 0.03, 600);
}

/** Subtle click for tab switches. */
export function tabSwitchEffect(mgr: SfxManager): void {
  mgr.playAt(1000, 'sine', 0.04, 0.03, 1200);
}
