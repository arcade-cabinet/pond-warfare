/**
 * Loading screen shown during menu-to-game transition.
 *
 * Design bible: swamp gradient background (bark->mud), font-heading title,
 * Frame9Slice tip card, design token colors.
 */

import { useMemo } from 'preact/hooks';
import { COLORS } from '@/ui/design-tokens';
import { Frame9Slice } from './components/frame';
import { customGameSettings } from './store';

const LOADING_TIPS = [
  'Gatherers auto-return resources when their haul is full.',
  'Right-click on a resource patch to send selected gatherers.',
  'Towers and Watchtowers reveal fog of war around them.',
  'Brawlers deal bonus damage to buildings — use them to siege.',
  'Hold Shift to add or remove units from your selection.',
  'Double-click a unit to select all visible units of that type.',
  'Set rally points on buildings by right-clicking with them selected.',
  'The Lodge provides food capacity — protect it at all costs.',
  'Scouts move fast and reveal stealthed enemies.',
  'Use control groups (Ctrl+1-9) to organise your army quickly.',
  'Veterancy makes units stronger — keep your elite units alive.',
  'Walls block enemy pathing and buy time for your defenders.',
  'Research upgrades at the Lodge to unlock new units and abilities.',
  'Flying Herons can cross water and ignore terrain obstacles.',
  'Use the minimap to keep an eye on enemy movements.',
] as const;

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

export function LoadingScreen() {
  const tip = useMemo(() => LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)], []);
  const mapName = capitalize(customGameSettings.value.scenario);

  return (
    <div
      class="absolute inset-0 z-[100] flex flex-col items-center justify-center"
      style={{
        background: `linear-gradient(180deg, ${COLORS.woodDark} 0%, ${COLORS.woodBase} 100%)`,
      }}
    >
      <div class="relative z-10 flex flex-col items-center gap-6 px-4 text-center max-w-md">
        <h2
          class="font-heading text-2xl md:text-3xl tracking-wider uppercase"
          style={{
            color: COLORS.grittyGold,
            textShadow: '0 2px 8px rgba(0,0,0,0.7)',
          }}
        >
          Loading {mapName} Map...
        </h2>

        {/* Pulsing dots */}
        <div class="flex gap-2">
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              class="rounded-full"
              style={{
                width: '10px',
                height: '10px',
                background: COLORS.grittyGold,
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>

        {/* Tip card wrapped in Frame9Slice */}
        <Frame9Slice>
          <div class="px-4 py-3 text-center">
            <span
              class="font-heading text-xs uppercase tracking-wider"
              style={{ color: COLORS.goldDim }}
            >
              Tip
            </span>
            <p class="font-game text-xs md:text-sm mt-1" style={{ color: COLORS.sepiaText }}>
              {tip}
            </p>
          </div>
        </Frame9Slice>
      </div>
    </div>
  );
}
