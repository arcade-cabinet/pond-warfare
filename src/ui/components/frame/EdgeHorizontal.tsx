/**
 * EdgeHorizontal -- Stretching horizontal edge for the 9-slice frame.
 *
 * Renders a wood plank rectangle with organic-wood filter and a wavy vine
 * path (dual stroke) with evenly-spaced decorative leaves. Uses
 * preserveAspectRatio="none" so it stretches to fill the grid cell.
 *
 * Props:
 *  - top: true for the top edge (plank at y=0, vine curves up),
 *         false for bottom edge (plank at y=40, vine curves down).
 */

import { COLORS } from '@/ui/design-tokens';
import { SvgLeaf } from './SvgLeaf';

export interface EdgeHorizontalProps {
  top: boolean;
}

/** Vine path varies based on top/bottom position. */
function vinePath(top: boolean): string {
  const base = top ? 12 : 48;
  const up = top ? -5 : 65;
  const mid1 = top ? 15 : 45;
  const low = top ? 8 : 52;
  const mid2 = top ? 18 : 42;
  const high = top ? 5 : 55;
  const mid3 = top ? 15 : 45;
  const mid4 = top ? 10 : 50;

  return [
    `M 0 ${base}`,
    `Q 50 ${up}, 100 ${mid1}`,
    `T 200 ${low}`,
    `T 300 ${mid2}`,
    `T 400 ${high}`,
    `T 500 ${mid3}`,
    `T 600 ${mid4}`,
    `T 800 ${base}`,
    `T 1000 ${mid1}`,
  ].join(' ');
}

/** Leaf positions along the edge. */
const LEAF_PCTS = [10, 30, 50, 70, 90] as const;

export function EdgeHorizontal({ top }: EdgeHorizontalProps) {
  const d = vinePath(top);
  const plankY = top ? 0 : 40;

  return (
    <svg
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      class="overflow-visible"
      aria-hidden="true"
    >
      {/* Wood plank rect */}
      <rect
        x="0"
        y={plankY}
        width="100%"
        height="20"
        fill={COLORS.woodBase}
        filter="url(#organic-wood)"
        stroke={COLORS.woodDark}
        strokeWidth="2.5"
      />
      {/* Vine -- thick base */}
      <path d={d} fill="none" stroke={COLORS.vineBase} strokeWidth="8" strokeLinecap="round" />
      {/* Vine -- thin highlight */}
      <path d={d} fill="none" stroke={COLORS.vineHighlight} strokeWidth="3" strokeLinecap="round" />
      {/* Decorative leaves at fixed intervals (SVG coords, not percentages) */}
      {LEAF_PCTS.map((pct, i) => (
        <SvgLeaf
          key={i}
          x={pct * 10}
          y={top ? (i % 2 === 0 ? 0 : 20) : i % 2 === 0 ? 40 : 60}
          rot={i * 45}
          scale={0.7}
        />
      ))}
    </svg>
  );
}
