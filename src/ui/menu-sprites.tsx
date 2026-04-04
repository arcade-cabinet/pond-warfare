/**
 * MenuSpriteShowcase — Animated SVG sprites on the main menu.
 *
 * Displays SpriteOtter, SpriteCroc, SpriteSnake in a row between
 * the title and buttons. Each sprite shows its idle/attack animation
 * via the existing sprite-frame-1/sprite-frame-2 CSS keyframes.
 * Slight scale hover effect for interactivity.
 */

import { SpriteCroc } from './components/sprites/SpriteCroc';
import { SpriteOtter } from './components/sprites/SpriteOtter';
import { SpriteSnake } from './components/sprites/SpriteSnake';

const SPRITE_STYLE = {
  transition: 'transform 0.2s ease',
  cursor: 'default',
} as const;

export function MenuSpriteShowcase({ compact }: { compact: boolean }) {
  const size = compact ? 70 : 100;

  return (
    <div
      class={`relative z-10 flex items-end justify-center ${compact ? 'gap-3 mb-1' : 'gap-6 mb-3'}`}
    >
      <div
        class="menu-sprite-item"
        style={{ width: `${size}px`, height: `${size}px`, ...SPRITE_STYLE }}
      >
        <SpriteOtter />
      </div>
      <div
        class="menu-sprite-item"
        style={{ width: `${size * 1.15}px`, height: `${size * 1.15}px`, ...SPRITE_STYLE }}
      >
        <SpriteCroc />
      </div>
      <div
        class="menu-sprite-item"
        style={{ width: `${size * 0.9}px`, height: `${size * 0.9}px`, ...SPRITE_STYLE }}
      >
        <SpriteSnake />
      </div>
    </div>
  );
}
