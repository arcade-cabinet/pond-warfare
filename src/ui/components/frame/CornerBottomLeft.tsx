/**
 * CornerBottomLeft -- SVG corner piece for bottom-left of the 9-slice frame.
 *
 * 60x60 viewBox. Renders a wood plank L-shape (bottom variant) with
 * organic-wood filter, a moss clump with mushroom stalks, and a golden berry.
 */

import { COLORS } from '@/ui/design-tokens';

export function CornerBottomLeft() {
  return (
    <svg viewBox="0 0 60 60" class="w-full h-full overflow-visible" aria-hidden="true">
      {/* Wood plank L-shape (bottom-left) */}
      <path
        d="M 60 40 L 22 40 C 20 40, 20 40, 20 38 L 20 0 L 0 0 L 0 60 L 60 60 Z"
        fill={COLORS.woodBase}
        filter="url(#organic-wood)"
        stroke={COLORS.woodDark}
        strokeWidth="2.5"
      />

      {/* Moss clump with mushrooms and golden berry */}
      <g transform="translate(5, 40)">
        {/* Moss body */}
        <path
          d="M 0 5 C 15 -10, 35 -5, 50 5 C 55 10, 55 18, 50 20 L -5 20 Z"
          fill={COLORS.mossDark}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Moss highlight ridge */}
        <path
          d="M 5 0 C 20 -15, 30 -5, 45 5"
          fill="none"
          stroke={COLORS.mossGreen}
          strokeWidth="3"
        />
        {/* Mushroom stalks */}
        <path
          d="M 15 5 L 18 12 M 25 6 L 28 12 M 35 8 L 37 14"
          stroke="#FFF"
          strokeWidth="2"
          strokeLinecap="round"
        />
        {/* Golden berry */}
        <circle cx="38" cy="0" r="2.5" fill={COLORS.grittyGold} stroke="#000" />
      </g>
    </svg>
  );
}
