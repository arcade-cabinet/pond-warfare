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
  actionSlots: string[]; // Q, W, E, R
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
  actionSlots: ['q', 'w', 'e', 'r'],
};

let activeKeymap: KeyMap = { ...DEFAULT_KEYMAP };

export function getKeymap(): KeyMap {
  return activeKeymap;
}

export function setKeymap(keymap: Partial<KeyMap>): void {
  activeKeymap = { ...activeKeymap, ...keymap };
}

export function loadKeymapFromStorage(): void {
  try {
    const stored = localStorage.getItem('pond-warfare-keymap');
    if (stored) setKeymap(JSON.parse(stored));
  } catch {
    /* ignore */
  }
}

export function saveKeymapToStorage(): void {
  try {
    localStorage.setItem('pond-warfare-keymap', JSON.stringify(activeKeymap));
  } catch {
    /* ignore */
  }
}
