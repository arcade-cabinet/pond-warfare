import { COLORS } from '@/ui/design-tokens';

/** Commander Stormcaller — Lightning otter with electric aura.
 * Frame 1 (idle): crackling lightning around hands, wild fur, electric aura.
 * Frame 2 (ability): lightning bolt fires upward, intense discharge. */
export function CommanderStormcaller() {
  return (
    <svg
      viewBox="0 0 100 100"
      class="w-full h-full overflow-visible"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Commander Stormcaller"
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
        {/* Legs */}
        <path
          d="M 40 65 L 35 80 L 45 80 Z M 55 65 L 55 80 L 65 80 Z"
          fill="#3B2F2F"
          stroke="#111"
          strokeWidth="2"
        />
        {/* Body */}
        <path d="M 35 38 L 60 38 L 65 70 L 35 70 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        {/* Belly */}
        <path d="M 40 42 L 55 42 L 60 70 L 40 70 Z" fill="#C5A059" opacity="0.3" />
        {/* Head with wild fur */}
        <path d="M 33 18 L 62 18 L 67 38 L 28 38 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        {/* Wild fur spikes */}
        <polygon points="33,18 28,8 38,18" fill="#4A3B32" stroke="#111" strokeWidth="1" />
        <polygon points="43,18 42,6 50,18" fill="#4A3B32" stroke="#111" strokeWidth="1" />
        <polygon points="53,18 55,5 60,18" fill="#4A3B32" stroke="#111" strokeWidth="1" />
        {/* Snout */}
        <path
          d="M 48 30 L 67 30 L 62 38 L 43 38 Z"
          fill="#E8DCC4"
          stroke="#111"
          strokeWidth="1.5"
        />
        {/* Eyes (electric) */}
        <circle cx="48" cy="26" r="2" fill={COLORS.muzzleFlash} />
        <circle cx="56" cy="26" r="2" fill={COLORS.muzzleFlash} />
        <circle cx="48" cy="26" r="1" fill="#FFF" />
        <circle cx="56" cy="26" r="1" fill="#FFF" />
        {/* Nose */}
        <rect x="62" y="30" width="3" height="3" fill="#111" />
        {/* Hands with crackling lightning */}
        <path
          d="M 25 42 L 35 40 L 36 55 L 24 57 Z"
          fill="#4A3B32"
          stroke="#111"
          strokeWidth="1.5"
        />
        <path
          d="M 64 42 L 75 40 L 76 55 L 65 57 Z"
          fill="#4A3B32"
          stroke="#111"
          strokeWidth="1.5"
        />
        {/* Left hand sparks */}
        <polyline
          points="20,45 15,40 22,42"
          fill="none"
          stroke={COLORS.muzzleFlash}
          strokeWidth="2"
        />
        <polyline
          points="22,52 14,55 20,50"
          fill="none"
          stroke={COLORS.muzzleFlash}
          strokeWidth="1.5"
        />
        {/* Right hand sparks */}
        <polyline
          points="78,43 85,38 80,45"
          fill="none"
          stroke={COLORS.muzzleFlash}
          strokeWidth="2"
        />
        <polyline
          points="79,52 87,50 82,55"
          fill="none"
          stroke={COLORS.muzzleFlash}
          strokeWidth="1.5"
        />
        {/* Electric aura */}
        <ellipse
          cx="50"
          cy="50"
          rx="35"
          ry="30"
          fill="none"
          stroke={COLORS.muzzleFlash}
          strokeWidth="1"
          opacity="0.3"
          strokeDasharray="4 6"
        />
      </g>

      {/* FRAME 2: ABILITY */}
      <g class="sprite-frame-2">
        {/* Tail */}
        <path d="M 28 65 L 12 70 L 15 80 L 32 75 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        {/* Legs braced */}
        <path
          d="M 38 65 L 32 80 L 42 80 Z M 52 65 L 55 80 L 65 80 Z"
          fill="#3B2F2F"
          stroke="#111"
          strokeWidth="2"
        />
        {/* Body */}
        <path d="M 33 40 L 58 38 L 62 70 L 33 70 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        <path d="M 38 44 L 53 42 L 58 70 L 38 70 Z" fill="#C5A059" opacity="0.3" />
        {/* Head */}
        <path d="M 31 20 L 60 18 L 64 38 L 26 40 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        {/* Wild fur spikes (electrified) */}
        <polygon points="31,20 24,6 37,18" fill="#4A3B32" stroke="#111" strokeWidth="1" />
        <polygon points="41,19 38,3 48,18" fill="#4A3B32" stroke="#111" strokeWidth="1" />
        <polygon points="51,18 52,2 58,17" fill="#4A3B32" stroke="#111" strokeWidth="1" />
        {/* Snout */}
        <path
          d="M 45 30 L 64 28 L 59 36 L 40 38 Z"
          fill="#E8DCC4"
          stroke="#111"
          strokeWidth="1.5"
        />
        <circle cx="46" cy="26" r="2" fill={COLORS.muzzleFlash} />
        <circle cx="54" cy="25" r="2" fill={COLORS.muzzleFlash} />
        <circle cx="46" cy="26" r="1" fill="#FFF" />
        <circle cx="54" cy="25" r="1" fill="#FFF" />
        {/* Arms raised */}
        <path
          d="M 22 35 L 33 32 L 30 50 L 20 52 Z"
          fill="#4A3B32"
          stroke="#111"
          strokeWidth="1.5"
        />
        <path
          d="M 62 32 L 78 28 L 78 48 L 63 50 Z"
          fill="#4A3B32"
          stroke="#111"
          strokeWidth="1.5"
        />
        {/* Lightning bolt firing upward */}
        <polygon
          points="50,30 55,15 48,20 52,5 42,18 47,12 44,28"
          fill={COLORS.muzzleFlash}
          stroke="#FFF"
          strokeWidth="1"
        />
        {/* Intense discharge sparks */}
        <polyline
          points="15,38 8,30 18,35"
          fill="none"
          stroke={COLORS.muzzleFlash}
          strokeWidth="2"
        />
        <polyline
          points="82,32 92,25 85,35"
          fill="none"
          stroke={COLORS.muzzleFlash}
          strokeWidth="2"
        />
        <polyline
          points="30,25 22,18 28,28"
          fill="none"
          stroke={COLORS.muzzleFlash}
          strokeWidth="1.5"
        />
        <polyline
          points="72,22 80,15 75,25"
          fill="none"
          stroke={COLORS.muzzleFlash}
          strokeWidth="1.5"
        />
        {/* Electric aura (intense) */}
        <ellipse
          cx="50"
          cy="45"
          rx="40"
          ry="32"
          fill="none"
          stroke={COLORS.muzzleFlash}
          strokeWidth="2"
          opacity="0.5"
          strokeDasharray="3 4"
        />
        <ellipse
          cx="50"
          cy="45"
          rx="30"
          ry="24"
          fill="none"
          stroke="#FFF"
          strokeWidth="1"
          opacity="0.3"
          strokeDasharray="2 5"
        />
      </g>
    </svg>
  );
}
