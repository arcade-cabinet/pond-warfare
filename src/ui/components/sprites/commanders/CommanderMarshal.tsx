import { COLORS } from '@/ui/design-tokens';

/**
 * Commander Marshal — Armored otter with sword.
 *
 * 100x100 SVG with two animation frames:
 * - Frame 1 (idle): armored body, sword in hand, commander insignia
 * - Frame 2 (ability): sword raised high, gold aura pulse
 */
export function CommanderMarshal() {
  return (
    <svg
      viewBox="0 0 100 100"
      class="w-full h-full overflow-visible"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Commander Marshal"
    >
      {/* Selection Circle */}
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
        {/* Armor plates */}
        <path
          d="M 37 40 L 58 40 L 62 65 L 37 65 Z"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="2"
        />
        <path d="M 40 40 L 55 40 L 58 65 L 40 65 Z" fill="#7A8A8A" opacity="0.6" />
        {/* Armor rivets */}
        <circle cx="42" cy="48" r="1.5" fill="#222" />
        <circle cx="53" cy="48" r="1.5" fill="#222" />
        <circle cx="42" cy="58" r="1.5" fill="#222" />
        <circle cx="53" cy="58" r="1.5" fill="#222" />
        {/* Head */}
        <path d="M 35 18 L 60 18 L 65 38 L 30 38 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        {/* Snout */}
        <path
          d="M 45 30 L 65 30 L 60 38 L 40 38 Z"
          fill="#E8DCC4"
          stroke="#111"
          strokeWidth="1.5"
        />
        {/* Eyes */}
        <circle cx="48" cy="26" r="2" fill="#111" />
        <circle cx="56" cy="26" r="2" fill="#111" />
        {/* Nose */}
        <rect x="60" y="30" width="3" height="3" fill="#111" />
        {/* Commander insignia — gold star on shoulder */}
        <polygon
          points="38,42 40,46 44,46 41,49 42,53 38,50 34,53 35,49 32,46 36,46"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="1"
        />
        {/* Sword in hand */}
        <rect
          x="65"
          y="30"
          width="3"
          height="40"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="1.5"
        />
        {/* Sword guard */}
        <rect
          x="60"
          y="44"
          width="13"
          height="3"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="1"
        />
        {/* Sword pommel */}
        <circle cx="66" cy="70" r="3" fill={COLORS.grittyGold} stroke="#111" strokeWidth="1" />
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
        {/* Armor */}
        <path
          d="M 35 42 L 56 40 L 60 65 L 35 65 Z"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="2"
        />
        <path d="M 38 42 L 53 40 L 56 65 L 38 65 Z" fill="#7A8A8A" opacity="0.6" />
        {/* Head looking up */}
        <path d="M 33 20 L 58 18 L 60 38 L 28 40 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        <path
          d="M 43 30 L 60 28 L 55 36 L 38 38 Z"
          fill="#E8DCC4"
          stroke="#111"
          strokeWidth="1.5"
        />
        <circle cx="46" cy="26" r="2" fill="#111" />
        <circle cx="54" cy="25" r="2" fill="#111" />
        {/* Insignia */}
        <polygon
          points="36,44 38,48 42,48 39,51 40,55 36,52 32,55 33,51 30,48 34,48"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="1"
        />
        {/* Sword raised */}
        <rect
          x="62"
          y="5"
          width="3"
          height="40"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="1.5"
          transform="rotate(-15 63 25)"
        />
        <rect
          x="57"
          y="38"
          width="13"
          height="3"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="1"
          transform="rotate(-15 63 39)"
        />
        {/* Gold aura pulse */}
        <circle
          cx="50"
          cy="50"
          r="40"
          fill="none"
          stroke={COLORS.grittyGold}
          strokeWidth="2"
          opacity="0.5"
          strokeDasharray="6 4"
        />
      </g>
    </svg>
  );
}
