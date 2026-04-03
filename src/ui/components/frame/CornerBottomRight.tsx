/**
 * CornerBottomRight -- SVG corner piece for bottom-right of the 9-slice frame.
 *
 * 60x60 viewBox. Renders a mirrored wood plank L-shape (bottom variant) with
 * organic-wood filter, two tilted ammo shell casings, a moss/vine bottom
 * edge with highlight ridge, and white drip marks.
 */

import { COLORS } from '@/ui/design-tokens';

export function CornerBottomRight() {
  return (
    <svg viewBox="0 0 60 60" class="w-full h-full overflow-visible" aria-hidden="true">
      {/* Wood plank L-shape (bottom-right, mirrored) */}
      <path
        d="M 0 40 L 38 40 C 40 40, 40 40, 40 38 L 40 0 L 60 0 L 60 60 L 0 60 Z"
        fill={COLORS.woodBase}
        filter="url(#organic-wood)"
        stroke={COLORS.woodDark}
        strokeWidth="2.5"
      />

      {/* Ammo shell casings */}
      <g transform="translate(45, 20)">
        <rect
          x="-10"
          y="-15"
          width="7"
          height="18"
          rx="2"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="1.5"
          transform="rotate(-15)"
        />
        <rect
          x="0"
          y="-12"
          width="7"
          height="18"
          rx="2"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="1.5"
          transform="rotate(25)"
        />
      </g>

      {/* Moss/vine bottom edge */}
      <path
        d="M 60 45 C 50 35, 30 35, 15 45 C 5 50, 0 55, 0 60 L 60 60 Z"
        fill={COLORS.mossDark}
        stroke="#111"
        strokeWidth="2"
      />
      {/* Moss highlight ridge */}
      <path
        d="M 55 40 C 40 25, 30 35, 15 45"
        fill="none"
        stroke={COLORS.mossGreen}
        strokeWidth="3"
      />
      {/* Drip marks */}
      <path
        d="M 45 45 L 42 52 M 35 46 L 32 52 M 25 48 L 23 54"
        stroke="#FFF"
        strokeWidth="2"
        strokeLinecap="round"
      />
    </svg>
  );
}
