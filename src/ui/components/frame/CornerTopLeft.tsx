/**
 * CornerTopLeft -- SVG corner piece for top-left of the 9-slice frame.
 *
 * 60x60 viewBox. Renders a wood plank L-shape with organic-wood filter,
 * a curling vine with dual stroke (thick base + thin highlight), and two
 * decorative leaves at different rotations.
 */

import { COLORS } from '@/ui/design-tokens';
import { SvgLeaf } from './SvgLeaf';

export function CornerTopLeft() {
  return (
    <svg viewBox="0 0 60 60" class="w-full h-full overflow-visible" aria-hidden="true">
      {/* Wood plank L-shape */}
      <path
        d="M 60 20 L 22 20 C 20 20, 20 20, 20 22 L 20 60 L 0 60 L 0 0 L 60 0 Z"
        fill={COLORS.woodBase}
        filter="url(#organic-wood)"
        stroke={COLORS.woodDark}
        strokeWidth="2.5"
      />
      {/* Vine curl -- thick base layer */}
      <path
        d="M 25 60 C 25 25, 0 30, 8 12 C 15 -5, 35 5, 25 25 C 15 45, 50 45, 60 35"
        fill="none"
        stroke={COLORS.vineBase}
        strokeWidth="8"
        strokeLinecap="round"
      />
      {/* Vine curl -- thin highlight overlay */}
      <path
        d="M 25 60 C 25 25, 0 30, 8 12 C 15 -5, 35 5, 25 25 C 15 45, 50 45, 60 35"
        fill="none"
        stroke={COLORS.vineHighlight}
        strokeWidth="3"
        strokeLinecap="round"
      />
      {/* Decorative leaves */}
      <SvgLeaf x={12} y={18} rot={-45} scale={0.8} />
      <SvgLeaf x={40} y={35} rot={20} scale={1.2} />
    </svg>
  );
}
