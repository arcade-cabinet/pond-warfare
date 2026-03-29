/**
 * Sidebar wrapper containing MinimapPanel, SelectionPanel, ActionPanel.
 */

import type { Ref } from 'preact';
import { MinimapPanel } from './minimap-panel';
import { SelectionPanel } from './selection-panel';
import { ActionPanel } from './action-panel';

export interface SidebarProps {
  minimapCanvasRef: Ref<HTMLCanvasElement>;
  minimapCamRef: Ref<HTMLDivElement>;
}

export function Sidebar({ minimapCanvasRef, minimapCamRef }: SidebarProps) {
  return (
    <div class="w-full md:w-64 h-48 md:h-full flex flex-row md:flex-col ui-panel z-20 shadow-2xl flex-shrink-0 border-t-4 md:border-t-0 md:border-r-4 border-slate-600">
      <MinimapPanel
        canvasRef={minimapCanvasRef}
        camRef={minimapCamRef}
      />
      <SelectionPanel />
      <ActionPanel />
    </div>
  );
}
