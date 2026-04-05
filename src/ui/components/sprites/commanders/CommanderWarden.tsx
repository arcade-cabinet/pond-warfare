import { COLORS } from '@/ui/design-tokens';

/**
 * Commander Warden — Heavy otter with shield and tower insignia.
 *
 * 100x100 SVG with two animation frames:
 * - Frame 1 (idle): large shield covering front, tower insignia, heavier build
 * - Frame 2 (ability): shield raised, defensive glow around it
 */
export function CommanderWarden() {
  return (
    <svg
      viewBox="0 0 100 100"
      class="w-full h-full overflow-visible"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Commander Warden"
    >
      <ellipse
        cx="50"
        cy="85"
        rx="32"
        ry="11"
        fill="none"
        stroke={COLORS.grittyGold}
        strokeWidth="2"
        strokeDasharray="8 4"
        class="selection-circle"
      />
      <ellipse cx="50" cy="85" rx="27" ry="9" fill="rgba(0,0,0,0.5)" />

      {/* FRAME 1: IDLE */}
      <g class="sprite-frame-1">
        {/* Tail */}
        <path d="M 25 65 L 10 75 L 15 85 L 30 75 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        {/* Legs (heavier) */}
        <path
          d="M 38 68 L 30 82 L 45 82 Z M 55 68 L 52 82 L 67 82 Z"
          fill="#3B2F2F"
          stroke="#111"
          strokeWidth="2"
        />
        {/* Body (broader) */}
        <path d="M 30 35 L 65 35 L 70 72 L 30 72 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        {/* Belly */}
        <path d="M 35 45 L 60 45 L 65 72 L 35 72 Z" fill="#C5A059" opacity="0.3" />
        {/* Head */}
        <path d="M 35 15 L 62 15 L 68 35 L 30 35 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        {/* Snout */}
        <path
          d="M 48 27 L 68 27 L 63 35 L 43 35 Z"
          fill="#E8DCC4"
          stroke="#111"
          strokeWidth="1.5"
        />
        {/* Eyes (stern) */}
        <rect x="47" y="22" width="4" height="3" fill="#111" />
        <rect x="56" y="22" width="4" height="3" fill="#111" />
        {/* Nose */}
        <rect x="63" y="27" width="3" height="3" fill="#111" />
        {/* Shield (large, front-facing) */}
        <path
          d="M 68 25 L 90 25 L 88 65 L 75 75 L 65 65 Z"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Shield border */}
        <path
          d="M 70 28 L 87 28 L 85 62 L 75 70 L 68 62 Z"
          fill="none"
          stroke="#444"
          strokeWidth="2"
        />
        {/* Tower insignia on shield */}
        <rect
          x="74"
          y="35"
          width="8"
          height="20"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="1"
        />
        <rect
          x="72"
          y="35"
          width="12"
          height="5"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="1"
        />
        {/* Tower battlements */}
        <rect
          x="72"
          y="32"
          width="3"
          height="5"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="0.5"
        />
        <rect
          x="77"
          y="32"
          width="3"
          height="5"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="0.5"
        />
        <rect
          x="82"
          y="32"
          width="3"
          height="5"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="0.5"
        />
      </g>

      {/* FRAME 2: ABILITY */}
      <g class="sprite-frame-2">
        {/* Tail */}
        <path d="M 23 65 L 8 70 L 12 82 L 28 75 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        {/* Legs braced */}
        <path
          d="M 36 68 L 27 82 L 42 82 Z M 53 68 L 50 82 L 65 82 Z"
          fill="#3B2F2F"
          stroke="#111"
          strokeWidth="2"
        />
        {/* Body */}
        <path d="M 28 37 L 63 35 L 68 72 L 28 72 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        <path d="M 33 47 L 58 45 L 63 72 L 33 72 Z" fill="#C5A059" opacity="0.3" />
        {/* Head */}
        <path d="M 33 17 L 60 15 L 65 35 L 28 37 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        <path
          d="M 46 27 L 65 25 L 60 33 L 41 35 Z"
          fill="#E8DCC4"
          stroke="#111"
          strokeWidth="1.5"
        />
        <rect x="45" y="22" width="4" height="3" fill="#111" />
        <rect x="54" y="21" width="4" height="3" fill="#111" />
        {/* Shield raised */}
        <path
          d="M 65 15 L 92 15 L 90 55 L 78 65 L 62 55 Z"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="2"
        />
        <path
          d="M 68 18 L 89 18 L 87 52 L 78 60 L 65 52 Z"
          fill="none"
          stroke="#444"
          strokeWidth="2"
        />
        {/* Tower insignia */}
        <rect
          x="75"
          y="25"
          width="8"
          height="20"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="1"
        />
        <rect
          x="73"
          y="25"
          width="12"
          height="5"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="1"
        />
        <rect
          x="73"
          y="22"
          width="3"
          height="5"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="0.5"
        />
        <rect
          x="78"
          y="22"
          width="3"
          height="5"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="0.5"
        />
        <rect
          x="83"
          y="22"
          width="3"
          height="5"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="0.5"
        />
        {/* Shield glow */}
        <path
          d="M 65 15 L 92 15 L 90 55 L 78 65 L 62 55 Z"
          fill={COLORS.grittyGold}
          opacity="0.2"
        />
        <path
          d="M 60 10 L 95 10 L 93 60 L 78 72 L 57 60 Z"
          fill="none"
          stroke={COLORS.grittyGold}
          strokeWidth="2"
          opacity="0.4"
        />
      </g>
    </svg>
  );
}
