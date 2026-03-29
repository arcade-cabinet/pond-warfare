/**
 * Intro Overlay
 *
 * Splash screen: "POND WARFARE" title, subtitle, controls hint.
 * Fades out after 1.5s.
 */

import { useEffect, useState } from 'preact/hooks';

export function IntroOverlay() {
  const [visible, setVisible] = useState(true);
  const [fading, setFading] = useState(false);

  useEffect(() => {
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
      <h1 class="text-4xl md:text-6xl font-black text-sky-400 mb-4 tracking-widest uppercase">
        Pond Warfare
      </h1>
      <p class="text-sm md:text-xl text-slate-300 font-bold text-center px-4">
        Establish your economy before the predators arrive.
      </p>
      <p class="text-xs text-slate-500 mt-4 text-center px-4">
        Right-click to command &bull; WASD to scroll &bull; Ctrl+# to set groups
      </p>
    </div>
  );
}
