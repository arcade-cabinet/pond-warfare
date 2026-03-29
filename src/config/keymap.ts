export interface KeyMap {
  panUp: string[];
  panDown: string[];
  panLeft: string[];
  panRight: string[];
  attackMove: string;
  halt: string;
  pause: string;
  mute: string;
  speed: string;
  idleWorker: string;
  selectArmy: string;
  centerSelection: string;
  cycleBuildings: string;
  escape: string;
  actionSlots: string[]; // Q, W, E, R, T, Y
}

export const DEFAULT_KEYMAP: KeyMap = {
  panUp: ['w', 'arrowup'],
  panDown: ['s', 'arrowdown'],
  panLeft: ['arrowleft'],
  panRight: ['d', 'arrowright'],
  attackMove: 'a',
  halt: 'h',
  pause: 'p',
  mute: 'm',
  speed: 'f',
  idleWorker: '.',
  selectArmy: ',',
  centerSelection: ' ',
  cycleBuildings: 'tab',
  escape: 'escape',
  actionSlots: ['q', 'w', 'e', 'r', 't', 'y'],
};

let activeKeymap: KeyMap = deepCopyKeymap(DEFAULT_KEYMAP);

/** Deep-copy a keymap to ensure callers receive isolated objects. */
function deepCopyKeymap(keymap: KeyMap): KeyMap {
  return {
    panUp: [...keymap.panUp],
    panDown: [...keymap.panDown],
    panLeft: [...keymap.panLeft],
    panRight: [...keymap.panRight],
    attackMove: keymap.attackMove,
    halt: keymap.halt,
    pause: keymap.pause,
    mute: keymap.mute,
    speed: keymap.speed,
    idleWorker: keymap.idleWorker,
    selectArmy: keymap.selectArmy,
    centerSelection: keymap.centerSelection,
    cycleBuildings: keymap.cycleBuildings,
    escape: keymap.escape,
    actionSlots: [...keymap.actionSlots],
  };
}

export function getKeymap(): KeyMap {
  return deepCopyKeymap(activeKeymap);
}

export function setKeymap(keymap: Partial<KeyMap>): void {
  const merged: KeyMap = { ...activeKeymap };
  if (keymap.panUp !== undefined) merged.panUp = [...keymap.panUp];
  if (keymap.panDown !== undefined) merged.panDown = [...keymap.panDown];
  if (keymap.panLeft !== undefined) merged.panLeft = [...keymap.panLeft];
  if (keymap.panRight !== undefined) merged.panRight = [...keymap.panRight];
  if (keymap.attackMove !== undefined) merged.attackMove = keymap.attackMove;
  if (keymap.halt !== undefined) merged.halt = keymap.halt;
  if (keymap.pause !== undefined) merged.pause = keymap.pause;
  if (keymap.mute !== undefined) merged.mute = keymap.mute;
  if (keymap.speed !== undefined) merged.speed = keymap.speed;
  if (keymap.idleWorker !== undefined) merged.idleWorker = keymap.idleWorker;
  if (keymap.selectArmy !== undefined) merged.selectArmy = keymap.selectArmy;
  if (keymap.centerSelection !== undefined) merged.centerSelection = keymap.centerSelection;
  if (keymap.cycleBuildings !== undefined) merged.cycleBuildings = keymap.cycleBuildings;
  if (keymap.escape !== undefined) merged.escape = keymap.escape;
  if (keymap.actionSlots !== undefined) {
    const slots = [...keymap.actionSlots];
    // Normalize to exactly 6 items: pad with defaults or truncate.
    // Note: short arrays are padded with defaults here, but the validator
    // (isValidPartialKeyMap) requires exactly 6 items. This asymmetry is
    // intentional — setKeymap is lenient to simplify programmatic callers,
    // while the validator is strict for untrusted input (e.g. localStorage).
    while (slots.length < 6) slots.push(DEFAULT_KEYMAP.actionSlots[slots.length]);
    merged.actionSlots = slots.slice(0, 6);
  }
  activeKeymap = merged;
}

/** Validate that a parsed object represents a valid partial keymap. */
function isValidPartialKeyMap(obj: any): boolean {
  if (typeof obj !== 'object' || obj === null) return false;

  // Check array fields if present
  if (
    obj.panUp !== undefined &&
    (!Array.isArray(obj.panUp) || !obj.panUp.every((s: any) => typeof s === 'string'))
  ) {
    return false;
  }
  if (
    obj.panDown !== undefined &&
    (!Array.isArray(obj.panDown) || !obj.panDown.every((s: any) => typeof s === 'string'))
  ) {
    return false;
  }
  if (
    obj.panLeft !== undefined &&
    (!Array.isArray(obj.panLeft) || !obj.panLeft.every((s: any) => typeof s === 'string'))
  ) {
    return false;
  }
  if (
    obj.panRight !== undefined &&
    (!Array.isArray(obj.panRight) || !obj.panRight.every((s: any) => typeof s === 'string'))
  ) {
    return false;
  }
  if (
    obj.actionSlots !== undefined &&
    (!Array.isArray(obj.actionSlots) ||
      obj.actionSlots.length !== 6 ||
      !obj.actionSlots.every((s: any) => typeof s === 'string'))
  ) {
    return false;
  }

  // Check string fields if present
  if (obj.attackMove !== undefined && typeof obj.attackMove !== 'string') return false;
  if (obj.halt !== undefined && typeof obj.halt !== 'string') return false;
  if (obj.pause !== undefined && typeof obj.pause !== 'string') return false;
  if (obj.mute !== undefined && typeof obj.mute !== 'string') return false;
  if (obj.speed !== undefined && typeof obj.speed !== 'string') return false;
  if (obj.idleWorker !== undefined && typeof obj.idleWorker !== 'string') return false;
  if (obj.selectArmy !== undefined && typeof obj.selectArmy !== 'string') return false;
  if (obj.centerSelection !== undefined && typeof obj.centerSelection !== 'string') return false;
  if (obj.cycleBuildings !== undefined && typeof obj.cycleBuildings !== 'string') return false;
  if (obj.escape !== undefined && typeof obj.escape !== 'string') return false;

  return true;
}

const KEYMAP_STORAGE_KEY = 'pond-warfare-keymap';

function warnKeymapStorage(action: string, error: unknown): void {
  if (typeof import.meta !== 'undefined' && import.meta.env?.DEV) {
    // biome-ignore lint/suspicious/noConsole: dev-only diagnostics
    console.warn(`[keymap] Failed to ${action} keymap`, error);
  }
}

export async function loadKeymapFromStorage(): Promise<void> {
  try {
    const { loadPreference } = await import('@/platform/native');
    const stored = await loadPreference(KEYMAP_STORAGE_KEY);
    if (stored) {
      const parsed = JSON.parse(stored);
      if (isValidPartialKeyMap(parsed)) {
        setKeymap(parsed);
      }
    }
  } catch (error) {
    warnKeymapStorage('load', error);
  }
}

export async function saveKeymapToStorage(): Promise<void> {
  try {
    const { savePreference } = await import('@/platform/native');
    await savePreference(KEYMAP_STORAGE_KEY, JSON.stringify(activeKeymap));
  } catch (error) {
    warnKeymapStorage('save', error);
  }
}
