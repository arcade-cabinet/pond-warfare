/**
 * Game Over Overlay
 *
 * Victory/Defeat overlay with animated stat reveal (anime.js stagger),
 * counter-up numbers with tick sounds, performance rating, confetti for
 * victory, "Play Again" (same settings) and "Main Menu" buttons.
 */

import { useEffect, useRef } from 'preact/hooks';
import { audio } from '@/audio/audio-system';
import { animateGameOverStats } from '@/rendering/animations';
import {
  gameState,
  goDesc,
  goMapSeed,
  goRating,
  goStatLines,
  goTitle,
  goTitleColor,
  menuState,
} from './store';

export interface GameOverProps {
  onRestart: () => void;
}

function ConfettiDots() {
  const dots = Array.from({ length: 30 }, (_, i) => {
    const left = Math.random() * 100;
    const delay = Math.random() * 2;
    const duration = 2 + Math.random() * 2;
    const colors = ['#f0d060', '#40c8d0', '#e05050', '#40b868', '#e8b878', '#e8a030'];
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
    <div class="text-3xl mt-3 flex gap-1">
      {Array.from({ length: 3 }, (_, i) => (
        <span
          key={`star-${i}`}
          style={{
            color: i < stars ? 'var(--pw-clam)' : 'var(--pw-text-muted)',
            textShadow: i < stars ? '0 0 8px rgba(240, 208, 96, 0.4)' : 'none',
          }}
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
      animateGameOverStats(
        statsContainerRef.current,
        () => audio.statTick(),
        () => audio.statTotal(),
      );
      if (restartButtonRef.current) {
        restartButtonRef.current.focus();
      }
    }
  }, [state]);

  if (state === 'playing') return null;

  const lines = goStatLines.value;
  const stars = goRating.value;
  const isVictory = state === 'win';

  const handleMainMenu = () => {
    menuState.value = 'main';
  };

  return (
    <div
      id="game-over-banner"
      role="dialog"
      aria-modal="true"
      aria-labelledby="game-over-title"
      class="absolute inset-0 flex flex-col items-center justify-center z-30 overflow-hidden"
      style={{
        background: isVictory
          ? 'radial-gradient(ellipse at 50% 40%, rgba(240, 208, 96, 0.08), rgba(12, 26, 31, 0.85) 60%)'
          : 'radial-gradient(ellipse at 50% 40%, rgba(192, 48, 48, 0.1), rgba(12, 26, 31, 0.85) 60%)',
      }}
    >
      {isVictory && <ConfettiDots />}

      <h1
        id="game-over-title"
        class={`font-title text-4xl md:text-6xl mb-3 tracking-widest uppercase ${goTitleColor.value}`}
        style={{
          textShadow: isVictory
            ? '0 0 40px rgba(240, 208, 96, 0.4), 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000'
            : '0 0 40px rgba(192, 48, 48, 0.4), 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000',
        }}
      >
        {goTitle}
      </h1>

      <p
        class="font-heading text-xl md:text-2xl font-bold"
        style={{
          color: isVictory ? 'var(--pw-otter-light)' : 'var(--pw-enemy-light)',
        }}
      >
        {goDesc}
      </p>

      <StarRating stars={stars} />

      {/* Parchment stat card */}
      <div
        ref={statsContainerRef}
        class="parchment-panel pond-panel-bg mt-5 px-6 py-4 rounded-lg flex flex-col items-center gap-1.5 min-w-[240px]"
      >
        <span
          class="section-header w-full text-center mb-1"
          style={{
            color: isVictory ? 'var(--pw-clam)' : 'var(--pw-enemy-light)',
            borderColor: isVictory ? 'rgba(240, 208, 96, 0.2)' : 'rgba(192, 48, 48, 0.2)',
          }}
        >
          Battle Report
        </span>
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

      {/* Map seed for sharing / replay */}
      <p
        class="font-numbers text-xs mt-3 select-all cursor-pointer"
        style={{ color: 'var(--pw-text-muted)' }}
        title="Click to select seed for copying"
      >
        Map Seed: {goMapSeed.value}
      </p>

      {/* Action buttons */}
      <div class="flex gap-4 mt-6">
        <button
          ref={restartButtonRef}
          type="button"
          id="restart-btn"
          class="action-btn px-8 py-3 font-heading text-lg rounded-lg"
          style={{
            color: isVictory ? 'var(--pw-clam)' : 'var(--pw-accent-bright)',
            borderColor: isVictory ? 'var(--pw-otter)' : 'var(--pw-accent)',
          }}
          onClick={props.onRestart}
        >
          Play Again
        </button>
        <button
          type="button"
          class="action-btn px-8 py-3 font-heading text-lg rounded-lg"
          style={{
            color: 'var(--pw-text-secondary)',
            borderColor: 'var(--pw-text-muted)',
          }}
          onClick={handleMainMenu}
        >
          Main Menu
        </button>
      </div>
    </div>
  );
}
