/**
 * OnboardingHint — first-time floating hint near the Lodge.
 *
 * Shows "Tap Lodge to train units. Tap terrain to send them."
 * for 5 seconds on first launch. Uses localStorage to track if shown.
 * Styled with design tokens (font-heading, grittyGold).
 */

import { useEffect, useState } from 'preact/hooks';
import { gameState } from '../store';

const STORAGE_KEY = 'pw_onboarding_shown';
const DISPLAY_MS = 5000;

export function OnboardingHint() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (gameState.value !== 'playing') return;

    try {
      if (localStorage.getItem(STORAGE_KEY)) return;
    } catch {
      return;
    }

    setVisible(true);

    try {
      localStorage.setItem(STORAGE_KEY, '1');
    } catch {
      // Storage unavailable — show hint anyway
    }

    const timer = setTimeout(() => setVisible(false), DISPLAY_MS);
    return () => clearTimeout(timer);
  }, []);

  if (!visible) return null;

  return (
    <div
      class="absolute z-30 pointer-events-none"
      style={{
        bottom: '50%',
        left: '50%',
        transform: 'translate(-50%, 50%)',
      }}
    >
      <div
        class="font-heading text-sm px-4 py-2 rounded-lg"
        style={{
          color: 'var(--pw-gold)',
          background: 'var(--pw-overlay-75)',
          border: '1px solid var(--pw-gold-dim)',
          textAlign: 'center',
          whiteSpace: 'nowrap',
          animation: 'fadeInOut 5s ease-in-out forwards',
        }}
      >
        Tap Lodge to train units. Tap terrain to send them.
      </div>
      <style>{`
        @keyframes fadeInOut {
          0% { opacity: 0; transform: translateY(10px); }
          10% { opacity: 1; transform: translateY(0); }
          80% { opacity: 1; transform: translateY(0); }
          100% { opacity: 0; transform: translateY(-10px); }
        }
      `}</style>
    </div>
  );
}
