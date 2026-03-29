/**
 * Minimap Panel
 *
 * Minimap container with camera viewport indicator div.
 * Desktop: 150px max. Mobile: 100px max.
 */

import type { Ref } from 'preact';
import { MINIMAP_SIZE } from '@/constants';

export interface MinimapPanelProps {
  canvasRef: Ref<HTMLCanvasElement>;
  camRef: Ref<HTMLDivElement>;
}

export function MinimapPanel({ canvasRef, camRef }: MinimapPanelProps) {
  return (
    <div
      class="w-1/3 md:w-full flex-shrink-0 p-1 md:p-2 flex justify-center items-center border-r-2 md:border-r-0 md:border-b-2 md:max-h-[166px]"
      style={{ background: 'var(--pw-bg-deep)', borderColor: 'var(--pw-border)' }}
    >
      <div
        id="minimap-container"
        class="relative w-full h-full max-w-[100px] max-h-[100px] md:max-w-[150px] md:max-h-[150px] cursor-crosshair"
        style={{ border: '2px solid var(--pw-border)' }}
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
    </div>
  );
}
