/**
 * Application Entry Point
 *
 * Imports styles, renders the Preact UI shell, and starts the game engine
 * once the DOM is ready. The Preact App component creates all canvas elements
 * via refs, then passes them to game.init().
 */

import '@/styles/main.css';
import { render } from 'preact';
import { game } from '@/game';
import { App } from '@/ui/app';

// Mount the Preact application
const root = document.getElementById('app');
if (root) {
  render(
    <App
      onMount={(refs) => {
        game.init(
          refs.container,
          refs.gameCanvas,
          refs.fogCanvas,
          refs.lightCanvas,
          refs.minimapCanvas,
          refs.minimapCam,
        );
      }}
    />,
    root,
  );
}
