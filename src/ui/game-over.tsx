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
    const colors = ['#f0d060', '#40c8d0', '#e05050', '#40b868', '#a78bfa', '#e8a030'];
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
        <span
          key={`star-${i}`}
          style={{ color: i < stars ? 'var(--pw-clam)' : 'var(--pw-text-muted)' }}
        >
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
      class="absolute inset-0 flex flex-col items-center justify-center z-30 overflow-hidden"
      style={{ background: 'rgba(12, 26, 31, 0.7)' }}
    >
      {isVictory && <ConfettiDots />}
      <h1
        id="game-over-title"
        class={`font-title text-4xl md:text-6xl mb-4 tracking-widest uppercase shadow-lg ${goTitleColor.value}`}
      >
        {goTitle}
      </h1>
      <p class="font-heading text-xl md:text-2xl text-white font-bold">{goDesc}</p>
      <StarRating stars={stars} />
      <div ref={statsContainerRef} class="mt-4 flex flex-col items-center gap-1">
        {lines.map((line, i) => (
          <p
            key={`stat-${i}`}
            data-stat-line
            class="font-numbers text-sm"
            style={{ opacity: 0, color: 'var(--pw-text-secondary)' }}
          >
            {line}
          </p>
        ))}
      </div>
      <button
        ref={restartButtonRef}
        type="button"
        id="restart-btn"
        class="mt-6 px-6 py-3 font-heading text-white font-bold rounded-lg text-lg cursor-pointer shadow-xl transition-colors"
        style={{
          background: 'var(--pw-bg-elevated)',
          border: '2px solid var(--pw-accent)',
          color: 'var(--pw-accent-bright)',
        }}
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
