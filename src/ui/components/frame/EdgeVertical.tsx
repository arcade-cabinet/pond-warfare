/**
 * EdgeVertical -- Stretching vertical edge for the 9-slice frame.
 *
 * Renders a wood plank rectangle with organic-wood filter and a wavy vine
 * path (dual stroke) with two decorative leaves. Uses
 * preserveAspectRatio="none" so it stretches to fill the grid cell.
 *
 * Props:
 *  - left: true for the left edge (plank at x=0, vine curves left),
 *          false for right edge (plank at x=40, vine curves right).
 */

import { COLORS } from '@/ui/design-tokens';
import { SvgLeaf } from './SvgLeaf';

export interface EdgeVerticalProps {
  left: boolean;
}

/** Vine path varies based on left/right position. */
function vinePath(left: boolean): string {
  const base = left ? 12 : 48;
  const out = left ? -5 : 65;
  const mid1 = left ? 15 : 45;
  const low = left ? 8 : 52;
  const mid2 = left ? 18 : 42;
  const high = left ? 5 : 55;
  const mid3 = left ? 15 : 45;

  return [
    `M ${base} 0`,
    `Q ${out} 50, ${mid1} 100`,
    `T ${low} 200`,
    `T ${mid2} 300`,
    `T ${high} 400`,
    `T ${mid3} 500`,
  ].join(' ');
}

export function EdgeVertical({ left }: EdgeVerticalProps) {
  const d = vinePath(left);
  const plankX = left ? 0 : 40;

  return (
    <svg
      viewBox="0 0 60 500"
      width="100%"
      height="100%"
      preserveAspectRatio="none"
      class="overflow-visible"
      aria-hidden="true"
    >
      {/* Wood plank rect */}
      <rect
        x={plankX}
        y="0"
        width="20"
        height="100%"
        fill={COLORS.woodBase}
        filter="url(#organic-wood)"
        stroke={COLORS.woodDark}
        strokeWidth="2.5"
      />
      {/* Vine -- thick base */}
      <path d={d} fill="none" stroke={COLORS.vineBase} strokeWidth="8" strokeLinecap="round" />
      {/* Vine -- thin highlight */}
      <path d={d} fill="none" stroke={COLORS.vineHighlight} strokeWidth="3" strokeLinecap="round" />
      {/* Decorative leaves */}
      <SvgLeaf x={left ? 5 : 55} y="20%" rot={left ? -90 : 90} scale={0.8} />
      <SvgLeaf x={left ? 15 : 45} y="70%" rot={left ? -45 : 45} scale={1} />
    </svg>
  );
}
