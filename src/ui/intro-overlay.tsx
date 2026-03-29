/**
 * Intro Overlay
 *
 * Splash screen: "POND WARFARE" title, subtitle, controls hint.
 * Title slides in via anime.js, then fades out after 1.5s.
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
      class={`absolute inset-0 bg-black z-50 flex flex-col items-center justify-center transition-opacity duration-[2000ms] pointer-events-none ${
        fading ? 'opacity-0' : 'opacity-100'
      }`}
    >
      <h1
        ref={titleRef}
        class="text-4xl md:text-6xl font-black text-sky-400 mb-4 tracking-widest uppercase"
        style={{ opacity: 0 }}
      >
        Pond Warfare
      </h1>
      <p
        ref={subtitleRef}
        class="text-sm md:text-xl text-slate-300 font-bold text-center px-4"
        style={{ opacity: 0 }}
      >
        Establish your economy before the predators arrive.
      </p>
      <p class="text-xs text-slate-500 mt-4 text-center px-4 hidden md:block">
        Right-click to command &bull; WASD to scroll &bull; Ctrl+# to set groups
      </p>
      <p class="text-xs text-slate-500 mt-4 text-center px-4 md:hidden">
        Long-press to command &bull; Two-finger pan &bull; Pinch to zoom
      </p>
    </div>
  );
}
