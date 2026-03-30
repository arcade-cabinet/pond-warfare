/**
 * Sidebar wrapper containing MinimapPanel, SelectionPanel, ActionPanel.
 *
 * Desktop (left sidebar): 240px wide, flex-col, action panel fills remaining space.
 * Mobile (bottom bar): full width, proportional flex-row with minimap narrower.
 */

import type { Ref } from 'preact';
import { ActionPanel } from './action-panel';
import { MinimapPanel } from './minimap-panel';
import { SelectionPanel } from './selection-panel';

export interface SidebarProps {
  minimapCanvasRef: Ref<HTMLCanvasElement>;
  minimapCamRef: Ref<HTMLDivElement>;
  onDeselect?: () => void;
  onIdleWorkerClick?: () => void;
  onArmyClick?: () => void;
  onAttackMoveClick?: () => void;
  onHaltClick?: () => void;
}

export function Sidebar({ minimapCanvasRef, minimapCamRef, onDeselect, onIdleWorkerClick, onArmyClick, onAttackMoveClick, onHaltClick }: SidebarProps) {
  return (
    <div
      class="w-full md:w-64 h-48 md:h-full flex flex-row md:flex-col ui-panel z-20 shadow-2xl flex-shrink-0 border-t-4 md:border-t-0 md:border-r-4"
      style={{ borderColor: 'var(--pw-border)' }}
    >
      <MinimapPanel canvasRef={minimapCanvasRef} camRef={minimapCamRef} />
      <SelectionPanel onDeselect={onDeselect} onIdleWorkerClick={onIdleWorkerClick} onArmyClick={onArmyClick} onAttackMoveClick={onAttackMoveClick} onHaltClick={onHaltClick} />
      <ActionPanel />
    </div>
  );
}
