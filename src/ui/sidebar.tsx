/**
 * Sidebar wrapper containing MinimapPanel, SelectionPanel, ActionPanel.
 */

import type { Ref } from 'preact';
import { ActionPanel } from './action-panel';
import { MinimapPanel } from './minimap-panel';
import { SelectionPanel } from './selection-panel';

export interface SidebarProps {
  minimapCanvasRef: Ref<HTMLCanvasElement>;
  minimapCamRef: Ref<HTMLDivElement>;
  onDeselect?: () => void;
}

export function Sidebar({ minimapCanvasRef, minimapCamRef, onDeselect }: SidebarProps) {
  return (
    <div class="w-full md:w-64 h-48 md:h-full flex flex-row md:flex-col ui-panel z-20 shadow-2xl flex-shrink-0 border-t-4 md:border-t-0 md:border-r-4 border-slate-600">
      <MinimapPanel canvasRef={minimapCanvasRef} camRef={minimapCamRef} />
      <SelectionPanel onDeselect={onDeselect} />
      <ActionPanel />
    </div>
  );
}
