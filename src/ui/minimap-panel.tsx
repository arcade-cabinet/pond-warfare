/**
 * Minimap Panel
 *
 * Minimap container with camera viewport indicator div.
 * Desktop: 150px max. Mobile: 100px max.
 * Shows the current map scenario label below the minimap.
 */

import type { Ref } from 'preact';
import { MINIMAP_SIZE } from '@/constants';
import { baseUnderAttack, mapScenario } from '@/ui/store';

export interface MinimapPanelProps {
  canvasRef: Ref<HTMLCanvasElement>;
  camRef: Ref<HTMLDivElement>;
}

export function MinimapPanel({ canvasRef, camRef }: MinimapPanelProps) {
  const scenario = mapScenario.value;
  const label = scenario ? scenario.charAt(0).toUpperCase() + scenario.slice(1) : '';

  return (
    <div
      class="w-1/3 md:w-full flex-shrink-0 p-1 md:p-2 flex flex-col justify-center items-center border-r-2 md:border-r-0 md:border-b-2 md:max-h-[190px]"
      style={{ background: 'var(--pw-bg-deep)', borderColor: 'var(--pw-border)' }}
    >
      <div
        id="minimap-container"
        class={`relative w-full h-full max-w-[100px] max-h-[100px] md:max-w-[150px] md:max-h-[150px] cursor-crosshair${baseUnderAttack.value ? ' animate-pulse' : ''}`}
        style={{ border: baseUnderAttack.value ? '2px solid rgb(239, 68, 68)' : '2px solid var(--pw-border)' }}
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
          class="mt-1 text-[9px] md:text-[10px] font-heading tracking-wide uppercase"
          style={{ color: 'var(--pw-text-muted)' }}
        >
          {label}
        </span>
      )}
    </div>
  );
}
