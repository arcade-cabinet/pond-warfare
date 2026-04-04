import { COLORS } from '@/ui/design-tokens';

/**
 * Commander Tidekeeper — Swimming otter with wave motif.
 *
 * 100x100 SVG with two animation frames:
 * - Frame 1 (idle): blue-tinted body, wave patterns, water droplets
 * - Frame 2 (ability): wave splash effect, water burst
 */
export function CommanderTidekeeper() {
  return (
    <svg
      viewBox="0 0 100 100"
      class="w-full h-full overflow-visible"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Commander Tidekeeper"
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
        {/* Tail (flipper-like) */}
        <path
          d="M 25 65 L 10 72 L 8 82 L 20 80 L 32 72 Z"
          fill="#3A5A6A"
          stroke="#111"
          strokeWidth="2"
        />
        {/* Legs */}
        <path
          d="M 40 65 L 35 80 L 45 80 Z M 55 65 L 55 80 L 65 80 Z"
          fill="#2A4A5A"
          stroke="#111"
          strokeWidth="2"
        />
        {/* Body (blue-tinted) */}
        <path d="M 35 38 L 60 38 L 65 70 L 35 70 Z" fill="#3A5A6A" stroke="#111" strokeWidth="2" />
        {/* Belly */}
        <path d="M 40 42 L 55 42 L 60 70 L 40 70 Z" fill="#6AA0B0" opacity="0.4" />
        {/* Wave pattern on body */}
        <path
          d="M 36 50 Q 42 46 48 50 Q 54 54 60 50"
          fill="none"
          stroke="#6AA0B0"
          strokeWidth="2"
        />
        <path
          d="M 36 58 Q 42 54 48 58 Q 54 62 60 58"
          fill="none"
          stroke="#6AA0B0"
          strokeWidth="2"
        />
        {/* Head */}
        <path d="M 35 18 L 60 18 L 65 38 L 30 38 Z" fill="#3A5A6A" stroke="#111" strokeWidth="2" />
        {/* Snout */}
        <path
          d="M 45 30 L 65 30 L 60 38 L 40 38 Z"
          fill="#B0D0D8"
          stroke="#111"
          strokeWidth="1.5"
        />
        {/* Eyes (aqua tint) */}
        <circle cx="48" cy="26" r="2" fill="#111" />
        <circle cx="56" cy="26" r="2" fill="#111" />
        <circle cx="49" cy="25" r="0.8" fill="#4AC0E0" />
        <circle cx="57" cy="25" r="0.8" fill="#4AC0E0" />
        {/* Nose */}
        <rect x="60" y="30" width="3" height="3" fill="#111" />
        {/* Water droplets floating around */}
        <circle cx="25" cy="35" r="2" fill="#4AC0E0" opacity="0.7" />
        <circle cx="72" cy="28" r="1.5" fill="#4AC0E0" opacity="0.6" />
        <circle cx="18" cy="50" r="1.5" fill="#4AC0E0" opacity="0.5" />
        <circle cx="75" cy="55" r="2" fill="#4AC0E0" opacity="0.6" />
        {/* Trident (water weapon) */}
        <rect x="68" y="25" width="2" height="45" fill="#6AA0B0" stroke="#111" strokeWidth="1" />
        <path
          d="M 64 25 L 69 15 L 74 25 Z"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="1"
        />
        <path d="M 62 22 L 64 15" stroke={COLORS.weatheredSteel} strokeWidth="2" />
        <path d="M 76 22 L 74 15" stroke={COLORS.weatheredSteel} strokeWidth="2" />
      </g>

      {/* FRAME 2: ABILITY */}
      <g class="sprite-frame-2">
        {/* Tail */}
        <path
          d="M 23 65 L 8 68 L 5 78 L 18 78 L 30 72 Z"
          fill="#3A5A6A"
          stroke="#111"
          strokeWidth="2"
        />
        {/* Legs */}
        <path
          d="M 38 65 L 32 80 L 42 80 Z M 52 65 L 55 80 L 65 80 Z"
          fill="#2A4A5A"
          stroke="#111"
          strokeWidth="2"
        />
        {/* Body */}
        <path d="M 33 40 L 58 38 L 62 70 L 33 70 Z" fill="#3A5A6A" stroke="#111" strokeWidth="2" />
        <path d="M 38 44 L 53 42 L 58 70 L 38 70 Z" fill="#6AA0B0" opacity="0.4" />
        {/* Head */}
        <path d="M 33 20 L 58 18 L 62 38 L 28 40 Z" fill="#3A5A6A" stroke="#111" strokeWidth="2" />
        <path
          d="M 43 30 L 62 28 L 57 36 L 38 38 Z"
          fill="#B0D0D8"
          stroke="#111"
          strokeWidth="1.5"
        />
        <circle cx="46" cy="26" r="2" fill="#111" />
        <circle cx="54" cy="25" r="2" fill="#111" />
        {/* Trident raised */}
        <rect x="66" y="15" width="2" height="45" fill="#6AA0B0" stroke="#111" strokeWidth="1" />
        <path
          d="M 62 15 L 67 5 L 72 15 Z"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="1"
        />
        <path d="M 60 12 L 62 5" stroke={COLORS.weatheredSteel} strokeWidth="2" />
        <path d="M 74 12 L 72 5" stroke={COLORS.weatheredSteel} strokeWidth="2" />
        {/* Wave splash effect */}
        <path
          d="M 10 78 Q 25 68 40 78 Q 55 88 70 78 Q 85 68 100 78"
          fill="none"
          stroke="#4AC0E0"
          strokeWidth="3"
          opacity="0.7"
        />
        <path
          d="M 5 85 Q 20 75 35 85 Q 50 95 65 85 Q 80 75 95 85"
          fill="none"
          stroke="#4AC0E0"
          strokeWidth="2"
          opacity="0.4"
        />
        {/* Water burst droplets */}
        <circle cx="20" cy="30" r="2.5" fill="#4AC0E0" opacity="0.8" />
        <circle cx="80" cy="25" r="2" fill="#4AC0E0" opacity="0.7" />
        <circle cx="15" cy="45" r="2" fill="#4AC0E0" opacity="0.6" />
        <circle cx="85" cy="42" r="2.5" fill="#4AC0E0" opacity="0.7" />
        <circle cx="30" cy="20" r="1.5" fill="#4AC0E0" opacity="0.5" />
        <circle cx="75" cy="18" r="1.5" fill="#4AC0E0" opacity="0.5" />
      </g>
    </svg>
  );
}
