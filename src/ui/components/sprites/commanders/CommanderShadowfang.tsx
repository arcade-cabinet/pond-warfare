import { COLORS } from '@/ui/design-tokens';

/**
 * Commander Shadowfang — Dark-cloaked otter with glowing eyes.
 *
 * 100x100 SVG with two animation frames:
 * - Frame 1 (idle): dark cloak, glowing eyes, shadow wisps
 * - Frame 2 (ability): cloak spreads wide, eyes brighter, shadow tendrils
 */
export function CommanderShadowfang() {
  return (
    <svg
      viewBox="0 0 100 100"
      class="w-full h-full overflow-visible"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Commander Shadowfang"
    >
      <ellipse
        cx="50"
        cy="85"
        rx="30"
        ry="10"
        fill="none"
        stroke={COLORS.grittyGold}
        strokeWidth="2"
        strokeDasharray="8 4"
        class="selection-circle"
      />
      <ellipse cx="50" cy="85" rx="25" ry="8" fill="rgba(0,0,0,0.5)" />

      {/* FRAME 1: IDLE */}
      <g class="sprite-frame-1">
        {/* Shadow wisps behind */}
        <path
          d="M 25 55 Q 15 50 20 40 Q 10 45 15 55"
          fill="none"
          stroke="#222"
          strokeWidth="2"
          opacity="0.5"
        />
        <path
          d="M 70 50 Q 80 45 75 35 Q 85 40 80 50"
          fill="none"
          stroke="#222"
          strokeWidth="2"
          opacity="0.5"
        />
        {/* Cloak (covers most of body) */}
        <path
          d="M 25 20 L 70 20 L 75 82 L 20 82 Z"
          fill={COLORS.woodDark}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Cloak inner shadow */}
        <path d="M 30 25 L 65 25 L 70 78 L 25 78 Z" fill="#1A0E05" opacity="0.6" />
        {/* Cloak clasp */}
        <circle cx="47" cy="25" r="3" fill={COLORS.weatheredSteel} stroke="#111" strokeWidth="1" />
        {/* Body glimpse under cloak */}
        <path d="M 38 50 L 57 50 L 60 72 L 38 72 Z" fill="#3B2F2F" stroke="none" />
        {/* Legs barely visible */}
        <path
          d="M 38 70 L 35 82 L 42 82 Z M 53 70 L 53 82 L 60 82 Z"
          fill="#2A1E15"
          stroke="#111"
          strokeWidth="1"
        />
        {/* Head (partly hooded) */}
        <path d="M 35 18 L 60 18 L 62 35 L 33 35 Z" fill="#3B2F2F" stroke="#111" strokeWidth="2" />
        {/* Snout */}
        <path
          d="M 45 28 L 62 28 L 58 35 L 42 35 Z"
          fill="#E8DCC4"
          stroke="#111"
          strokeWidth="1.5"
        />
        {/* Glowing eyes */}
        <circle cx="47" cy="24" r="2.5" fill="#44FF44" />
        <circle cx="55" cy="24" r="2.5" fill="#44FF44" />
        <circle cx="47" cy="24" r="1" fill="#AAFFAA" />
        <circle cx="55" cy="24" r="1" fill="#AAFFAA" />
        {/* Nose */}
        <rect x="58" y="28" width="3" height="3" fill="#111" />
        {/* Hood shadow */}
        <path
          d="M 28 15 L 67 15 L 64 22 L 31 22 Z"
          fill={COLORS.woodDark}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Shadow wisps at feet */}
        <path
          d="M 20 80 Q 30 75 40 80 Q 50 85 60 80 Q 70 75 80 80"
          fill="none"
          stroke="#222"
          strokeWidth="2"
          opacity="0.4"
        />
      </g>

      {/* FRAME 2: ABILITY */}
      <g class="sprite-frame-2">
        {/* Shadow tendrils expanding */}
        <path
          d="M 15 50 Q 5 40 10 25 Q 0 35 5 50"
          fill="none"
          stroke="#222"
          strokeWidth="3"
          opacity="0.6"
        />
        <path
          d="M 80 45 Q 90 35 85 20 Q 95 30 90 45"
          fill="none"
          stroke="#222"
          strokeWidth="3"
          opacity="0.6"
        />
        <path d="M 20 70 Q 5 65 8 50" fill="none" stroke="#222" strokeWidth="2" opacity="0.4" />
        <path d="M 78 68 Q 95 60 92 48" fill="none" stroke="#222" strokeWidth="2" opacity="0.4" />
        {/* Cloak spread wide */}
        <path
          d="M 10 22 L 85 22 L 90 82 L 5 82 Z"
          fill={COLORS.woodDark}
          stroke="#111"
          strokeWidth="2"
        />
        <path d="M 15 27 L 80 27 L 85 78 L 10 78 Z" fill="#1A0E05" opacity="0.6" />
        {/* Cloak clasp */}
        <circle cx="47" cy="27" r="3" fill={COLORS.weatheredSteel} stroke="#111" strokeWidth="1" />
        {/* Body */}
        <path d="M 36 48 L 55 48 L 58 72 L 36 72 Z" fill="#3B2F2F" stroke="none" />
        {/* Legs */}
        <path
          d="M 36 70 L 33 82 L 40 82 Z M 51 70 L 51 82 L 58 82 Z"
          fill="#2A1E15"
          stroke="#111"
          strokeWidth="1"
        />
        {/* Head */}
        <path d="M 33 20 L 58 18 L 60 35 L 31 37 Z" fill="#3B2F2F" stroke="#111" strokeWidth="2" />
        <path
          d="M 43 28 L 60 26 L 56 34 L 40 36 Z"
          fill="#E8DCC4"
          stroke="#111"
          strokeWidth="1.5"
        />
        {/* Eyes BRIGHTER */}
        <circle cx="45" cy="24" r="3" fill="#44FF44" />
        <circle cx="53" cy="23" r="3" fill="#44FF44" />
        <circle cx="45" cy="24" r="1.5" fill="#FFFFFF" />
        <circle cx="53" cy="23" r="1.5" fill="#FFFFFF" />
        {/* Hood */}
        <path
          d="M 26 18 L 65 16 L 62 23 L 29 25 Z"
          fill={COLORS.woodDark}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Dark aura */}
        <ellipse
          cx="47"
          cy="50"
          rx="45"
          ry="35"
          fill="none"
          stroke="#222"
          strokeWidth="3"
          opacity="0.3"
          strokeDasharray="5 5"
        />
      </g>
    </svg>
  );
}
