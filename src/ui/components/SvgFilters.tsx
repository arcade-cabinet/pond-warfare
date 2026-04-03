/**
 * SvgFilters — Hidden SVG defs block providing procedural texture filters.
 *
 * Rendered once near the app root. Referenced by frame pieces via
 * filter="url(#grunge-heavy)" etc. Three filters from the design bible:
 *
 * - grunge-heavy: fractal noise multiplied over content for worn texture
 * - organic-wood: directional grain + displacement warp for plank surfaces
 * - swamp-glow: dual drop-shadow (black depth + green ambient)
 */

import { COLORS } from '../design-tokens';

export function SvgFilters() {
  return (
    <svg style={{ width: 0, height: 0, position: 'absolute' }} aria-hidden="true">
      <defs>
        {/* Worn grunge overlay — applies fractal noise at 20% opacity */}
        <filter id="grunge-heavy" x="-10%" y="-10%" width="120%" height="120%">
          <feTurbulence type="fractalNoise" baseFrequency="0.6" numOctaves={4} result="noise" />
          <feColorMatrix
            type="matrix"
            values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  0 0 0 0.2 0"
            in="noise"
            result="coloredNoise"
          />
          <feBlend in="SourceGraphic" in2="coloredNoise" mode="multiply" />
        </filter>

        {/* Wood grain — directional noise + slight shape warp */}
        <filter id="organic-wood" x="-20%" y="-20%" width="140%" height="140%">
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.01 0.3"
            numOctaves={3}
            result="grain"
          />
          <feColorMatrix
            type="matrix"
            values="0 0 0 0 0.2   0 0 0 0 0.1   0 0 0 0 0.05  0 0 0 0.7 0"
            in="grain"
            result="darkGrain"
          />
          <feTurbulence
            type="fractalNoise"
            baseFrequency="0.05"
            numOctaves={2}
            result="warpNoise"
          />
          <feDisplacementMap
            in="SourceGraphic"
            in2="warpNoise"
            scale={3}
            xChannelSelector="R"
            yChannelSelector="G"
            result="warpedShape"
          />
          <feBlend in="warpedShape" in2="darkGrain" mode="multiply" />
        </filter>

        {/* Swamp glow — black depth shadow + green ambient aura */}
        <filter id="swamp-glow">
          <feDropShadow dx="0" dy="5" stdDeviation="5" floodColor="#000" floodOpacity="0.8" />
          <feDropShadow
            dx="0"
            dy="0"
            stdDeviation="15"
            floodColor={COLORS.mossGreen}
            floodOpacity="0.4"
          />
        </filter>
      </defs>
    </svg>
  );
}
