import { COLORS } from '@/ui/design-tokens';

/**
 * Gator Heavy -- Siege & Armor sprite.
 *
 * 100x100 SVG with two animation frames:
 * - Frame 1 (idle): tail with spine, body, leather harness, long snout, gatling base + barrels
 * - Frame 2 (attacking): jaw dropped with visible teeth, gatling firing with massive muzzle flash
 *
 * Bigger selection circle (rx=35) to reflect the unit's heavy size.
 */
export function SpriteCroc() {
  return (
    <svg
      viewBox="0 0 100 100"
      class="w-full h-full overflow-visible"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Gator Heavy"
    >
      {/* RTS Selection Circle */}
      <ellipse
        cx="50"
        cy="85"
        rx="35"
        ry="12"
        fill="none"
        stroke={COLORS.mossGreen}
        strokeWidth="2"
        strokeDasharray="8 4"
        class="selection-circle"
      />
      {/* Shadow */}
      <ellipse cx="50" cy="85" rx="30" ry="10" fill="rgba(0,0,0,0.5)" />

      {/* FRAME 1: IDLE */}
      <g class="sprite-frame-1">
        {/* Tail */}
        <path
          d="M 25 65 L 5 75 L 10 85 L 35 75 Z"
          fill={COLORS.mossDark}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Tail spine */}
        <polygon points="10,65 15,55 20,65" fill="#1A2410" stroke="#111" strokeWidth="1" />
        {/* Body */}
        <path
          d="M 20 50 L 65 50 L 70 80 L 25 80 Z"
          fill={COLORS.mossGreen}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Pale underbelly */}
        <path d="M 25 65 L 65 65 L 68 80 L 28 80 Z" fill="#A5A57A" opacity="0.6" />
        {/* Legs */}
        <path
          d="M 30 70 L 25 85 L 40 85 Z M 55 70 L 50 85 L 65 85 Z"
          fill={COLORS.mossDark}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Heavy Leather Harness */}
        <path
          d="M 40 50 L 55 50 L 50 80 L 35 80 Z"
          fill={COLORS.woodDark}
          stroke="#111"
          strokeWidth="2"
        />
        <rect
          x="42"
          y="60"
          width="8"
          height="6"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="1.5"
        />
        {/* Head */}
        <path
          d="M 60 45 L 90 55 L 90 70 L 65 70 Z"
          fill={COLORS.mossGreen}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Brow */}
        <path d="M 65 40 Q 70 35 75 45 Z" fill={COLORS.mossDark} stroke="#111" strokeWidth="1.5" />
        {/* Eye */}
        <circle cx="72" cy="46" r="2.5" fill={COLORS.grittyGold} stroke="#111" />
        {/* Jaw */}
        <path
          d="M 65 60 L 90 60 L 85 70 L 65 70 Z"
          fill="#A5A57A"
          stroke="#111"
          strokeWidth="1.5"
        />
        {/* Back-Mounted Gatling Base */}
        <path
          d="M 30 35 L 50 35 L 55 50 L 25 50 Z"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="2"
        />
        <circle cx="40" cy="42" r="5" fill="#222" />
        {/* Barrels */}
        <path d="M 45 38 L 85 35 L 85 41 L 45 44 Z" fill="#444" stroke="#111" strokeWidth="2" />
        <line x1="45" y1="41" x2="85" y2="38" stroke="#111" strokeWidth="2" />
      </g>

      {/* FRAME 2: ATTACKING */}
      <g class="sprite-frame-2">
        {/* Tail */}
        <path
          d="M 23 65 L 2 70 L 8 82 L 33 75 Z"
          fill={COLORS.mossDark}
          stroke="#111"
          strokeWidth="2"
        />
        <polygon points="8,62 12,50 18,62" fill="#1A2410" stroke="#111" strokeWidth="1" />
        {/* Body */}
        <path
          d="M 18 52 L 63 52 L 68 82 L 23 82 Z"
          fill={COLORS.mossGreen}
          stroke="#111"
          strokeWidth="2"
        />
        <path d="M 23 67 L 63 67 L 66 82 L 26 82 Z" fill="#A5A57A" opacity="0.6" />
        {/* Legs */}
        <path
          d="M 28 72 L 20 87 L 35 87 Z M 53 72 L 45 87 L 60 87 Z"
          fill={COLORS.mossDark}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Harness */}
        <path
          d="M 38 52 L 53 52 L 48 82 L 33 82 Z"
          fill={COLORS.woodDark}
          stroke="#111"
          strokeWidth="2"
        />
        <rect
          x="40"
          y="62"
          width="8"
          height="6"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="1.5"
        />
        {/* Snapping Head */}
        <path
          d="M 58 43 L 88 35 L 90 50 L 63 55 Z"
          fill={COLORS.mossGreen}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Brow */}
        <path d="M 63 38 Q 68 33 73 43 Z" fill={COLORS.mossDark} stroke="#111" strokeWidth="1.5" />
        {/* Eye */}
        <circle cx="70" cy="44" r="2.5" fill={COLORS.grittyGold} stroke="#111" />
        {/* Jaw dropped */}
        <path d="M 63 60 L 92 68 L 88 80 L 63 70 Z" fill="#A5A57A" stroke="#111" strokeWidth="2" />
        {/* Teeth visible - upper */}
        <path
          d="M 65 52 L 70 58 L 75 50 L 80 56 L 85 48"
          fill="none"
          stroke="#FFF"
          strokeWidth="2"
          strokeLinejoin="miter"
        />
        {/* Teeth visible - lower */}
        <path
          d="M 65 62 L 70 56 L 75 64 L 80 58 L 85 66"
          fill="none"
          stroke="#FFF"
          strokeWidth="2"
          strokeLinejoin="miter"
        />

        {/* Gatling Firing */}
        <path
          d="M 28 37 L 48 37 L 53 52 L 23 52 Z"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="2"
        />
        <circle cx="38" cy="44" r="5" fill="#222" />
        {/* Barrels shifted */}
        <path d="M 43 40 L 85 40 L 85 46 L 43 46 Z" fill="#444" stroke="#111" strokeWidth="2" />
        <line x1="43" y1="43" x2="85" y2="43" stroke="#111" strokeWidth="2" />
        {/* Massive Gatling Muzzle Flash */}
        <polygon
          points="85,43 100,25 95,43 110,43 95,46 100,60 85,46"
          fill={COLORS.muzzleFlash}
          stroke="#FFF"
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}
