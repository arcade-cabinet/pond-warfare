/**
 * SvgLeaf -- Small SVG leaf decoration for 9-slice frame corners and edges.
 *
 * Renders a simple two-curve leaf shape filled with moss green and stroked
 * with vine base color. Positioned via translate/rotate/scale transform.
 */

import { COLORS } from '@/ui/design-tokens';

export interface SvgLeafProps {
  x: number | string;
  y: number | string;
  rot: number;
  scale?: number;
}

export function SvgLeaf({ x, y, rot, scale = 1 }: SvgLeafProps) {
  return (
    <path
      d="M 0 0 C 5 -10, 15 -10, 20 0 C 15 10, 5 10, 0 0 Z"
      fill={COLORS.mossGreen}
      stroke={COLORS.vineBase}
      strokeWidth="1"
      transform={`translate(${x}, ${y}) rotate(${rot}) scale(${scale})`}
    />
  );
}
