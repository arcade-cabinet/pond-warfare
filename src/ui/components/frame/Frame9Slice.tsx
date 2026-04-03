/**
 * Frame9Slice -- Main 9-slice frame wrapper for Pond Warfare UI panels.
 *
 * Assembles 4 SVG corners, 4 stretching edges, and a CenterPanel content
 * area in a CSS grid. Supports an optional title rendered over the top edge
 * and an expanded/collapsed state with a vine-green glow effect.
 *
 * Grid layout:
 *   60px  | 1fr  | 60px
 *   ------+------+------
 *   CTL   | Top  | CTR    (60px row)
 *   Left  | Body | Right  (auto or 0px row)
 *   CBL   | Bot  | CBR    (60px row)
 */

import type { ComponentChildren } from 'preact';
import { COLORS, FONTS } from '@/ui/design-tokens';
import { CenterPanel } from './CenterPanel';
import { CornerBottomLeft } from './CornerBottomLeft';
import { CornerBottomRight } from './CornerBottomRight';
import { CornerTopLeft } from './CornerTopLeft';
import { CornerTopRight } from './CornerTopRight';
import { EdgeHorizontal } from './EdgeHorizontal';
import { EdgeVertical } from './EdgeVertical';

export interface Frame9SliceProps {
  children?: ComponentChildren;
  isExpanded?: boolean;
  onClick?: () => void;
  title?: string;
  /** Extra CSS class on the outermost wrapper */
  class?: string;
}

/** Inline styles that cannot be expressed in utility classes. */
const GRID_STYLE = {
  display: 'grid',
  gridTemplateColumns: '60px 1fr 60px',
};

const TITLE_STYLE = {
  fontFamily: FONTS.header,
  color: COLORS.grittyGold,
  textShadow:
    '2px 2px 0 #111, -1px -1px 0 #111, 1px -1px 0 #111, -1px 1px 0 #111, 0 8px 12px rgba(0,0,0,0.9)',
};

export function Frame9Slice({
  children,
  isExpanded = true,
  onClick,
  title,
  class: extraClass,
}: Frame9SliceProps) {
  const clickable = typeof onClick === 'function';
  const gridRows = `60px ${isExpanded ? 'auto' : '0px'} 60px`;
  const expandedOpacity = isExpanded ? 'opacity-100' : 'opacity-0';
  const bodyTransform = isExpanded
    ? 'opacity-100 scale-y-100'
    : 'opacity-0 scale-y-0 h-0 overflow-hidden';

  /** Handler on the grid — content cell uses stopPropagation to prevent toggle. */
  const handleGridClick = clickable ? () => onClick() : undefined;

  /** Stop content clicks from toggling the accordion. */
  const stopContentClick = clickable ? (e: Event) => e.stopPropagation() : undefined;

  return (
    <div
      class={`relative w-full transition-all duration-500 ease-in-out group ${clickable ? 'cursor-pointer' : ''} ${extraClass ?? ''}`}
    >
      {/* Expanded glow effect */}
      <div
        class={`absolute inset-[-20px] blur-[40px] rounded-3xl transition-opacity duration-1000 -z-10 ${isExpanded ? 'opacity-30' : 'opacity-0'}`}
        style={{ backgroundColor: COLORS.vineHighlight }}
      />

      {/* 9-slice grid — single onClick at grid level prevents double-fire */}
      <div
        class="grid drop-shadow-[0_20px_30px_rgba(0,0,0,0.9)]"
        style={{ ...GRID_STYLE, gridTemplateRows: gridRows }}
        onClick={handleGridClick}
      >
        {/* Row 1: Top corners + top edge */}
        <div class="w-[60px] h-[60px] z-20">
          <CornerTopLeft />
        </div>
        <div class="h-[60px] z-10 relative">
          <div class="absolute inset-0">
            <EdgeHorizontal top={true} />
          </div>
          {title && (
            <div class="absolute inset-0 flex items-center justify-center z-30 pointer-events-none mt-1">
              <h2
                class="text-3xl tracking-widest text-center transition-all group-hover:scale-[1.03] duration-500"
                style={TITLE_STYLE}
              >
                {title}
              </h2>
            </div>
          )}
        </div>
        <div class="w-[60px] h-[60px] z-20">
          <CornerTopRight />
        </div>

        {/* Row 2: Side edges + content body */}
        <div class={`w-[60px] z-10 transition-all duration-700 ease-out ${expandedOpacity}`}>
          {isExpanded && <EdgeVertical left={true} />}
        </div>
        <div
          class={`transition-all duration-700 origin-top cursor-default ${bodyTransform}`}
          onClick={stopContentClick}
        >
          <CenterPanel>{children}</CenterPanel>
        </div>
        <div class={`w-[60px] z-10 transition-all duration-700 ease-out ${expandedOpacity}`}>
          {isExpanded && <EdgeVertical left={false} />}
        </div>

        {/* Row 3: Bottom corners + bottom edge */}
        <div class="w-[60px] h-[60px] z-20">
          <CornerBottomLeft />
        </div>
        <div class="h-[60px] z-10 relative">
          <div class="absolute inset-0">
            <EdgeHorizontal top={false} />
          </div>
        </div>
        <div class="w-[60px] h-[60px] z-20">
          <CornerBottomRight />
        </div>
      </div>
    </div>
  );
}
