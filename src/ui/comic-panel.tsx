/**
 * ComicPanel — Single comic book panel with character sprite and speech bubble.
 *
 * Renders a lightweight bordered panel containing a character on one side and a
 * SpeechBubble on the opposite side. Background has a subtle biome tint.
 *
 * Uses a 2px gold border with rounded corners and subtle grunge filter instead
 * of Frame9Slice (too heavy for comic panels). Max height ~150-180px per panel.
 *
 * Panels are staggered in landscape: left-center-right offsets for visual
 * dynamism. In portrait tablet, panels fill width.
 */

import type preact from 'preact';
import { Frame9Slice } from '@/ui/components/frame';
import { SpriteCroc } from '@/ui/components/sprites/SpriteCroc';
import { SpriteOtter } from '@/ui/components/sprites/SpriteOtter';
import { SpriteSnake } from '@/ui/components/sprites/SpriteSnake';
import { COLORS } from '@/ui/design-tokens';
import { SpeechBubble } from './speech-bubble';

type Character = 'otter' | 'croc' | 'snake';
type Side = 'left' | 'right';

/** Stagger offset direction per panel position. */
export type StaggerPosition = 'left' | 'center' | 'right';

interface SecondaryButton {
  label: string;
  onClick: () => void;
}

interface ComicPanelProps {
  character: Character;
  side: Side;
  quote: string;
  buttonLabel: string;
  onButtonClick: () => void;
  secondaryButton?: SecondaryButton;
  /** Biome tint overlay color */
  biomeTint?: string;
  /** Stagger position for landscape layout */
  stagger?: StaggerPosition;
}

/** Biome tint defaults per character */
const BIOME_TINTS: Record<Character, string> = {
  otter: 'rgba(90,107,58,0.08)', // swamp green
  croc: 'rgba(30,42,20,0.12)', // darker marsh
  snake: 'rgba(100,110,120,0.08)', // foggy grey
};

/** Sprite size: compact for single-screen layout; Croc gets 1.2x for heavy feel */
const SPRITE_SIZES: Record<Character, { base: number; mobile: number }> = {
  otter: { base: 90, mobile: 64 },
  croc: { base: 108, mobile: 76 },
  snake: { base: 90, mobile: 64 },
};

/** Landscape stagger offsets (panels overlap slightly) */
const STAGGER_OFFSETS: Record<StaggerPosition, string> = {
  left: '-3%',
  center: '0%',
  right: '3%',
};

/** Rotation per stagger position for visual dynamism */
const STAGGER_ROTATIONS: Record<StaggerPosition, string> = {
  left: '-0.8deg',
  center: '0.3deg',
  right: '-0.5deg',
};

function CharacterSprite({ character, side }: { character: Character; side: Side }) {
  const sizes = SPRITE_SIZES[character];
  const mirror = side === 'right' ? 'scaleX(-1)' : 'none';

  const sprite = (() => {
    switch (character) {
      case 'otter':
        return <SpriteOtter />;
      case 'croc':
        return <SpriteCroc />;
      case 'snake':
        return <SpriteSnake />;
    }
  })();

  return (
    <div
      class="flex-shrink-0 menu-sprite-item"
      style={{
        width: `${sizes.mobile}px`,
        height: `${sizes.mobile}px`,
        transform: mirror,
      }}
    >
      <style>{`
        @media (min-width: 768px) {
          .comic-sprite-${character} { width: ${sizes.base}px !important; height: ${sizes.base}px !important; }
        }
      `}</style>
      <div class={`w-full h-full comic-sprite-${character}`}>{sprite}</div>
    </div>
  );
}

function PanelButton({
  label,
  onClick,
  primary,
}: {
  label: string;
  onClick: () => void;
  primary?: boolean;
}) {
  return (
    <button
      type="button"
      class="rts-btn font-heading tracking-wider min-h-[44px]"
      style={{
        fontSize: primary ? '1rem' : '0.8rem',
        padding: primary ? '6px 16px' : '4px 12px',
        minWidth: '90px',
      }}
      onClick={onClick}
    >
      {label}
    </button>
  );
}

function BubbleContent({
  quote,
  buttonLabel,
  onButtonClick,
  secondaryButton,
}: {
  quote: string;
  buttonLabel: string;
  onButtonClick: () => void;
  secondaryButton?: SecondaryButton;
}) {
  return (
    <>
      <span
        class="font-heading text-xs md:text-sm leading-snug"
        style={{ color: COLORS.sepiaText }}
      >
        {quote}
      </span>
      <div class="flex flex-col items-center gap-1">
        <PanelButton label={buttonLabel} onClick={onButtonClick} primary />
        {secondaryButton && (
          <PanelButton label={secondaryButton.label} onClick={secondaryButton.onClick} />
        )}
      </div>
    </>
  );
}

/**
 * Comic panel frame using the design system Frame9Slice at 'sm' size (20px vine corners).
 * Organic vine borders instead of boxy CSS rectangles.
 */
function ComicFrame({
  children,
  biomeTint,
}: {
  children: preact.ComponentChildren;
  biomeTint: string;
}) {
  return (
    <Frame9Slice size="sm" class="comic-panel-frame w-fit mx-auto">
      <div class="relative">
        {/* Biome tint overlay */}
        <div class="absolute inset-0 pointer-events-none" style={{ backgroundColor: biomeTint }} />
        {/* Panel content */}
        <div class="relative flex items-center justify-center gap-2 md:gap-3 py-2 px-2 md:px-3">
          {children}
        </div>
      </div>
    </Frame9Slice>
  );
}

export function ComicPanel({
  character,
  side,
  quote,
  buttonLabel,
  onButtonClick,
  secondaryButton,
  biomeTint,
  stagger,
}: ComicPanelProps) {
  const tint = biomeTint ?? BIOME_TINTS[character];
  const bubbleSide: 'left' | 'right' = side === 'left' ? 'left' : 'right';
  const isCharLeft = side === 'left';
  const staggerPos = stagger ?? 'center';

  const spriteEl = <CharacterSprite character={character} side={side} />;
  const bubbleEl = (
    <SpeechBubble tailDirection={bubbleSide} class="flex-1 min-w-0">
      <BubbleContent
        quote={quote}
        buttonLabel={buttonLabel}
        onButtonClick={onButtonClick}
        secondaryButton={secondaryButton}
      />
    </SpeechBubble>
  );

  return (
    <div
      class="comic-panel-stagger w-full max-w-[600px]"
      style={{
        marginLeft: STAGGER_OFFSETS[staggerPos],
        transform: `rotate(${STAGGER_ROTATIONS[staggerPos]})`,
      }}
    >
      <ComicFrame biomeTint={tint}>
        {isCharLeft ? (
          <>
            {spriteEl}
            {bubbleEl}
          </>
        ) : (
          <>
            {bubbleEl}
            {spriteEl}
          </>
        )}
      </ComicFrame>
    </div>
  );
}
