/**
 * Application Entry Point
 *
 * Imports styles, renders the Preact UI shell, and starts the game engine
 * once the DOM is ready. The Preact App component creates all canvas elements
 * via refs, then passes them to game.init().
 */

import '@/styles/main.css';
import { render } from 'preact';
import { App } from '@/ui/app';

// Mount the Preact application
const root = document.getElementById('app');
if (root) {
  render(<App />, root);
}
