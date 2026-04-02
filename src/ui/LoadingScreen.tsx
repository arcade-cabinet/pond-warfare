/** Loading screen shown during menu-to-game transition. */

import { useMemo } from 'preact/hooks';
import { MenuBackground } from './menu-background';
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
    <div class="absolute inset-0 z-[100] flex flex-col items-center justify-center">
      <MenuBackground />

      <div class="relative z-10 flex flex-col items-center gap-6 px-4 text-center">
        <h2
          class="font-heading text-2xl md:text-3xl tracking-wider uppercase"
          style={{ color: 'var(--pw-accent)', textShadow: '0 2px 8px rgba(0,0,0,0.6)' }}
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
                background: 'var(--pw-accent)',
                animation: `pulse 1.2s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>

        <p
          class="font-game text-xs md:text-sm max-w-md"
          style={{ color: 'rgba(180, 220, 210, 0.8)', textShadow: '0 1px 4px rgba(0,0,0,0.5)' }}
        >
          {tip}
        </p>
      </div>
    </div>
  );
}
