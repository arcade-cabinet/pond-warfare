/**
 * Game action handlers.
 *
 * Extracted from app.tsx to avoid monolithic component files. Each function
 * wraps a game-world mutation + UI store sync so components can call them
 * without importing game internals.
 */

import { hasComponent } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { SPEED_LEVELS } from '@/constants';
import { Selectable, UnitStateMachine } from '@/ecs/components';
import { game } from '@/game';
import { cycleStanceForSelection } from '@/game/input-setup';
import { hasPlayerUnitsSelected, selectArmy, selectIdleWorker } from '@/input/selection';
import { setColorBlindMode } from '@/rendering/pixi-app';
import { loadGame, saveGame } from '@/save-system';
import { getLatestSave, saveGameToDb } from '@/storage';
import * as store from './store';

/** Clear current selection. */
export function deselect(): void {
  const w = game.world;
  for (const eid of w.selection) {
    if (hasComponent(w.ecs, eid, Selectable)) Selectable.selected[eid] = 0;
  }
  w.selection = [];
  w.isTracking = false;
  game.syncUIStore();
}

/** Activate attack-move mode (next click targets ground/enemy). */
export function activateAttackMove(): void {
  if (hasPlayerUnitsSelected(game.world)) {
    game.world.attackMoveMode = true;
    game.syncUIStore();
  }
}

/** Stop all selected units (halt movement + clear targets + attack-move). */
export function haltSelection(): void {
  const w = game.world;
  for (const eid of w.selection) {
    if (hasComponent(w.ecs, eid, UnitStateMachine)) {
      UnitStateMachine.state[eid] = 0; // UnitState.Idle
      UnitStateMachine.targetEntity[eid] = -1;
      UnitStateMachine.returnEntity[eid] = -1;
      UnitStateMachine.gatherTimer[eid] = 0;
      UnitStateMachine.attackMoveTargetX[eid] = 0;
      UnitStateMachine.attackMoveTargetY[eid] = 0;
      UnitStateMachine.hasAttackMoveTarget[eid] = 0;
      // Remove from Yuka so the unit physically stops moving immediately
      w.yukaManager.clearFormationBehaviors(eid);
      w.yukaManager.removeUnit(eid);
    }
  }
  game.syncUIStore();
}

/** Select all player units on screen. */
export function selectAllUnits(): void {
  const w = game.world;
  // Deselect current
  for (const eid of w.selection) {
    if (hasComponent(w.ecs, eid, Selectable)) Selectable.selected[eid] = 0;
  }
  w.selection = [];
  // Select every selectable player unit
  // Use the selectArmy helper which grabs all combat + gatherer units
  selectArmy(w);
  game.syncUIStore();
}

/** Cycle through idle workers. */
export function cycleIdleWorker(): void {
  selectIdleWorker(game.world);
  game.syncUIStore();
}

/** Select all army (non-building, non-gatherer) units. */
export function selectArmyUnits(): void {
  selectArmy(game.world);
  game.syncUIStore();
}

/** Quick-save to DB with floating text feedback after write resolves. */
export function quickSave(): void {
  const json = saveGame(game.world);
  const difficulty = store.selectedDifficulty.value ?? 'normal';
  const seed = store.goMapSeed.value ?? 0;
  saveGameToDb('quicksave', difficulty, seed, json, false)
    .then(() => {
      store.hasSaveGame.value = true;
      game.world.floatingTexts.push({
        x: game.world.camX + (game.world.viewWidth || 400) / 2,
        y: game.world.camY + 60,
        text: 'Game Saved',
        color: '#4ade80',
        life: 60,
      });
      audio.click();
    })
    .catch((err) => {
      // biome-ignore lint/suspicious/noConsole: surface save failures
      console.error('Failed to save game to DB', err);
      game.world.floatingTexts.push({
        x: game.world.camX + (game.world.viewWidth || 400) / 2,
        y: game.world.camY + 60,
        text: 'Save Failed',
        color: '#f87171',
        life: 90,
      });
    });
}

/** Quick-load latest save from DB. */
export function quickLoad(): void {
  getLatestSave()
    .then((row) => {
      if (row?.data) {
        loadGame(game.world, row.data);
        game.syncUIStore();
        audio.click();
      }
    })
    .catch((err) => {
      // biome-ignore lint/suspicious/noConsole: surface load failures
      console.error('Failed to load game from DB', err);
    });
}

/** Cycle game speed (1x → 2x → 3x → 1x). */
export function cycleSpeed(): void {
  game.cycleSpeed();
}

/** Toggle audio mute. */
export function toggleMute(): void {
  audio.toggleMute();
  store.muted.value = audio.muted;
}

/** Toggle pause. */
export function togglePause(): void {
  game.world.paused = !game.world.paused;
  game.syncUIStore();
}

/** Toggle color-blind mode. */
export function toggleColorBlind(): void {
  store.colorBlindMode.value = !store.colorBlindMode.value;
  setColorBlindMode(store.colorBlindMode.value);
}

/** Toggle the slide-out command panel. */
export function togglePanel(): void {
  store.mobilePanelOpen.value = !store.mobilePanelOpen.value;
  audio.click();
}

/** Open settings and close panel. */
export function openSettings(): void {
  store.settingsOpen.value = true;
  store.mobilePanelOpen.value = false;
}

/** Open tech tree and close panel. */
export function openTechTree(): void {
  store.techTreeOpen.value = true;
  store.mobilePanelOpen.value = false;
}

/** Set game speed to a specific value. */
export function setSpeed(speed: number): void {
  const w = game.world;
  if (SPEED_LEVELS.includes(speed as 1 | 2 | 3)) {
    w.gameSpeed = speed;
    store.gameSpeed.value = speed;
  }
}

/** Open achievements panel and close hamburger panel. */
export function openAchievements(): void {
  store.achievementsOpen.value = true;
  store.mobilePanelOpen.value = false;
}

/** Open leaderboard panel and close hamburger panel. */
export function openLeaderboard(): void {
  store.leaderboardOpen.value = true;
  store.mobilePanelOpen.value = false;
}

/** Open keyboard reference and close hamburger panel. */
export function openKeyboardRef(): void {
  store.keyboardRefOpen.value = true;
  store.mobilePanelOpen.value = false;
}

/** Cycle unit stance for selected units (Aggressive -> Defensive -> Hold). */
export function cycleStance(): void {
  cycleStanceForSelection(game.world);
  game.syncUIStore();
}

/** Toggle an auto-behavior by role, updating both the store signal and the world. */
export function toggleAutoBehavior(role: 'gatherer' | 'combat' | 'healer' | 'scout'): void {
  const signalMap = {
    gatherer: store.autoGathererEnabled,
    combat: store.autoCombatEnabled,
    healer: store.autoHealerEnabled,
    scout: store.autoScoutEnabled,
  } as const;
  const sig = signalMap[role];
  sig.value = !sig.value;
  game.world.autoBehaviors[role] = sig.value;
}
