/**
 * MenuLilyPads – Floating lily pad elements rendered from MenuPads system state.
 */

import type { Ref } from 'preact';
import type { Pad } from './menu-pads';

const UI = '/pond-warfare/assets/ui';

export function MenuLilyPads({
  pads,
  padRefs,
}: {
  pads: Pad[];
  padRefs: Ref<(HTMLDivElement | null)[]>;
}) {
  return (
    <>
      {pads.map((p, i) => {
        const src =
          p.variant === 'tiny' ? `${UI}/Lillypad-tiny.png` : `${UI}/Lillypad-${p.variant}.png`;
        const size = p.variant === 'tiny' ? '45px' : '80px';
        return (
          <div
            key={`pad-${i}`}
            ref={(el) => {
              (padRefs as { current: (HTMLDivElement | null)[] }).current[i] = el;
            }}
            class="absolute pointer-events-none z-[1]"
            style={{ width: size, height: size, opacity: p.variant === 'tiny' ? 0.5 : 0.7 }}
          >
            <img
              src={src}
              alt=""
              class="w-full h-full object-contain"
              draggable={false}
              style={{ filter: 'drop-shadow(0 3px 8px rgba(0,0,0,0.3))' }}
            />
            {p.flower && (
              <img
                src={`${UI}/Flower.png`}
                alt=""
                class="absolute"
                style={{ top: '-4px', right: '6px', width: '18px', height: '18px' }}
                draggable={false}
              />
            )}
          </div>
        );
      })}
    </>
  );
}
