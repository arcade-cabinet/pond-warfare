import { COLORS } from '@/ui/design-tokens';

/**
 * Commander Sage — Robed otter with staff and book.
 *
 * 100x100 SVG with two animation frames:
 * - Frame 1 (idle): long robe, wooden staff with glowing top, book under arm
 * - Frame 2 (ability): staff glows brighter, energy rings
 */
export function CommanderSage() {
  return (
    <svg
      viewBox="0 0 100 100"
      class="w-full h-full overflow-visible"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Commander Sage"
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
        {/* Tail */}
        <path d="M 30 65 L 15 75 L 20 85 L 35 75 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        {/* Robe (full length) */}
        <path
          d="M 33 35 L 62 35 L 68 82 L 28 82 Z"
          fill={COLORS.mossGreen}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Robe trim */}
        <path
          d="M 28 78 L 68 78 L 68 82 L 28 82 Z"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="1"
        />
        {/* Robe sash */}
        <path
          d="M 40 50 L 55 50 L 52 55 L 43 55 Z"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="1"
        />
        {/* Head */}
        <path d="M 35 15 L 60 15 L 65 35 L 30 35 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        {/* Snout */}
        <path
          d="M 45 27 L 65 27 L 60 35 L 40 35 Z"
          fill="#E8DCC4"
          stroke="#111"
          strokeWidth="1.5"
        />
        {/* Eyes (wise, slightly narrowed) */}
        <ellipse cx="48" cy="23" rx="2" ry="1.5" fill="#111" />
        <ellipse cx="56" cy="23" rx="2" ry="1.5" fill="#111" />
        {/* Nose */}
        <rect x="60" y="27" width="3" height="3" fill="#111" />
        {/* Hood */}
        <path
          d="M 28 15 L 67 15 L 62 25 L 33 25 Z"
          fill={COLORS.mossDark}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Staff */}
        <rect x="70" y="15" width="3" height="68" fill="#6B4226" stroke="#111" strokeWidth="1.5" />
        {/* Staff glow orb */}
        <circle cx="71" cy="15" r="5" fill={COLORS.grittyGold} stroke="#111" strokeWidth="1" />
        <circle cx="71" cy="15" r="3" fill="#FFD700" opacity="0.6" />
        {/* Book under arm */}
        <rect
          x="25"
          y="48"
          width="10"
          height="12"
          fill={COLORS.woodDark}
          stroke="#111"
          strokeWidth="1.5"
        />
        <line x1="25" y1="54" x2="35" y2="54" stroke={COLORS.grittyGold} strokeWidth="1" />
      </g>

      {/* FRAME 2: ABILITY */}
      <g class="sprite-frame-2">
        {/* Tail */}
        <path d="M 28 65 L 12 70 L 15 80 L 32 75 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        {/* Robe */}
        <path
          d="M 31 37 L 60 35 L 66 82 L 26 82 Z"
          fill={COLORS.mossGreen}
          stroke="#111"
          strokeWidth="2"
        />
        <path
          d="M 26 78 L 66 78 L 66 82 L 26 82 Z"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="1"
        />
        <path
          d="M 38 50 L 53 50 L 50 55 L 41 55 Z"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="1"
        />
        {/* Head */}
        <path d="M 33 17 L 58 15 L 60 35 L 28 37 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        <path
          d="M 43 27 L 60 25 L 55 33 L 38 35 Z"
          fill="#E8DCC4"
          stroke="#111"
          strokeWidth="1.5"
        />
        <ellipse cx="46" cy="23" rx="2" ry="1.5" fill="#111" />
        <ellipse cx="54" cy="22" rx="2" ry="1.5" fill="#111" />
        {/* Hood */}
        <path
          d="M 26 17 L 65 15 L 60 25 L 31 27 Z"
          fill={COLORS.mossDark}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Staff raised */}
        <rect x="68" y="5" width="3" height="68" fill="#6B4226" stroke="#111" strokeWidth="1.5" />
        {/* Staff bright glow */}
        <circle cx="69" cy="5" r="8" fill={COLORS.grittyGold} opacity="0.4" />
        <circle cx="69" cy="5" r="5" fill={COLORS.grittyGold} stroke="#111" strokeWidth="1" />
        <circle cx="69" cy="5" r="3" fill="#FFD700" />
        {/* Energy rings */}
        <ellipse
          cx="69"
          cy="5"
          rx="12"
          ry="4"
          fill="none"
          stroke={COLORS.grittyGold}
          strokeWidth="1"
          opacity="0.6"
        />
        <ellipse
          cx="69"
          cy="5"
          rx="18"
          ry="6"
          fill="none"
          stroke={COLORS.grittyGold}
          strokeWidth="1"
          opacity="0.3"
        />
        {/* Book under arm */}
        <rect
          x="23"
          y="48"
          width="10"
          height="12"
          fill={COLORS.woodDark}
          stroke="#111"
          strokeWidth="1.5"
        />
        <line x1="23" y1="54" x2="33" y2="54" stroke={COLORS.grittyGold} strokeWidth="1" />
      </g>
    </svg>
  );
}
