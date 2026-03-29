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

import { entityExists, hasComponent } from 'bitecs';
import { getKeymap } from '@/config/keymap';
import { WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { Selectable } from '@/ecs/components';
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
const PAN_ACCEL = 2;

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
    const keymap = getKeymap();
    let manualPan = false;

    // Pan up / screen-edge top
    if (keymap.panUp.some((k) => this.keys[k]) || (mouseIn && mouseY < 20 && !mouseIsDown)) {
      w.camVelY -= PAN_ACCEL;
      manualPan = true;
    }
    // Pan down / screen-edge bottom
    if (
      keymap.panDown.some((k) => this.keys[k]) ||
      (mouseIn && mouseY > w.viewHeight - 20 && !mouseIsDown)
    ) {
      w.camVelY += PAN_ACCEL;
      manualPan = true;
    }
    // Pan left / screen-edge left
    if (keymap.panLeft.some((k) => this.keys[k]) || (mouseIn && mouseX < 20 && !mouseIsDown)) {
      w.camVelX -= PAN_ACCEL;
      manualPan = true;
    }
    // Pan right / screen-edge right
    if (
      keymap.panRight.some((k) => this.keys[k]) ||
      (mouseIn && mouseX > w.viewWidth - 20 && !mouseIsDown)
    ) {
      w.camVelX += PAN_ACCEL;
      manualPan = true;
    }

    // Clamp velocity to max pan speed
    w.camVelX = Math.max(-PAN_SPEED, Math.min(PAN_SPEED, w.camVelX));
    w.camVelY = Math.max(-PAN_SPEED, Math.min(PAN_SPEED, w.camVelY));

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
    const keymap = getKeymap();

    // Escape: cancel placement / attack-move / deselect
    if (k === keymap.escape) {
      if (w.attackMoveMode) {
        w.attackMoveMode = false;
      } else if (w.placingBuilding) {
        w.placingBuilding = null;
      } else {
        for (const s of w.selection) {
          if (hasComponent(w.ecs, s, Selectable)) Selectable.selected[s] = 0;
        }
        w.selection = [];
        w.isTracking = false;
        this.cb.onUpdateUI();
      }
      return;
    }

    if (w.state !== 'playing') return;

    // Pause toggle (P key)
    if (k === keymap.pause) {
      w.paused = !w.paused;
      this.cb.onUpdateUI();
      return;
    }

    // Attack-move mode (A key): enables attack-move cursor; next click issues an attack-move command
    if (k === keymap.attackMove && !e.ctrlKey && this.cb.hasPlayerUnitsSelected()) {
      this.cb.onAttackMoveMode();
    }

    // Halt (H)
    if (k === keymap.halt && this.cb.hasPlayerUnitsSelected()) {
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
        const alive = g.filter((eid) => entityExists(w.ecs, eid));
        w.ctrlGroups[group] = alive;
        for (const s of w.selection) {
          if (hasComponent(w.ecs, s, Selectable)) Selectable.selected[s] = 0;
        }
        w.selection = [...alive];
        for (const s of w.selection) {
          if (hasComponent(w.ecs, s, Selectable)) Selectable.selected[s] = 1;
        }
        w.isTracking = true;
        this.cb.onPlaySound('selectUnit');
        this.cb.onUpdateUI();
      }
    }

    // Mute (M)
    if (k === keymap.mute) this.cb.onToggleMute();

    // Speed (F)
    if (k === keymap.speed) this.cb.onCycleSpeed();

    // Period for idle worker
    if (k === keymap.idleWorker) this.cb.onSelectIdleWorker();

    // Comma for army select
    if (k === keymap.selectArmy) this.cb.onSelectArmy();

    // Space to center on selection
    if (k === keymap.centerSelection && w.selection.length > 0) {
      e.preventDefault();
      w.isTracking = true;
    }

    // Tab to cycle through buildings
    if (k === keymap.cycleBuildings) {
      e.preventDefault();
      const buildings = this.cb.getPlayerBuildings();
      if (buildings.length > 0) {
        const curIdx = w.selection.length === 1 ? buildings.indexOf(w.selection[0]) : -1;
        const next = buildings[(curIdx + 1) % buildings.length];
        for (const s of w.selection) {
          if (hasComponent(w.ecs, s, Selectable)) Selectable.selected[s] = 0;
        }
        w.selection = [next];
        if (hasComponent(w.ecs, next, Selectable)) Selectable.selected[next] = 1;
        w.isTracking = true;
        this.cb.onPlaySound('selectBuild');
        this.cb.onUpdateUI();
      }
    }

    // Hotkey buttons: Q, W, E, R for action panel buttons
    const actionIdx = keymap.actionSlots.indexOf(k);
    if (actionIdx !== -1 && !e.ctrlKey) {
      this.cb.onActionHotkey(actionIdx);
    }
  }

  private onKeyUp(e: KeyboardEvent): void {
    const k = e.key.toLowerCase();
    this.keys[k] = false;
    if (k === 'shift') this.keys.shift = false;
  }
}
