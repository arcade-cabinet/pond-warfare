/**
 * Minimap Panel
 *
 * Minimap container with camera viewport indicator div.
 * Desktop: 150px max. Mobile: 100px max.
 * Shows the current map scenario label below the minimap.
 */

import type { Ref } from 'preact';
import { MINIMAP_SIZE } from '@/constants';
import { screenClass } from '@/platform';
import { baseUnderAttack, mapScenario } from '@/ui/store';

export interface MinimapPanelProps {
  canvasRef: Ref<HTMLCanvasElement>;
  camRef: Ref<HTMLDivElement>;
}

export function MinimapPanel({ canvasRef, camRef }: MinimapPanelProps) {
  const scenario = mapScenario.value;
  const label = scenario ? scenario.charAt(0).toUpperCase() + scenario.slice(1) : '';
  const mobile = screenClass.value === 'compact';

  return (
    <div
      class={`flex-shrink-0 flex flex-col justify-center items-center ${mobile ? 'w-1/4 border-r-2 p-1' : 'w-full border-b-2 max-h-[190px] p-2'}`}
      style={{ background: 'var(--pw-bg-deep)', borderColor: 'var(--pw-border)' }}
    >
      <div
        id="minimap-container"
        class={`relative w-full h-full cursor-crosshair ${mobile ? 'max-w-[100px] max-h-[100px]' : 'max-w-[150px] max-h-[150px]'}${baseUnderAttack.value ? ' animate-pulse' : ''}`}
        style={{
          border: baseUnderAttack.value
            ? '2px solid rgb(239, 68, 68)'
            : '2px solid var(--pw-border)',
        }}
      >
        <canvas
          ref={canvasRef}
          id="minimap"
          width={MINIMAP_SIZE}
          height={MINIMAP_SIZE}
          class="w-full h-full block render-pixelated"
        />
        <div
          ref={camRef}
          id="minimap-cam"
          class="absolute border border-white pointer-events-none hidden box-border"
          style={{ left: 0, top: 0 }}
        />
      </div>
      {label && (
        <span
          class={`mt-1 font-heading tracking-wide uppercase ${mobile ? 'text-[9px]' : 'text-[10px]'}`}
          style={{ color: 'var(--pw-text-muted)' }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
