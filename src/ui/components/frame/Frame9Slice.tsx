/**
 * Frame9Slice -- Main 9-slice frame wrapper for Pond Warfare UI panels.
 *
 * Assembles 4 SVG corners, 4 stretching edges, and a CenterPanel content
 * area in a CSS grid. Supports an optional title rendered over the top edge
 * and an expanded/collapsed state with a vine-green glow effect.
 *
 * Grid layout (default):
 *   60px  | 1fr  | 60px
 *   ------+------+------
 *   CTL   | Top  | CTR    (60px row)
 *   Left  | Body | Right  (auto or 0px row)
 *   CBL   | Bot  | CBR    (60px row)
 *
 * Compact mode (36px corners) for space-constrained layouts like comic panels.
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

/** Frame size presets */
export type FrameSize = 'md' | 'sm';

const SIZE_MAP: Record<FrameSize, number> = {
  md: 36, // Cards, comic panels, rewards
  sm: 20, // Speech bubbles, small containers, tooltips
};

export interface Frame9SliceProps {
  children?: ComponentChildren;
  isExpanded?: boolean;
  onClick?: () => void;
  title?: string;
  /** Extra CSS class on the outermost wrapper */
  class?: string;
  /** Frame size: 'md' (36px corners), 'sm' (20px). Default: 60px (full modals). */
  size?: FrameSize;
}

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
  size,
}: Frame9SliceProps) {
  const cornerSize = size ? SIZE_MAP[size] : 60;
  const cornerPx = `${cornerSize}px`;
  const clickable = typeof onClick === 'function';
  const gridRows = `${cornerPx} ${isExpanded ? 'auto' : '0px'} ${cornerPx}`;
  const expandedOpacity = isExpanded ? 'opacity-100' : 'opacity-0';
  const bodyTransform = isExpanded
    ? 'opacity-100 scale-y-100'
    : 'opacity-0 scale-y-0 h-0 overflow-hidden';

  /** Handler on the grid -- content cell uses stopPropagation to prevent toggle. */
  const handleGridClick = clickable ? () => onClick() : undefined;

  /** Stop content clicks from toggling the accordion. */
  const stopContentClick = clickable ? (e: Event) => e.stopPropagation() : undefined;

  const gridStyle = {
    display: 'grid' as const,
    gridTemplateColumns: `${cornerPx} 1fr ${cornerPx}`,
    gridTemplateRows: gridRows,
  };

  return (
    <div
      class={`relative w-full transition-all duration-500 ease-in-out group ${clickable ? 'cursor-pointer' : ''} ${extraClass ?? ''}`}
    >
      {/* Expanded glow effect */}
      <div
        class={`absolute inset-[-20px] blur-[40px] rounded-3xl transition-opacity duration-1000 -z-10 ${isExpanded ? 'opacity-30' : 'opacity-0'}`}
        style={{ backgroundColor: COLORS.vineHighlight }}
      />

      {/* 9-slice grid -- single onClick at grid level prevents double-fire */}
      <div
        class="grid drop-shadow-[0_20px_30px_rgba(0,0,0,0.9)]"
        style={gridStyle}
        onClick={handleGridClick}
        {...(clickable
          ? {
              role: 'button',
              tabIndex: 0,
              'aria-expanded': isExpanded,
              'aria-label': title ? `Toggle ${title}` : 'Toggle section',
              onKeyDown: (e: KeyboardEvent) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  onClick?.();
                }
              },
            }
          : {})}
      >
        {/* Row 1: Top corners + top edge */}
        <div style={{ width: cornerPx, height: cornerPx }} class="z-20">
          <CornerTopLeft />
        </div>
        <div style={{ height: cornerPx }} class="z-10 relative">
          <div class="absolute inset-0">
            <EdgeHorizontal top={true} />
          </div>
          {title && (
            <div class="absolute inset-0 flex items-center justify-center z-30 pointer-events-none mt-1">
              <h2
                class={`tracking-wider text-center transition-all group-hover:scale-[1.03] duration-500 px-2 ${
                  title.length > 30
                    ? 'text-xs md:text-sm'
                    : title.length > 20
                      ? 'text-sm md:text-lg'
                      : 'text-lg md:text-2xl'
                }`}
                style={TITLE_STYLE}
              >
                {title}
              </h2>
            </div>
          )}
        </div>
        <div style={{ width: cornerPx, height: cornerPx }} class="z-20">
          <CornerTopRight />
        </div>

        {/* Row 2: Side edges + content body */}
        <div
          style={{ width: cornerPx }}
          class={`z-10 transition-all duration-700 ease-out ${expandedOpacity}`}
        >
          {isExpanded && <EdgeVertical left={true} />}
        </div>
        <div
          class={`transition-all duration-700 origin-top cursor-default ${bodyTransform}`}
          onClick={stopContentClick}
        >
          <CenterPanel>{children}</CenterPanel>
        </div>
        <div
          style={{ width: cornerPx }}
          class={`z-10 transition-all duration-700 ease-out ${expandedOpacity}`}
        >
          {isExpanded && <EdgeVertical left={false} />}
        </div>

        {/* Row 3: Bottom corners + bottom edge */}
        <div style={{ width: cornerPx, height: cornerPx }} class="z-20">
          <CornerBottomLeft />
        </div>
        <div style={{ height: cornerPx }} class="z-10 relative">
          <div class="absolute inset-0">
            <EdgeHorizontal top={false} />
          </div>
        </div>
        <div style={{ width: cornerPx, height: cornerPx }} class="z-20">
          <CornerBottomRight />
        </div>
      </div>
    </div>
  );
}
