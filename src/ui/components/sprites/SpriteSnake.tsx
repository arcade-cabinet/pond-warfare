import { COLORS } from '@/ui/design-tokens';

/**
 * Viper Sniper -- Specialist sprite.
 *
 * 100x100 SVG with two animation frames:
 * - Frame 1 (idle): coiled body, raised torso, tactical gear, back-mounted laser rifle,
 *   cyber goggle with red eye
 * - Frame 2 (attacking): lunged forward, laser beam (dashed line), hissing tongue spread
 */
export function SpriteSnake() {
  return (
    <svg
      viewBox="0 0 100 100"
      class="w-full h-full overflow-visible"
      shapeRendering="crispEdges"
      role="img"
      aria-label="Viper Sniper"
    >
      {/* RTS Selection Circle */}
      <ellipse
        cx="50"
        cy="85"
        rx="25"
        ry="8"
        fill="none"
        stroke={COLORS.mossGreen}
        strokeWidth="2"
        strokeDasharray="8 4"
        class="selection-circle"
      />
      {/* Shadow */}
      <ellipse cx="50" cy="85" rx="20" ry="6" fill="rgba(0,0,0,0.5)" />

      {/* FRAME 1: IDLE */}
      <g class="sprite-frame-1">
        {/* Lower coils */}
        <path
          d="M 30 75 L 70 75 L 65 85 L 25 85 Z"
          fill={COLORS.vineHighlight}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Upper coils */}
        <path
          d="M 35 65 L 60 65 L 65 75 L 30 75 Z"
          fill={COLORS.vineBase}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Raised body */}
        <path
          d="M 40 40 L 55 40 L 50 65 L 45 65 Z"
          fill={COLORS.vineHighlight}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Tactical gear base */}
        <path
          d="M 40 45 L 55 45 L 52 52 L 42 52 Z"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Back-mounted laser/sniper rifle */}
        <path d="M 35 35 L 75 30 L 75 35 L 35 40 Z" fill="#222" stroke="#111" strokeWidth="2" />
        {/* Head */}
        <path
          d="M 45 25 L 65 25 L 70 35 L 40 35 Z"
          fill={COLORS.vineHighlight}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Cyber Goggle */}
        <path d="M 55 25 L 68 25 L 65 32 L 52 32 Z" fill="#111" stroke="#000" strokeWidth="1" />
        {/* Red eye */}
        <circle cx="62" cy="28" r="2.5" fill="#FF0000" />
        {/* Tongue */}
        <path d="M 68 32 L 72 34" stroke={COLORS.bloodRed} strokeWidth="2" />
      </g>

      {/* FRAME 2: ATTACKING */}
      <g class="sprite-frame-2">
        {/* Lower coils shifted */}
        <path
          d="M 28 75 L 68 75 L 63 85 L 23 85 Z"
          fill={COLORS.vineHighlight}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Upper coils */}
        <path
          d="M 38 65 L 63 65 L 68 75 L 33 75 Z"
          fill={COLORS.vineBase}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Body lunged forward */}
        <path
          d="M 50 35 L 65 35 L 55 65 L 45 65 Z"
          fill={COLORS.vineHighlight}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Tactical gear */}
        <path
          d="M 50 40 L 62 40 L 57 48 L 47 48 Z"
          fill={COLORS.weatheredSteel}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Sniper firing */}
        <path d="M 45 25 L 85 28 L 85 33 L 45 30 Z" fill="#222" stroke="#111" strokeWidth="2" />
        {/* Laser beam WC2 style */}
        <polygon points="85,30 110,29 120,30 110,31" fill="#FF0000" />
        <line
          x1="85"
          y1="30"
          x2="150"
          y2="30"
          stroke="#FF5555"
          strokeWidth="2"
          strokeDasharray="10 5"
        />
        {/* Head struck forward */}
        <path
          d="M 60 20 L 80 25 L 85 35 L 55 30 Z"
          fill={COLORS.vineHighlight}
          stroke="#111"
          strokeWidth="2"
        />
        {/* Cyber goggle */}
        <path d="M 70 22 L 82 25 L 78 30 L 65 28 Z" fill="#111" stroke="#000" strokeWidth="1" />
        {/* Red eye */}
        <circle cx="77" cy="26" r="2.5" fill="#FF0000" />
        {/* Hissing tongue spread */}
        <path
          d="M 85 32 L 95 30 M 85 32 L 92 36"
          fill="none"
          stroke={COLORS.bloodRed}
          strokeWidth="2"
        />
      </g>
    </svg>
  );
}
