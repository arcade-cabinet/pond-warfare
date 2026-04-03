/**
 * SplashVideo — Plays the brand splash video before a new game starts.
 *
 * Shows after clicking START GAME (not on Continue).
 * Orientation-aware: 16:9 landscape, 9:16 portrait.
 * Tap/click or Escape to skip. Auto-advances when video ends.
 */

import { useCallback, useEffect, useRef } from 'preact/hooks';
import { screenClass } from '@/platform';

const BASE = '/pond-warfare/assets/video';

interface SplashVideoProps {
  onComplete: () => void;
}

export function SplashVideo({ onComplete }: SplashVideoProps) {
  const videoRef = useRef<HTMLVideoElement>(null);

  // Pick orientation-appropriate video
  const isPortrait = typeof window !== 'undefined' && window.innerHeight > window.innerWidth;
  const src = isPortrait ? `${BASE}/splash-9x16.mp4` : `${BASE}/splash-16x9.mp4`;

  const handleSkip = useCallback(() => {
    onComplete();
  }, [onComplete]);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape' || e.key === ' ' || e.key === 'Enter') {
        handleSkip();
      }
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [handleSkip]);

  // Auto-play the video (works after user interaction — they just clicked START)
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.play().catch(() => {
        // Autoplay blocked — skip to game
        onComplete();
      });
    }
  }, [onComplete]);

  const compact = screenClass.value === 'compact';

  return (
    <div
      class="fixed inset-0 flex items-center justify-center bg-black"
      style={{ zIndex: 'var(--pw-z-loading, 100)' }}
      onClick={handleSkip}
      onTouchEnd={handleSkip}
    >
      <video
        ref={videoRef}
        src={src}
        muted={false}
        playsInline
        onEnded={onComplete}
        style={{
          maxWidth: '100%',
          maxHeight: '100%',
          objectFit: 'contain',
        }}
      />
      <button
        type="button"
        class="absolute font-heading text-xs tracking-wider uppercase"
        style={{
          bottom: compact ? '20px' : '40px',
          right: compact ? '20px' : '40px',
          color: 'var(--pw-steel, #6B7D8B)',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          opacity: 0.7,
        }}
        onClick={(e) => {
          e.stopPropagation();
          handleSkip();
        }}
      >
        Skip &gt;
      </button>
    </div>
  );
}
