import { COLORS } from '@/ui/design-tokens';

/**
 * Commander Ironpaw — Bulky otter with oversized metal gauntlets.
 *
 * 100x100 SVG with two animation frames:
 * - Frame 1 (idle): broad build, metal gauntlets, ground crack marks
 * - Frame 2 (ability): fist punch forward with impact lines
 */
export function CommanderIronpaw() {
  return (
    <svg
      viewBox="0 0 100 100"
      class="w-full h-full overflow-visible"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Commander Ironpaw"
    >
      <ellipse
        cx="50"
        cy="85"
        rx="33"
        ry="11"
        fill="none"
        stroke={COLORS.grittyGold}
        strokeWidth="2"
        strokeDasharray="8 4"
        class="selection-circle"
      />
      <ellipse cx="50" cy="85" rx="28" ry="9" fill="rgba(0,0,0,0.5)" />

      {/* FRAME 1: IDLE */}
      <g class="sprite-frame-1">
        {/* Tail */}
        <path d="M 25 65 L 10 75 L 15 85 L 30 75 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        {/* Legs (thick) */}
        <path
          d="M 35 68 L 28 82 L 45 82 Z M 55 68 L 52 82 L 68 82 Z"
          fill="#3B2F2F"
          stroke="#111"
          strokeWidth="2"
        />
        {/* Body (broader) */}
        <path d="M 28 35 L 68 35 L 72 72 L 28 72 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        {/* Belly */}
        <path d="M 35 40 L 62 40 L 65 72 L 35 72 Z" fill="#C5A059" opacity="0.3" />
        {/* Head (stocky) */}
        <path d="M 33 15 L 63 15 L 68 35 L 28 35 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        {/* Snout */}
        <path
          d="M 48 27 L 68 27 L 63 35 L 43 35 Z"
          fill="#E8DCC4"
          stroke="#111"
          strokeWidth="1.5"
        />
        {/* Eyes (determined) */}
        <rect x="46" y="22" width="4" height="3" fill="#111" />
        <rect x="56" y="22" width="4" height="3" fill="#111" />
        {/* Nose */}
        <rect x="63" y="27" width="3" height="3" fill="#111" />
        {/* Left gauntlet (oversized) */}
        <path
          d="M 10 40 L 28 38 L 30 58 L 8 60 Z"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="2"
        />
        <rect x="12" y="43" width="15" height="4" fill="#888" stroke="#111" strokeWidth="1" />
        <rect x="12" y="50" width="15" height="4" fill="#888" stroke="#111" strokeWidth="1" />
        {/* Left fist */}
        <path
          d="M 5 55 L 15 55 L 15 65 L 5 65 Z"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Right gauntlet */}
        <path
          d="M 68 40 L 88 38 L 90 58 L 70 60 Z"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="2"
        />
        <rect x="70" y="43" width="15" height="4" fill="#888" stroke="#111" strokeWidth="1" />
        <rect x="70" y="50" width="15" height="4" fill="#888" stroke="#111" strokeWidth="1" />
        {/* Right fist */}
        <path
          d="M 83 55 L 93 55 L 93 65 L 83 65 Z"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Ground crack marks */}
        <line x1="35" y1="83" x2="30" y2="88" stroke="#444" strokeWidth="1.5" />
        <line x1="50" y1="83" x2="50" y2="90" stroke="#444" strokeWidth="1.5" />
        <line x1="65" y1="83" x2="70" y2="88" stroke="#444" strokeWidth="1.5" />
      </g>

      {/* FRAME 2: ABILITY */}
      <g class="sprite-frame-2">
        {/* Tail */}
        <path d="M 22 65 L 5 70 L 10 82 L 28 75 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        {/* Legs braced */}
        <path
          d="M 33 68 L 25 82 L 42 82 Z M 53 68 L 50 82 L 66 82 Z"
          fill="#3B2F2F"
          stroke="#111"
          strokeWidth="2"
        />
        {/* Body leaning forward */}
        <path d="M 26 37 L 66 33 L 70 72 L 26 72 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        <path d="M 33 42 L 60 38 L 63 72 L 33 72 Z" fill="#C5A059" opacity="0.3" />
        {/* Head */}
        <path d="M 31 17 L 61 13 L 66 33 L 26 37 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        <path
          d="M 46 25 L 66 23 L 61 31 L 41 33 Z"
          fill="#E8DCC4"
          stroke="#111"
          strokeWidth="1.5"
        />
        <rect x="44" y="20" width="4" height="3" fill="#111" />
        <rect x="54" y="19" width="4" height="3" fill="#111" />
        {/* Left arm back */}
        <path
          d="M 8 42 L 26 40 L 28 58 L 6 60 Z"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="2"
        />
        <path
          d="M 3 55 L 13 55 L 13 65 L 3 65 Z"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Right fist PUNCHING FORWARD */}
        <path
          d="M 68 30 L 95 25 L 98 42 L 70 47 Z"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="2"
        />
        <rect x="72" y="32" width="18" height="3" fill="#888" stroke="#111" strokeWidth="1" />
        <rect x="72" y="38" width="18" height="3" fill="#888" stroke="#111" strokeWidth="1" />
        {/* Fist */}
        <path
          d="M 93 22 L 105 20 L 105 45 L 93 47 Z"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Impact lines */}
        <line x1="105" y1="25" x2="115" y2="20" stroke={COLORS.grittyGold} strokeWidth="2" />
        <line x1="105" y1="33" x2="118" y2="33" stroke={COLORS.grittyGold} strokeWidth="2" />
        <line x1="105" y1="40" x2="115" y2="45" stroke={COLORS.grittyGold} strokeWidth="2" />
        {/* Ground impact cracks */}
        <line x1="30" y1="83" x2="22" y2="92" stroke="#444" strokeWidth="2" />
        <line x1="48" y1="83" x2="48" y2="93" stroke="#444" strokeWidth="2" />
        <line x1="65" y1="83" x2="72" y2="92" stroke="#444" strokeWidth="2" />
      </g>
    </svg>
  );
}
