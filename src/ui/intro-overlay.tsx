/**
 * Intro Overlay
 *
 * Splash screen: "POND WARFARE" logo with branded typography,
 * tagline, controls hint, water ripple animation, atmospheric dark pond
 * background. Title slides in via anime.js, then fades out after 1.5s.
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import { animateIntroSubtitle, animateIntroTitle } from '@/rendering/animations';

export function IntroOverlay() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);
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

    const timer = setTimeout(() => {
      setFading(true);
    }, 1500);

    const removeTimer = setTimeout(() => {
      setVisible(false);
    }, 3500); // 1.5s wait + 2s fade

    return () => {
      clearTimeout(timer);
      clearTimeout(removeTimer);
    };
  }, []);

  if (!visible) return null;

  return (
    <div
      id="intro-overlay"
      class={`absolute inset-0 z-50 flex flex-col items-center justify-center transition-opacity duration-[2000ms] pointer-events-none ${
        fading ? 'opacity-0' : 'opacity-100'
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

      <p
        class="font-game text-xs mt-6 text-center px-4 hidden md:block relative z-10 animate-begin-glow"
        style={{ color: 'var(--pw-accent)' }}
      >
        Right-click to command &bull; WASD to scroll &bull; Ctrl+# to set groups
      </p>
      <p
        class="font-game text-xs mt-6 text-center px-4 md:hidden relative z-10 animate-begin-glow"
        style={{ color: 'var(--pw-accent)' }}
      >
        Long-press to command &bull; Two-finger pan &bull; Pinch to zoom
      </p>
    </div>
  );
}
