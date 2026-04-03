/**
 * CornerTopRight -- SVG corner piece for top-right of the 9-slice frame.
 *
 * 60x60 viewBox. Renders a mirrored wood plank L-shape with organic-wood
 * filter, a hexagonal bolt/nut with rust drip, an ammo shell casing,
 * and a curving vine with dual stroke.
 */

import { COLORS } from '@/ui/design-tokens';

export function CornerTopRight() {
  return (
    <svg viewBox="0 0 60 60" class="w-full h-full overflow-visible" aria-hidden="true">
      {/* Wood plank L-shape (mirrored) */}
      <path
        d="M 0 20 L 38 20 C 40 20, 40 20, 40 22 L 40 60 L 60 60 L 60 0 L 0 0 Z"
        fill={COLORS.woodBase}
        filter="url(#organic-wood)"
        stroke={COLORS.woodDark}
        strokeWidth="2.5"
      />

      {/* Hexagonal bolt/nut with rust drip */}
      <g transform="translate(50, 15) rotate(20)">
        <polygon
          points="-8,-6 2,-6 6,2 2,10 -8,10 -12,2"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="1.5"
        />
        <circle cx="-3" cy="2" r="3" fill="#222" />
        {/* Rust drip marks */}
        <path
          d="M -3 6 L -2 15 M -5 6 L -6 12"
          stroke="#8B3A25"
          strokeWidth="1"
          strokeLinecap="round"
          opacity="0.8"
        />
      </g>

      {/* Ammo shell casing */}
      <rect
        x="25"
        y="45"
        width="12"
        height="5"
        rx="1"
        transform="rotate(25 25 45)"
        fill={COLORS.weatheredSteel}
        stroke="#111"
        strokeWidth="1.5"
      />

      {/* Vine curve -- thick base */}
      <path d="M 0 35 C 20 40, 40 20, 60 60" fill="none" stroke={COLORS.vineBase} strokeWidth="5" />
      {/* Vine curve -- thin highlight */}
      <path
        d="M 0 35 C 20 40, 40 20, 60 60"
        fill="none"
        stroke={COLORS.vineHighlight}
        strokeWidth="2"
      />
    </svg>
  );
}
