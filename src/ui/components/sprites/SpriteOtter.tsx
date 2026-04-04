import { COLORS } from '@/ui/design-tokens';

/**
 * Otter Commando — Assault Infantry sprite.
 *
 * 100x100 SVG with two animation frames:
 * - Frame 1 (idle): body, tail, legs, ammo belt, head with bandana, assault rifle
 * - Frame 2 (attacking): recoil pose, muzzle flash, ejected casing
 *
 * CSS classes control frame toggling:
 * - .sprite-frame-1 / .sprite-frame-2 for idle/attack step animation
 * - .selection-circle for spinning dashed selection ring
 */
export function SpriteOtter() {
  return (
    <svg
      viewBox="0 0 100 100"
      class="w-full h-full overflow-visible"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Otter Commando"
    >
      {/* RTS Selection Circle */}
      <ellipse
        cx="50"
        cy="85"
        rx="30"
        ry="10"
        fill="none"
        stroke={COLORS.mossGreen}
        strokeWidth="2"
        strokeDasharray="8 4"
        class="selection-circle"
      />
      {/* Shadow */}
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
        <path d="M 35 40 L 60 40 L 65 70 L 35 70 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        {/* Belly */}
        <path d="M 40 40 L 55 40 L 60 70 L 40 70 Z" fill="#C5A059" opacity="0.4" />
        {/* Vest / Ammo Belt */}
        <path
          d="M 35 55 L 65 65 L 65 70 L 35 60 Z"
          fill={COLORS.mossDark}
          stroke="#111"
          strokeWidth="2"
        />
        <rect
          x="40"
          y="58"
          width="5"
          height="8"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="1"
          transform="rotate(15 40 58)"
        />
        <rect
          x="48"
          y="60"
          width="5"
          height="8"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="1"
          transform="rotate(15 48 60)"
        />
        {/* Head */}
        <path d="M 35 20 L 60 20 L 65 40 L 30 40 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        {/* Snout */}
        <path
          d="M 45 32 L 65 32 L 60 40 L 40 40 Z"
          fill="#E8DCC4"
          stroke="#111"
          strokeWidth="1.5"
        />
        {/* Eyes */}
        <circle cx="48" cy="28" r="2" fill="#111" />
        <circle cx="56" cy="28" r="2" fill="#111" />
        {/* Nose */}
        <rect x="60" y="32" width="3" height="3" fill="#111" />
        {/* Bandana */}
        <path
          d="M 30 20 L 65 20 L 60 28 L 35 28 Z"
          fill={COLORS.mossGreen}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Bandana Tails */}
        <path
          d="M 30 24 L 15 30 L 20 35 L 30 28 Z"
          fill={COLORS.mossGreen}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Gun (Assault Rifle) */}
        <path
          d="M 30 45 L 80 45 L 80 50 L 30 50 Z"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Magazine */}
        <path d="M 45 50 L 45 60 L 55 60 L 55 50 Z" fill="#222" stroke="#111" strokeWidth="2" />
        {/* Stock */}
        <path d="M 30 45 L 25 55 L 35 55 Z" fill="#222" stroke="#111" strokeWidth="2" />
      </g>

      {/* FRAME 2: ATTACKING */}
      <g class="sprite-frame-2">
        {/* Tail shifted */}
        <path d="M 28 65 L 12 70 L 15 80 L 32 75 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        {/* Legs braced */}
        <path
          d="M 38 65 L 32 80 L 42 80 Z M 52 65 L 55 80 L 65 80 Z"
          fill="#3B2F2F"
          stroke="#111"
          strokeWidth="2"
        />
        {/* Body recoiled */}
        <path d="M 32 42 L 58 40 L 62 70 L 32 70 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        <path d="M 38 42 L 52 40 L 58 70 L 38 70 Z" fill="#C5A059" opacity="0.4" />
        {/* Vest */}
        <path
          d="M 32 55 L 62 65 L 62 70 L 32 60 Z"
          fill={COLORS.mossDark}
          stroke="#111"
          strokeWidth="2"
        />
        <rect
          x="38"
          y="58"
          width="5"
          height="8"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="1"
          transform="rotate(15 40 58)"
        />
        <rect
          x="46"
          y="60"
          width="5"
          height="8"
          fill={COLORS.grittyGold}
          stroke="#111"
          strokeWidth="1"
          transform="rotate(15 48 60)"
        />
        {/* Head recoiled */}
        <path d="M 30 22 L 55 20 L 60 40 L 25 42 Z" fill="#4A3B32" stroke="#111" strokeWidth="2" />
        <path
          d="M 40 34 L 60 32 L 55 40 L 35 42 Z"
          fill="#E8DCC4"
          stroke="#111"
          strokeWidth="1.5"
        />
        {/* Open mouth */}
        <path d="M 52 34 L 58 34 L 55 38 Z" fill="#111" />
        {/* Eyes */}
        <circle cx="43" cy="28" r="2" fill="#111" />
        <circle cx="51" cy="28" r="2" fill="#111" />
        {/* Bandana recoiled */}
        <path
          d="M 25 22 L 60 20 L 55 28 L 30 30 Z"
          fill={COLORS.mossGreen}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Bandana tails flying */}
        <path
          d="M 25 26 L 10 20 L 12 30 L 28 30 Z"
          fill={COLORS.mossGreen}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Gun firing (recoiled up slightly) */}
        <g transform="translate(-2, -3) rotate(-5 50 50)">
          <path
            d="M 30 45 L 80 45 L 80 50 L 30 50 Z"
            fill={COLORS.weatheredSteel}
            stroke="#111"
            strokeWidth="2"
          />
          <path d="M 45 50 L 45 60 L 55 60 L 55 50 Z" fill="#222" stroke="#111" strokeWidth="2" />
          <path d="M 30 45 L 25 55 L 35 55 Z" fill="#222" stroke="#111" strokeWidth="2" />
          {/* Muzzle Flash WC2 Style */}
          <polygon
            points="80,47 95,35 90,47 105,47 90,50 95,60 80,50"
            fill={COLORS.muzzleFlash}
            stroke="#FFF"
            strokeWidth="1"
          />
          {/* Ejected Casing */}
          <rect
            x="45"
            y="30"
            width="6"
            height="3"
            fill={COLORS.grittyGold}
            stroke="#111"
            strokeWidth="1"
            transform="rotate(-30 45 30)"
          />
        </g>
      </g>
    </svg>
  );
}
