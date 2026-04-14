/**
 * OnboardingHint — first-session contextual coach for the first live match.
 *
 * Replaces the old timed one-shot tooltip with a lightweight 3-step flow:
 * 1. Train from the Lodge
 * 2. Select and command a Mudpaw
 * 3. Hold through the first pressure spike
 *
 * Progress is action-driven and completion/dismissal is persisted locally.
 */

import { useEffect, useRef, useState } from 'preact/hooks';
import {
  baseThreatCount,
  gameState,
  globalProductionQueue,
  hasPlayerUnits,
  selectionCount,
  unitRoster,
  waveNumber,
} from '../store';

const STORAGE_KEY = 'pw_onboarding_v2';

const STEPS = [
  {
    title: 'Train From the Lodge',
    body: 'Use the Lodge to field Mudpaws. Mudpaws gather, build, fight, and scout. Spend Fish to queue one now.',
  },
  {
    title: 'Command Your Mudpaws',
    body: 'Select a Mudpaw, then tap terrain to move. Tap a node, enemy, or building when you want a direct order instead of free movement.',
  },
  {
    title: 'Hold The First Wave',
    body: 'Watch Fish, Logs, Rocks, and Food while you build up. The coach clears itself once the first real pressure arrives.',
  },
] as const;

function getGeneralistCount(): number {
  return unitRoster.value
    .filter((group) => group.role === 'generalist')
    .reduce((sum, group) => sum + group.units.length, 0);
}

function persistOnboardingState(state: 'dismissed' | 'complete'): void {
  try {
    localStorage.setItem(STORAGE_KEY, state);
  } catch {
    // Storage unavailable; treat onboarding as session-only.
  }
}

function shouldSuppressOnboarding(): boolean {
  try {
    return localStorage.getItem(STORAGE_KEY) !== null;
  } catch {
    return false;
  }
}

export function OnboardingHint() {
  const [active, setActive] = useState(false);
  const [stepIndex, setStepIndex] = useState(0);
  const initialQueueCount = useRef(0);
  const initialGeneralistCount = useRef(0);

  useEffect(() => {
    if (gameState.value !== 'playing') return;
    if (shouldSuppressOnboarding()) return;

    initialQueueCount.current = globalProductionQueue.value.length;
    initialGeneralistCount.current = getGeneralistCount();
    setStepIndex(0);
    setActive(true);
  }, [gameState.value]);

  useEffect(() => {
    if (!active) return;

    const trainedUnit =
      globalProductionQueue.value.length > initialQueueCount.current ||
      getGeneralistCount() > initialGeneralistCount.current;
    const selectedPlayerUnits = hasPlayerUnits.value && selectionCount.value > 0;
    const firstPressureArrived = waveNumber.value > 0 || baseThreatCount.value > 0;

    if (stepIndex === 0 && trainedUnit) {
      setStepIndex(1);
      return;
    }
    if (stepIndex === 1 && selectedPlayerUnits) {
      setStepIndex(2);
      return;
    }
    if (stepIndex === 2 && firstPressureArrived) {
      persistOnboardingState('complete');
      setActive(false);
    }
  }, [
    active,
    stepIndex,
    globalProductionQueue.value.length,
    unitRoster.value,
    hasPlayerUnits.value,
    selectionCount.value,
    waveNumber.value,
    baseThreatCount.value,
  ]);

  if (!active) return null;

  const step = STEPS[stepIndex];

  return (
    <div
      class="absolute z-30"
      style={{
        top: '72px',
        left: '16px',
        right: '16px',
        display: 'flex',
        justifyContent: 'center',
        pointerEvents: 'none',
      }}
    >
      <div
        class="onboarding-hint-enter rounded-xl px-4 py-3 shadow-lg"
        style={{
          width: 'min(420px, 100%)',
          color: 'var(--pw-text-primary)',
          background: 'linear-gradient(180deg, rgba(13, 19, 18, 0.96), rgba(18, 27, 25, 0.92))',
          border: '1px solid var(--pw-gold-dim)',
          boxShadow: '0 10px 24px rgba(0, 0, 0, 0.35)',
          pointerEvents: 'auto',
        }}
      >
        <div class="flex items-center justify-between gap-3" style={{ marginBottom: '8px' }}>
          <div class="font-heading text-sm" style={{ color: 'var(--pw-gold)' }}>
            First Match Guide
          </div>
          <button
            type="button"
            class="rts-btn"
            style={{ minHeight: '32px', minWidth: '32px', padding: '4px 10px', fontSize: '11px' }}
            onClick={() => {
              persistOnboardingState('dismissed');
              setActive(false);
            }}
          >
            Hide
          </button>
        </div>

        <div class="font-heading text-base" style={{ marginBottom: '6px' }}>
          {step.title}
        </div>
        <div class="text-sm leading-relaxed" style={{ color: 'var(--pw-text-secondary)' }}>
          {step.body}
        </div>

        <div class="flex items-center justify-between gap-3" style={{ marginTop: '12px' }}>
          <div class="text-xs" style={{ color: 'var(--pw-text-dim)' }}>
            Step {stepIndex + 1} of {STEPS.length}
          </div>
          <div class="flex items-center gap-2" aria-hidden="true">
            {STEPS.map((_, idx) => (
              <span
                key={idx}
                style={{
                  width: '8px',
                  height: '8px',
                  borderRadius: '999px',
                  background: idx === stepIndex ? 'var(--pw-gold)' : 'rgba(197, 160, 89, 0.25)',
                  display: 'inline-block',
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
