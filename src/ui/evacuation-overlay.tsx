/**
 * Evacuation Overlay
 *
 * Full-screen overlay shown when the Commander is evacuated due to
 * overwhelming forces. Offers checkpoint restore, restart, or quit.
 */

import { checkpointCount, evacuationActive, permadeathEnabled, selectedDifficulty } from './store';

export interface EvacuationOverlayProps {
  onChoice: (choice: 'checkpoint' | 'restart' | 'quit') => void;
}

export function EvacuationOverlay(props: EvacuationOverlayProps) {
  if (!evacuationActive.value) return null;

  const diff = selectedDifficulty.value;
  const hasCheckpoints = checkpointCount.value > 0;
  const isNightmare = diff === 'nightmare';
  const isUltraOrPermadeath = diff === 'ultraNightmare' || permadeathEnabled.value;

  // Ultra Nightmare / permadeath: only quit
  // Nightmare: no checkpoint, only restart or quit
  const showCheckpoint = hasCheckpoints && !isNightmare && !isUltraOrPermadeath;
  const showRestart = !isUltraOrPermadeath;

  return (
    <div
      class="absolute inset-0 flex flex-col items-center justify-center z-50"
      style={{
        background: `radial-gradient(ellipse at 50% 40%, var(--pw-defeat-glow-15), var(--pw-overlay-92) 60%)`,
        backdropFilter: 'blur(4px)',
      }}
    >
      <h1
        class="font-title text-3xl md:text-5xl mb-2 tracking-widest uppercase"
        style={{
          color: 'var(--pw-warning)',
          textShadow: `0 0 30px var(--pw-achieve-glow-40), 2px 2px 0 #000, -1px -1px 0 #000`,
        }}
      >
        COMMANDER EVACUATED
      </h1>

      <p class="font-heading text-lg md:text-xl mb-6" style={{ color: 'var(--pw-text-secondary)' }}>
        Your forces have been overwhelmed.
      </p>

      {isUltraOrPermadeath && (
        <p class="font-heading text-sm mb-4" style={{ color: 'var(--pw-enemy-light)' }}>
          Permadeath active. Your save has been deleted.
        </p>
      )}

      <div class="flex flex-col gap-3 min-w-[200px]">
        {showCheckpoint && (
          <button
            type="button"
            class="action-btn px-6 py-3 font-heading text-base rounded-lg"
            style={{
              color: 'var(--pw-success)',
              borderColor: 'var(--pw-success)',
            }}
            onClick={() => props.onChoice('checkpoint')}
          >
            Return to Checkpoint
          </button>
        )}

        {showRestart && (
          <button
            type="button"
            class="action-btn px-6 py-3 font-heading text-base rounded-lg"
            style={{
              color: 'var(--pw-accent-bright)',
              borderColor: 'var(--pw-accent)',
            }}
            onClick={() => props.onChoice('restart')}
          >
            Start Over
          </button>
        )}

        <button
          type="button"
          class="action-btn px-6 py-3 font-heading text-base rounded-lg"
          style={{
            color: 'var(--pw-text-muted)',
            borderColor: 'var(--pw-text-muted)',
          }}
          onClick={() => props.onChoice('quit')}
        >
          Quit to Menu
        </button>
      </div>
    </div>
  );
}
