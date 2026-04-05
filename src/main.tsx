/**
 * Application Entry Point
 *
 * Imports styles, initializes the SQLite database, renders the Preact UI shell,
 * and starts the game engine when the player starts or continues a game.
 * The Preact App component creates all canvas elements via refs, which are
 * stored for later use when the menu transitions to 'playing'.
 */

import '@/styles/main.css';
import { render } from 'preact';
import { loadKeymapFromStorage } from '@/config/keymap';
import { installGlobalErrorHandlers, reportFatalError } from '@/errors';
import { game } from '@/game';
import { initDeviceSignals, initNativePlatform } from '@/platform';
import { initDatabase } from '@/storage';
import { loadPersistedSettings } from '@/storage/settings-persistence';
import { hydrateV3StoreFromDb } from '@/ui/store-v3-persistence';

// Install global error handlers FIRST — before anything else can fail
installGlobalErrorHandlers();

import { App } from '@/ui/app';
import { menuState } from '@/ui/store';

/** Stored DOM refs from the App component, used to init the game later. */
let storedRefs: {
  container: HTMLDivElement;
  gameCanvas: HTMLCanvasElement;
  fogCanvas: HTMLCanvasElement;
  lightCanvas: HTMLCanvasElement;
} | null = null;

let gameStarted = false;

// US7: Seamless PLAY — always starts a new match. Run state (progression,
// clams, upgrades) is already in store-v3 signals from hydrateV3StoreFromDb().
// Game.init() reads those signals to apply upgrade effects and difficulty.
function startGame() {
  if (!storedRefs || gameStarted) return;
  gameStarted = true;

  game.init(
    storedRefs.container,
    storedRefs.gameCanvas,
    storedRefs.fogCanvas,
    storedRefs.lightCanvas,
  );
}

// Initialize database then mount the Preact application
(async () => {
  // Initialize native platform features (orientation lock, StatusBar, back button)
  await initNativePlatform();

  // Initialize device detection signals (form factor, input mode, screen class)
  await initDeviceSignals();

  // Initialize SQLite — REQUIRED
  try {
    await initDatabase();
  } catch (err) {
    reportFatalError(err);
    // Still render the app so the ErrorOverlay can show the fatal error
  }

  // Load persisted user settings (volume, speed, accessibility, commander)
  await loadPersistedSettings();

  // Hydrate v3 prestige/run signals from SQLite
  await hydrateV3StoreFromDb();

  // Load keymap from Capacitor Preferences
  await loadKeymapFromStorage();

  const root = document.getElementById('app');
  if (root) {
    render(
      <App
        onMount={(refs) => {
          storedRefs = refs;
          // If menu is already 'playing' (edge case), start immediately
          if (menuState.value === 'playing') {
            startGame();
          }
        }}
      />,
      root,
    );

    // Subscribe to menu state changes — US7: always new match, no continue flag
    menuState.subscribe((state) => {
      if (state === 'playing' && storedRefs && !gameStarted) {
        startGame();
      }
    });
  }
})();
