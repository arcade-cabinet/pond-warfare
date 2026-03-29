/**
 * Minimap Panel
 *
 * Minimap container with camera viewport indicator div.
 */

import type { Ref } from 'preact';
import { MINIMAP_SIZE } from '@/constants';

export interface MinimapPanelProps {
  canvasRef: Ref<HTMLCanvasElement>;
  camRef: Ref<HTMLDivElement>;
}

export function MinimapPanel({ canvasRef, camRef }: MinimapPanelProps) {
  return (
    <div class="w-1/3 md:w-full md:h-64 p-1 md:p-2 bg-black flex justify-center items-center border-r-2 md:border-r-0 md:border-b-4 border-slate-700">
      <div
        id="minimap-container"
        class="relative w-full h-full max-w-[200px] max-h-[200px] cursor-crosshair border-2 border-slate-600"
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
