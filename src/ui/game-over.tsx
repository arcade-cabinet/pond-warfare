/**
 * Game Over Overlay
 *
 * Victory/Defeat overlay with animated stat reveal (anime.js stagger),
 * performance rating, confetti for victory, and Play Again button.
 */

import { useEffect, useRef } from 'preact/hooks';
import { animateGameOverStats } from '@/rendering/animations';
import { gameState, goDesc, goRating, goStatLines, goTitle, goTitleColor } from './store';

export interface GameOverProps {
  onRestart: () => void;
}

function ConfettiDots() {
  const dots = Array.from({ length: 30 }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 2;
    const duration = 2 + Math.random() * 2;
    const colors = ['#fbbf24', '#38bdf8', '#f87171', '#4ade80', '#a78bfa', '#fb923c'];
    const color = colors[i % colors.length];
    return (
      <span
        key={`confetti-${i}`}
        style={{
          position: 'absolute',
          left: `${left}%`,
          top: '-10px',
          width: '8px',
          height: '8px',
          borderRadius: '50%',
          backgroundColor: color,
          animation: `confetti-fall ${duration}s ${delay}s ease-in infinite`,
          opacity: 0.8,
        }}
      />
    );
  });
  return <>{dots}</>;
}

function StarRating({ stars }: { stars: number }) {
  return (
    <div class="text-3xl mt-2">
      {Array.from({ length: 3 }, (_, i) => (
        <span key={`star-${i}`} style={{ color: i < stars ? '#fbbf24' : '#475569' }}>
          {'\u2605'}
        </span>
      ))}
    </div>
  );
}

export function GameOverBanner(props: GameOverProps) {
  const state = gameState.value;
  const statsContainerRef = useRef<HTMLDivElement>(null);
  const restartButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    if (state !== 'playing' && statsContainerRef.current) {
      animateGameOverStats(statsContainerRef.current);
      // Focus the restart button when dialog opens
      if (restartButtonRef.current) {
        restartButtonRef.current.focus();
      }
    }
  }, [state]);

  if (state === 'playing') return null;

  const lines = goStatLines.value;
  const stars = goRating.value;
  const isVictory = state === 'win';

  return (
    <div
      id="game-over-banner"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
      class="absolute inset-0 flex flex-col items-center justify-center z-30 bg-black bg-opacity-50 overflow-hidden"
    >
      {isVictory && <ConfettiDots />}
      <h1
        id="game-over-title"
        class={`text-4xl md:text-6xl font-black mb-4 tracking-widest uppercase shadow-lg ${goTitleColor.value}`}
      >
        {goTitle}
      </h1>
      <p class="text-xl md:text-2xl text-white font-bold">{goDesc}</p>
      <StarRating stars={stars} />
      <div ref={statsContainerRef} class="mt-4 flex flex-col items-center gap-1">
        {lines.map((line, i) => (
          <p key={`stat-${i}`} data-stat-line class="text-sm text-slate-300" style={{ opacity: 0 }}>
            {line}
          </p>
        ))}
      </div>
      <button
        ref={restartButtonRef}
        type="button"
        id="restart-btn"
        class="mt-6 px-6 py-3 bg-sky-700 hover:bg-sky-600 text-white font-bold rounded-lg text-lg cursor-pointer border-2 border-sky-400 shadow-xl"
        onClick={props.onRestart}
      >
        Play Again
      </button>
      <style>
        {`
          @keyframes confetti-fall {
            0% { transform: translateY(0) rotate(0deg); opacity: 1; }
            100% { transform: translateY(100vh) rotate(720deg); opacity: 0; }
          }
        `}
      </style>
    </div>
  );
}