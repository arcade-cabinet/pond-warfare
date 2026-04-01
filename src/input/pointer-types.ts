/**
 * Pointer Types – Shared interfaces and constants for pointer handling.
 */

export interface PointerState {
  x: number;
  y: number;
  worldX: number;
  worldY: number;
  startX: number;
  startY: number;
  isDown: boolean;
  btn: number;
  in: boolean;
}

export interface PointerCallbacks {
  getEntityAt: (wx: number, wy: number) => number | null;
  hasPlayerUnitsSelected: () => boolean;
  issueContextCommand: (target: number | null) => void;
  onUpdateUI: () => void;
  onPlaceBuilding: () => void;
  onPlaySound: (name: 'selectUnit' | 'selectBuild' | 'click') => void;
  isPlayerUnit: (eid: number) => boolean;
  isPlayerBuilding: (eid: number) => boolean;
  isEnemyFaction: (eid: number) => boolean;
  isBuildingEntity: (eid: number) => boolean;
  getEntityKind: (eid: number) => number;
  getEntityPosition: (eid: number) => { x: number; y: number } | null;
  isEntityOnScreen: (eid: number) => boolean;
  getAllPlayerUnitsOfKind: (kind: number) => number[];
  selectEntity: (eid: number) => void;
  deselectEntity: (eid: number) => void;
  deselectAll: () => void;
}

export const DRAG_THRESHOLD = 10;
export const LONG_PRESS_MS = 500;
export const LONG_PRESS_MOVE_THRESHOLD = 10;
export const MIN_ZOOM = 0.5;
export const MAX_ZOOM = 2.0;
