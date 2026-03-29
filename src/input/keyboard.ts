/**
 * Keyboard Handler
 *
 * Ported from setupInput() keydown/keyup (lines 671-762) of the original HTML game.
 *
 * WASD/arrow camera pan, Escape (cancel placement/attack-move/deselect),
 * A (attack-move mode), H (halt), Ctrl+1-9 (save groups), 1-9 (recall groups),
 * M (mute), F (speed cycle), . (idle worker), , (army select), Space (center
 * on selection), Tab (cycle buildings), Q/W/E/R (action hotkeys).
 */

import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import type { GameWorld } from '@/ecs/world';

export interface KeyboardCallbacks {
  onToggleMute: () => void;
  onCycleSpeed: () => void;
  onSelectIdleWorker: () => void;
  onSelectArmy: () => void;
  onUpdateUI: () => void;
  onPlaySound: (name: 'selectUnit' | 'selectBuild' | 'click') => void;
  hasPlayerUnitsSelected: () => boolean;
  getPlayerBuildings: () => number[];
  onHalt: () => void;
  onAttackMoveMode: () => void;
  onActionHotkey: (index: number) => void;
}

const PAN_SPEED = 12;

export class KeyboardHandler {
  readonly keys: Record<string, boolean> = {};

  private world: GameWorld;
  private cb: KeyboardCallbacks;
  private handleKeyDown: (e: KeyboardEvent) => void;
  private handleKeyUp: (e: KeyboardEvent) => void;

  constructor(world: GameWorld, callbacks: KeyboardCallbacks) {
    this.world = world;
    this.cb = callbacks;

    this.handleKeyDown = (e: KeyboardEvent) => this.onKeyDown(e);
    this.handleKeyUp = (e: KeyboardEvent) => this.onKeyUp(e);

    window.addEventListener('keydown', this.handleKeyDown);
    window.addEventListener('keyup', this.handleKeyUp);
  }

  destroy(): void {
    window.removeEventListener('keydown', this.handleKeyDown);
    window.removeEventListener('keyup', this.handleKeyUp);
  }

  /** Process camera panning each frame (WASD / arrow keys / screen-edge). */
  updatePan(mouseIn: boolean, mouseX: number, mouseY: number, mouseIsDown: boolean): boolean {
    const w = this.world;
    let manualPan = false;

    // W / ArrowUp / screen-edge top
    if (this.keys.w || this.keys.arrowup || (mouseIn && mouseY < 20 && !mouseIsDown)) {
      w.camY -= PAN_SPEED;
      manualPan = true;
    }
    // S / ArrowDown / screen-edge bottom
    if (
      this.keys.s ||
      this.keys.arrowdown ||
      (mouseIn && mouseY > w.viewHeight - 20 && !mouseIsDown)
    ) {
      w.camY += PAN_SPEED;
      manualPan = true;
    }
    // ArrowLeft / screen-edge left (A is reserved for attack-move)
    if (this.keys.arrowleft || (mouseIn && mouseX < 20 && !mouseIsDown)) {
      w.camX -= PAN_SPEED;
      manualPan = true;
    }
    // D / ArrowRight / screen-edge right
    if (
      this.keys.d ||
      this.keys.arrowright ||
      (mouseIn && mouseX > w.viewWidth - 20 && !mouseIsDown)
    ) {
      w.camX += PAN_SPEED;
      manualPan = true;
    }

    if (manualPan) {
      w.isTracking = false;
    }

    // Clamp camera
    w.camX = Math.max(0, Math.min(WORLD_WIDTH - w.viewWidth, w.camX));
    w.camY = Math.max(0, Math.min(WORLD_HEIGHT - w.viewHeight, w.camY));

    return manualPan;
  }

  // ---- private ----

  private onKeyDown(e: KeyboardEvent): void {
    const k = e.key.toLowerCase();
    this.keys[k] = true;
    if (k === 'shift') this.keys.shift = true;

    const w = this.world;

    // Escape: cancel placement / attack-move / deselect
    if (k === 'escape') {
      if (w.attackMoveMode) {
        w.attackMoveMode = false;
      } else if (w.placingBuilding) {
        w.placingBuilding = null;
      } else {
        w.selection = [];
        w.isTracking = false;
        this.cb.onUpdateUI();
      }
      return;
    }

    if (w.state !== 'playing') return;

    // Attack-move (A)
    if (k === 'a' && !e.ctrlKey && this.cb.hasPlayerUnitsSelected()) {
      this.cb.onAttackMoveMode();
    }

    // Halt (H)
    if (k === 'h' && this.cb.hasPlayerUnitsSelected()) {
      this.cb.onHalt();
    }

    // Control groups
    if (e.ctrlKey && k >= '1' && k <= '9') {
      e.preventDefault();
      const group = Number.parseInt(k, 10);
      w.ctrlGroups[group] = [...w.selection];
      w.floatingTexts.push({
        x: w.camX + w.viewWidth / 2,
        y: w.camY + 60,
        text: `Group ${group} set (${w.ctrlGroups[group].length})`,
        color: '#38bdf8',
        life: 60,
      });
    } else if (!e.ctrlKey && k >= '1' && k <= '9') {
      const group = Number.parseInt(k, 10);
      const g = w.ctrlGroups[group];
      if (g && g.length > 0) {
        w.selection = [...g];
        w.isTracking = true;
        this.cb.onPlaySound('selectUnit');
        this.cb.onUpdateUI();
      }
    }

    // Mute (M)
    if (k === 'm') this.cb.onToggleMute();

    // Speed (F)
    if (k === 'f') this.cb.onCycleSpeed();

    // Period for idle worker
    if (k === '.') this.cb.onSelectIdleWorker();

    // Comma for army select
    if (k === ',') this.cb.onSelectArmy();

    // Space to center on selection
    if (k === ' ' && w.selection.length > 0) {
      e.preventDefault();
      w.isTracking = true;
    }

    // Tab to cycle through buildings
    if (k === 'tab') {
      e.preventDefault();
      const buildings = this.cb.getPlayerBuildings();
      if (buildings.length > 0) {
        const curIdx = w.selection.length === 1 ? buildings.indexOf(w.selection[0]) : -1;
        const next = buildings[(curIdx + 1) % buildings.length];
        w.selection = [next];
        w.isTracking = true;
        this.cb.onPlaySound('selectBuild');
        this.cb.onUpdateUI();
      }
    }

    // Hotkey buttons: Q, W, E, R for action panel buttons
    if (['q', 'w', 'e', 'r'].includes(k) && !e.ctrlKey) {
      const idx = 'qwer'.indexOf(k);
      this.cb.onActionHotkey(idx);
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    const k = e.key.toLowerCase();
    this.keys[k] = false;
    if (e.key === 'Shift') this.keys.shift = false;
  }
}
