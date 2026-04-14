/**
 * Game Over Overlay
 *
 * Victory/Defeat overlay with animated stat reveal (anime.js stagger),
 * counter-up numbers with tick sounds, performance rating, confetti for
 * victory, "Play Again" (same settings) and "Main Menu" buttons.
 *
 * Design bible: Frame9Slice stat card, font-heading headers,
 * rts-btn action buttons, design token colors.
 */

import { useEffect, useRef } from 'preact/hooks';
import { audio } from '@/audio/audio-system';
import { animateGameOverStats } from '@/rendering/animations';
import { BUILD_STAMP_LABEL } from '@/ui/build-stamp';
import { COLORS } from '@/ui/design-tokens';
import { Frame9Slice } from './components/frame';
import {
  gameState,
  goDesc,
  goLeveledUp,
  goMapSeed,
  goNewLevel,
  goRating,
  goStatLines,
  goTitle,
  goTitleColor,
  goXpEarned,
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
    const colors = [
      'var(--pw-clam)',
      'var(--pw-accent)',
      'var(--pw-food)',
      'var(--pw-success)',
      'var(--pw-otter-light)',
      'var(--pw-warning)',
    ];
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
            color: i < stars ? 'var(--pw-clam)' : COLORS.weatheredSteel,
            textShadow: i < stars ? `0 0 8px var(--pw-victory-glow-40)` : 'none',
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
          ? `radial-gradient(ellipse at 50% 40%, var(--pw-victory-glow-08), var(--pw-overlay-dark) 60%)`
          : `radial-gradient(ellipse at 50% 40%, var(--pw-defeat-glow-10), var(--pw-overlay-dark) 60%)`,
      }}
    >
      {isVictory && <ConfettiDots />}

      <h1
        id="game-over-title"
        aria-live="assertive"
        class={`font-heading text-4xl md:text-6xl mb-3 tracking-widest uppercase ${goTitleColor.value}`}
        style={{
          textShadow: isVictory
            ? `0 0 40px var(--pw-victory-glow-40), 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000`
            : `0 0 40px var(--pw-defeat-glow-40), 2px 2px 0 #000, -1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000`,
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

      {/* Stat card — Frame9Slice */}
      <div ref={statsContainerRef} class="mt-5 min-w-[240px]">
        <Frame9Slice>
          <div class="px-6 py-4 flex flex-col items-center gap-1.5">
            <span
              class="font-heading w-full text-center mb-1 text-sm uppercase tracking-wider"
              style={{
                color: isVictory ? 'var(--pw-clam)' : 'var(--pw-enemy-light)',
                borderBottom: `1px solid ${isVictory ? 'var(--pw-victory-glow-20)' : 'var(--pw-defeat-glow-20)'}`,
                paddingBottom: '4px',
              }}
            >
              Battle Report
            </span>
            {lines.map((line, i) => (
              <p
                key={`stat-${i}`}
                data-stat-line
                class="font-numbers text-sm"
                style={{ opacity: 0, color: COLORS.weatheredSteel }}
              >
                {line}
              </p>
            ))}
          </div>
        </Frame9Slice>
      </div>

      {/* XP earned */}
      {goXpEarned.value > 0 && (
        <div class="mt-3 flex flex-col items-center gap-1">
          <span class="font-heading text-lg font-bold" style={{ color: COLORS.grittyGold }}>
            +{goXpEarned.value} XP
          </span>
          {goLeveledUp.value && (
            <span
              class="font-heading text-sm font-bold"
              style={{ color: 'var(--pw-clam)', textShadow: '0 0 8px var(--pw-victory-glow-40)' }}
            >
              Level Up! Level {goNewLevel.value}
            </span>
          )}
        </div>
      )}

      {/* Map seed for sharing / replay */}
      <p
        class="font-numbers text-xs mt-3 select-all cursor-pointer"
        style={{ color: COLORS.weatheredSteel }}
        title="Click to select seed for copying"
      >
        Map Seed: {goMapSeed.value}
      </p>
      <p
        class="font-numbers text-[10px] mt-1 tracking-[0.14em] uppercase"
        style={{ color: COLORS.weatheredSteel }}
      >
        Build {BUILD_STAMP_LABEL}
      </p>

      {/* Action buttons — rts-btn */}
      <div class="flex gap-4 mt-6">
        <button
          ref={restartButtonRef}
          type="button"
          id="restart-btn"
          class="rts-btn px-8 py-3 font-heading text-lg"
          style={{
            color: isVictory ? 'var(--pw-clam)' : COLORS.grittyGold,
            borderColor: isVictory ? 'var(--pw-otter)' : COLORS.goldDim,
          }}
          onClick={props.onRestart}
        >
          Play Again
        </button>
        <button
          type="button"
          class="rts-btn px-8 py-3 font-heading text-lg"
          style={{
            color: COLORS.weatheredSteel,
            borderColor: COLORS.weatheredSteel,
          }}
          onClick={handleMainMenu}
        >
          Main Menu
        </button>
      </div>
    </div>
  );
}
