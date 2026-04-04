/**
 * SpeechBubble — SVG speech bubble with organic wobble and directional tail.
 *
 * Renders a grunge-filtered rounded shape with a triangular tail pointing
 * toward the character sprite (left or right). Children (text + buttons)
 * are overlaid via a foreignObject so they stay crisp above the filtered SVG.
 */

import type { ComponentChildren } from 'preact';
import { COLORS } from '@/ui/design-tokens';

export interface SpeechBubbleProps {
  children?: ComponentChildren;
  tailDirection: 'left' | 'right';
  class?: string;
}

/**
 * Organic wobble body path — slightly irregular rounded rectangle.
 * viewBox is 260x160; the body occupies most of the space, leaving
 * room at the bottom for the tail.
 */
function bubbleBodyPath(): string {
  // Rounded rect with subtle hand-drawn wobble offsets
  return [
    'M 20,8',
    'C 60,3 200,5 240,10', // top edge wobble
    'C 248,12 252,20 250,30', // top-right corner
    'L 253,110', // right edge
    'C 252,120 248,128 240,130', // bottom-right corner
    'C 200,134 60,132 20,128', // bottom edge wobble
    'C 12,126 8,118 10,110', // bottom-left corner
    'L 7,30', // left edge
    'C 8,18 12,10 20,8', // top-left corner
    'Z',
  ].join(' ');
}

/** Triangular tail pointing left (toward a character on the left). */
function tailLeftPath(): string {
  return 'M 30,128 L 8,155 L 55,132 Z';
}

/** Triangular tail pointing right (toward a character on the right). */
function tailRightPath(): string {
  return 'M 230,128 L 252,155 L 205,132 Z';
}

export function SpeechBubble({ children, tailDirection, class: extraClass }: SpeechBubbleProps) {
  const tailPath = tailDirection === 'left' ? tailLeftPath() : tailRightPath();

  return (
    <div
      class={`relative speech-bubble ${extraClass ?? ''}`}
      style={{ width: '100%', maxWidth: '260px', flexShrink: 1 }}
    >
      {/* SVG bubble shape */}
      <svg
        viewBox="0 0 260 160"
        class="w-full h-auto block"
        preserveAspectRatio="xMidYMid meet"
        aria-hidden="true"
      >
        {/* Body with grunge filter */}
        <path
          d={bubbleBodyPath()}
          fill={COLORS.bgPanel}
          stroke={COLORS.grittyGold}
          strokeWidth="2"
          filter="url(#grunge-heavy)"
        />
        {/* Tail */}
        <path d={tailPath} fill={COLORS.bgPanel} stroke={COLORS.grittyGold} strokeWidth="2" />
        {/* Cover the tail-body seam */}
        <path
          d={tailDirection === 'left' ? 'M 28,126 L 57,130' : 'M 203,130 L 232,126'}
          stroke={COLORS.bgPanel}
          strokeWidth="4"
        />
      </svg>

      {/* Content overlay — positioned over the SVG bubble body */}
      <div
        class="absolute flex flex-col items-center justify-center text-center gap-2"
        style={{
          top: '8%',
          left: '10%',
          right: '10%',
          bottom: '20%',
        }}
      >
        {children}
      </div>
    </div>
  );
}
