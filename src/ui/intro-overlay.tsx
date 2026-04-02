/**
 * Intro Overlay
 *
 * Splash screen: "POND WARFARE" logo with branded typography,
 * tagline, controls hint, water ripple animation, atmospheric dark pond
 * background. Title slides in via anime.js, then fades out after click.
 * Includes a difficulty selector (Easy / Normal / Hard).
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import { screenClass } from '@/platform';
import { animateIntroSubtitle, animateIntroTitle } from '@/rendering/animations';
import { customMapSeed, type DifficultyLevel, selectedDifficulty } from '@/ui/store';

const DIFFICULTY_OPTIONS: {
  key: DifficultyLevel;
  label: string;
  desc: string;
  tint: string;
  borderColor: string;
}[] = [
  {
    key: 'easy',
    label: 'EASY',
    desc: 'Relaxed pace, weaker enemies',
    tint: 'rgba(34, 197, 94, 0.15)',
    borderColor: 'var(--pw-difficulty-easy)',
  },
  {
    key: 'normal',
    label: 'NORMAL',
    desc: 'Balanced challenge',
    tint: 'rgba(64, 200, 208, 0.15)',
    borderColor: 'var(--pw-accent)',
  },
  {
    key: 'hard',
    label: 'HARD',
    desc: 'Aggressive AI, scarce resources',
    tint: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'var(--pw-difficulty-hard)',
  },
];

export function IntroOverlay() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('normal');
  const [seedInput, setSeedInput] = useState('');
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    // Trigger anime.js slide-in animations
    if (titleRef.current) {
      animateIntroTitle(titleRef.current);
    }
    if (subtitleRef.current) {
      animateIntroSubtitle(subtitleRef.current);
    }
  }, []);

  if (!visible) return null;

  const handleBegin = () => {
    if (fading) return;
    selectedDifficulty.value = difficulty;
    customMapSeed.value = seedInput.trim();
    setFading(true);
    setTimeout(() => {
      setVisible(false);
    }, 2000);
  };

  return (
    <div
      id="intro-overlay"
      class={`absolute inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-[2000ms] ${
        fading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
      style={{
        background: 'radial-gradient(ellipse at 50% 60%, #132830 0%, #0c1a1f 50%, #060e12 100%)',
      }}
    >
      {/* Water ripple rings behind the title */}
      <div class="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        <div class="water-ripple" />
        <div class="water-ripple" />
        <div class="water-ripple" />
      </div>

      {/* Subtle vignette overlay */}
      <div
        class="absolute inset-0 pointer-events-none"
        style={{
          background: 'radial-gradient(ellipse at center, transparent 30%, rgba(0,0,0,0.6) 100%)',
        }}
      />

      <h1
        ref={titleRef}
        class="mb-2 tracking-widest uppercase text-center relative z-10"
        style={{ opacity: 0 }}
      >
        <span class="logo-pond block text-4xl md:text-7xl leading-tight">Pond</span>
        <span class="logo-warfare block text-3xl md:text-6xl leading-tight mt-2">Warfare</span>
      </h1>

      <p
        class="font-heading text-sm md:text-lg mt-4 tracking-wider relative z-10"
        style={{ color: 'var(--pw-text-muted)' }}
      >
        Defend the Pond. Conquer the Wild.
      </p>

      <p
        ref={subtitleRef}
        class="font-game text-sm md:text-xl mt-4 font-bold text-center px-4 relative z-10"
        style={{ opacity: 0, color: 'var(--pw-text-secondary)' }}
      >
        Establish your economy before the predators arrive.
      </p>

      {/* Difficulty selector */}
      <div class="flex gap-3 mt-6 relative z-10 px-4">
        {DIFFICULTY_OPTIONS.map((opt) => {
          const isSelected = difficulty === opt.key;
          return (
            <button
              key={opt.key}
              type="button"
              class="action-btn"
              onClick={(e) => {
                e.stopPropagation();
                setDifficulty(opt.key);
              }}
              style={{
                minHeight: '44px',
                minWidth: '90px',
                padding: '8px 12px',
                background: isSelected ? opt.tint : 'rgba(20, 30, 35, 0.8)',
                border: isSelected
                  ? `2px solid ${opt.borderColor}`
                  : '2px solid var(--pw-stone-dark, #3a3a3a)',
                borderRadius: '6px',
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: isSelected
                  ? `0 0 12px ${opt.borderColor}40, inset 0 1px 0 rgba(255,255,255,0.05)`
                  : 'inset 0 1px 0 rgba(255,255,255,0.03)',
              }}
            >
              <span
                class="font-heading font-bold text-xs md:text-sm tracking-wider"
                style={{
                  color: isSelected ? opt.borderColor : 'var(--pw-text-muted)',
                }}
              >
                {opt.label}
              </span>
              <span
                class="font-game text-[10px] md:text-xs mt-1"
                style={{
                  color: isSelected ? 'var(--pw-text-secondary)' : 'var(--pw-text-muted)',
                  opacity: isSelected ? 1 : 0.6,
                }}
              >
                {opt.desc}
              </span>
            </button>
          );
        })}
      </div>

      {/* Map seed input */}
      <div class="flex items-center gap-2 mt-4 relative z-10">
        <label
          htmlFor="map-seed-input"
          class="font-numbers text-xs"
          style={{ color: 'var(--pw-text-muted)' }}
        >
          Seed:
        </label>
        <input
          id="map-seed-input"
          type="text"
          placeholder="Random"
          value={seedInput}
          onInput={(e) => setSeedInput((e.target as HTMLInputElement).value)}
          onKeyDown={(e) => {
            // Prevent keyboard shortcuts from firing while typing
            e.stopPropagation();
            if (e.key === 'Enter') handleBegin();
          }}
          class="font-numbers text-xs px-2 py-1 rounded"
          style={{
            width: '140px',
            background: 'rgba(20, 30, 35, 0.8)',
            border: '1px solid var(--pw-stone-dark, #3a3a3a)',
            color: 'var(--pw-text-secondary)',
            outline: 'none',
          }}
        />
      </div>

      {/* Click to begin */}
      <button
        type="button"
        class="font-game text-sm md:text-lg mt-6 font-bold text-center px-6 py-3 relative z-10 animate-begin-glow"
        style={{
          color: 'var(--pw-accent)',
          background: 'transparent',
          border: '1px solid var(--pw-accent-dim)',
          borderRadius: '6px',
          cursor: 'pointer',
          minHeight: '44px',
        }}
        onClick={handleBegin}
      >
        Click to Begin
      </button>

      <p
        class="font-game text-xs mt-4 text-center px-4 relative z-10"
        style={{ color: 'var(--pw-text-muted)' }}
      >
        {screenClass.value === 'compact'
          ? 'Long-press to command \u2022 Two-finger pan \u2022 Pinch to zoom'
          : 'Right-click to command \u2022 WASD to scroll \u2022 Ctrl+# to set groups'}
      </p>
    </div>
  );
}
