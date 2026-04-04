/**
 * Design Bible Tokens — Single source of truth for the Pond Warfare visual identity.
 *
 * Extracted from the reference component at docs/brand/ui-reference-full.jsx.
 * Every color, font, and dimension used by SVG frame pieces, filters, buttons,
 * and sprites must come from here.
 */

export const COLORS = {
  /** Warm brown-gold for headers, important UI elements, ammo details */
  grittyGold: '#C5A059',
  /** Dimmed gold for inactive borders, secondary accents */
  goldDim: '#8A6D3B',
  /** Dark green for vine/nature accents, bandanas, selection circles */
  mossGreen: '#5A6B3A',
  /** Deepest green for harness leather, moss clumps, underbelly tint */
  mossDark: '#2E3C1B',
  /** Grey-blue for secondary text, steel weapon parts */
  weatheredSteel: '#6A7A7A',
  /** Near-black brown for deepest backgrounds, wood borders */
  woodDark: '#21160C',
  /** Medium brown for wood panel fill (9-slice corners/edges) */
  woodBase: '#4A3320',
  /** Lighter brown for wood highlights, subtle grain variation */
  woodHighlight: '#684B31',
  /** Dark olive for vine stroke base layer (thick stroke) */
  vineBase: '#304515',
  /** Bright green for vine highlight stroke (thin overlay) */
  vineHighlight: '#5A8022',
  /** Teal-black for swamp water tints and deep backgrounds */
  swampWater: '#1A2A25',
  /** Warm off-white for body text on dark backgrounds */
  sepiaText: '#E8DCC4',
  /** Panel interior — near-opaque dark green-black */
  bgPanel: 'rgba(25, 30, 20, 0.95)',
  /** Blood accent for damage, danger states, tongues */
  bloodRed: '#8B2525',
  /** Bright orange for muzzle flash effects */
  muzzleFlash: '#FFAA00',
  // ── Game Feedback Colors ───────────────────────────────────
  /** Success green for positive events (built, healed, saved) */
  feedbackSuccess: '#4ade80',
  /** Error red for negative events (not enough resources, failed) */
  feedbackError: '#f87171',
  /** Info blue for neutral/instructional events (training, tap target) */
  feedbackInfo: '#38bdf8',
  /** Warning amber for caution events (placement mode, low resources) */
  feedbackWarn: '#f59e0b',
} as const;

export const FONTS = {
  /** Rugged serif for all headings, titles, section labels */
  header: '"IM Fell English SC", serif',
  /** Clean sans-serif for body text, descriptions, stats */
  body: '"Open Sans", sans-serif',
} as const;

/** Frame 9-slice dimensions (px) */
export const FRAME = {
  /** Fixed corner size for the CSS grid 9-slice */
  cornerSize: 60,
  /** SVG viewBox for corner pieces */
  cornerViewBox: '0 0 60 60',
} as const;

/** Token type for external consumers */
export type ColorKey = keyof typeof COLORS;

/**
 * Map design tokens to CSS custom property names.
 * Applied to :root in main.css and usable as var(--pw-*) throughout.
 */
export const CSS_VAR_MAP: Record<string, string> = {
  '--pw-gold': COLORS.grittyGold,
  '--pw-gold-bright': COLORS.grittyGold,
  '--pw-gold-dim': COLORS.goldDim,
  '--pw-moss': COLORS.mossDark,
  '--pw-moss-bright': COLORS.mossGreen,
  '--pw-steel': COLORS.weatheredSteel,
  '--pw-steel-dim': '#4A5660',
  '--pw-bark': COLORS.woodDark,
  '--pw-mud': COLORS.woodBase,
  '--pw-mud-light': COLORS.woodHighlight,
  '--pw-wood-dark': COLORS.woodDark,
  '--pw-wood-mid': COLORS.woodBase,
  '--pw-wood-light': COLORS.woodHighlight,
  '--pw-vine-base': COLORS.vineBase,
  '--pw-vine-highlight': COLORS.vineHighlight,
  '--pw-bg-deep': COLORS.woodDark,
  '--pw-bg-surface': '#2A1E10',
  '--pw-bg-elevated': COLORS.woodBase,
  '--pw-text-primary': COLORS.sepiaText,
  '--pw-text-secondary': COLORS.weatheredSteel,
  '--pw-text-muted': '#4A5660',
  '--pw-accent': COLORS.grittyGold,
  '--pw-accent-bright': COLORS.grittyGold,
  '--pw-accent-dim': COLORS.goldDim,
};
