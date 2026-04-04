/**
 * ComicPanel — Single comic book panel with character sprite and speech bubble.
 *
 * Renders a Frame9Slice border containing a character on one side and a
 * SpeechBubble on the opposite side. Background has a subtle biome tint.
 * Characters use existing sprite components with CSS animation.
 */

import { Frame9Slice } from '@/ui/components/frame/Frame9Slice';
import { SpriteCroc } from '@/ui/components/sprites/SpriteCroc';
import { SpriteOtter } from '@/ui/components/sprites/SpriteOtter';
import { SpriteSnake } from '@/ui/components/sprites/SpriteSnake';
import { COLORS } from '@/ui/design-tokens';
import { SpeechBubble } from './speech-bubble';

type Character = 'otter' | 'croc' | 'snake';
type Side = 'left' | 'right';

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
}

/** Biome tint defaults per character */
const BIOME_TINTS: Record<Character, string> = {
  otter: 'rgba(90,107,58,0.08)', // swamp green
  croc: 'rgba(30,42,20,0.12)', // darker marsh
  snake: 'rgba(100,110,120,0.08)', // foggy grey
};

/** Sprite size: Croc gets 1.2x for heavy feel */
const SPRITE_SIZES: Record<Character, { base: number; mobile: number }> = {
  otter: { base: 140, mobile: 90 },
  croc: { base: 168, mobile: 108 },
  snake: { base: 140, mobile: 90 },
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
        padding: primary ? '8px 20px' : '6px 14px',
        minWidth: '100px',
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
        class="font-heading text-sm md:text-base leading-snug"
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

export function ComicPanel({
  character,
  side,
  quote,
  buttonLabel,
  onButtonClick,
  secondaryButton,
  biomeTint,
}: ComicPanelProps) {
  const tint = biomeTint ?? BIOME_TINTS[character];
  const bubbleSide: 'left' | 'right' = side === 'left' ? 'left' : 'right';
  const isCharLeft = side === 'left';

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
    <div class="w-full max-w-[600px]" style={{ filter: 'url(#grunge-heavy)' }}>
      <Frame9Slice>
        {/* Biome tint overlay */}
        <div class="absolute inset-0 pointer-events-none" style={{ backgroundColor: tint }} />
        {/* Panel content: character + bubble */}
        <div class="relative flex items-center justify-center gap-2 md:gap-4 py-2 px-1 md:px-4">
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
        </div>
      </Frame9Slice>
    </div>
  );
}
