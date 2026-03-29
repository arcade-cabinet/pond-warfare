/**
 * Game Over Overlay
 *
 * Victory/Defeat overlay with stats (Day, Kills, Lost, Gathered, Buildings)
 * and Play Again button.
 */

import { gameState, goDesc, goStatsText, goTitle, goTitleColor } from './store';

export interface GameOverProps {
  onRestart?: () => void;
}

export function GameOverBanner(props: GameOverProps) {
  if (gameState.value === 'playing') return null;

  return (
    <div
      id="game-over-banner"
      class="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black bg-opacity-50"
    >
      <h1
        class={`text-4xl md:text-6xl font-black mb-4 tracking-widest uppercase shadow-lg ${goTitleColor.value}`}
      >
        {goTitle}
      </h1>
      <p class="text-xl md:text-2xl text-white font-bold">{goDesc}</p>
      <p class="text-sm text-slate-300 mt-2">{goStatsText}</p>
      <button
        type="button"
        id="restart-btn"
        class="mt-6 px-6 py-3 bg-sky-700 hover:bg-sky-600 text-white font-bold rounded-lg text-lg cursor-pointer border-2 border-sky-400 shadow-xl"
        onClick={props.onRestart}
      >
        Play Again
      </button>
    </div>
  );
}
