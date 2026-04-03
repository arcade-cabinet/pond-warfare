/**
 * Rank Up Modal (v3.0 — US14)
 *
 * Shows when player taps "RANK UP" on the rewards screen.
 * Displays: Pearls to earn, what resets, what persists.
 * Confirm -> execute prestige, back to main menu.
 *
 * Design bible: Frame9Slice wrapper, font-heading headers,
 * rts-btn buttons, design token colors.
 */

import { useCallback, useMemo, useState } from 'preact/hooks';
import {
  canPrestige,
  executePrestige,
  nextPrestigeThreshold,
  type PrestigeResult,
  type PrestigeState,
  pearlsForPrestige,
} from '@/config/prestige-logic';
import { Frame9Slice } from '@/ui/components/frame';
import { COLORS } from '@/ui/design-tokens';

export interface RankUpModalProps {
  prestigeState: PrestigeState;
  progressionLevel: number;
  onConfirm: (result: PrestigeResult, newState: PrestigeState) => void;
  onCancel: () => void;
}

export function RankUpModal({
  prestigeState,
  progressionLevel,
  onConfirm,
  onCancel,
}: RankUpModalProps) {
  const [confirmed, setConfirmed] = useState(false);

  const pearlsToEarn = useMemo(
    () => pearlsForPrestige(progressionLevel, prestigeState.rank),
    [progressionLevel, prestigeState.rank],
  );

  const threshold = useMemo(() => nextPrestigeThreshold(prestigeState.rank), [prestigeState.rank]);

  const eligible = useMemo(
    () => canPrestige(progressionLevel, prestigeState.rank),
    [progressionLevel, prestigeState.rank],
  );

  const handleConfirm = useCallback(() => {
    if (confirmed || !eligible) return;
    setConfirmed(true);
    const { state: newState, result } = executePrestige(prestigeState, progressionLevel);
    onConfirm(result, newState);
  }, [confirmed, eligible, prestigeState, progressionLevel, onConfirm]);

  const newRank = prestigeState.rank + 1;

  return (
    <div
      class="absolute inset-0 flex items-center justify-center z-40"
      style={{
        background:
          'radial-gradient(ellipse at 50% 40%, rgba(197,160,89,0.1), rgba(0,0,0,0.85) 60%)',
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby="rank-up-title"
    >
      <div class="w-[340px] max-w-[90vw]">
        <Frame9Slice>
          <div class="px-6 py-5 flex flex-col items-center gap-3">
            {/* Title */}
            <h2
              id="rank-up-title"
              class="font-heading text-2xl tracking-widest uppercase"
              style={{
                color: COLORS.grittyGold,
                textShadow: '0 0 20px rgba(197,160,89,0.4)',
              }}
            >
              RANK UP
            </h2>

            {/* Current -> New rank */}
            <div class="flex items-center gap-3">
              <span class="font-heading text-lg" style={{ color: COLORS.weatheredSteel }}>
                Rank {prestigeState.rank}
              </span>
              <span
                class="font-heading text-lg"
                style={{ color: COLORS.grittyGold }}
                aria-hidden="true"
              >
                {'\u2192'}
              </span>
              <span
                class="font-heading text-xl font-bold"
                style={{ color: COLORS.grittyGold, textShadow: '0 0 8px rgba(197,160,89,0.3)' }}
              >
                Rank {newRank}
              </span>
            </div>

            {/* Pearl reward */}
            <div
              class="w-full text-center py-2 rounded"
              style={{ background: 'rgba(197,160,89,0.1)' }}
            >
              <span class="font-heading text-sm" style={{ color: COLORS.weatheredSteel }}>
                Pearls Earned
              </span>
              <div
                class="font-numbers text-2xl font-bold mt-1"
                style={{ color: 'var(--pw-pearl, #e0d4f5)' }}
              >
                +{pearlsToEarn}
              </div>
            </div>

            {/* What resets */}
            <div class="w-full">
              <span
                class="font-heading text-xs uppercase tracking-wider"
                style={{ color: COLORS.bloodRed }}
              >
                Resets
              </span>
              <ul class="mt-1 space-y-0.5">
                <li class="font-game text-xs" style={{ color: COLORS.weatheredSteel }}>
                  All Clam upgrades reset to zero
                </li>
                <li class="font-game text-xs" style={{ color: COLORS.weatheredSteel }}>
                  Current match progress cleared
                </li>
                <li class="font-game text-xs" style={{ color: COLORS.weatheredSteel }}>
                  Difficulty baseline increases
                </li>
              </ul>
            </div>

            {/* What persists */}
            <div class="w-full">
              <span
                class="font-heading text-xs uppercase tracking-wider"
                style={{ color: COLORS.mossGreen }}
              >
                Keeps
              </span>
              <ul class="mt-1 space-y-0.5">
                <li class="font-game text-xs" style={{ color: COLORS.weatheredSteel }}>
                  All Pearl upgrades remain active
                </li>
                <li class="font-game text-xs" style={{ color: COLORS.weatheredSteel }}>
                  Prestige rank (permanent)
                </li>
                <li class="font-game text-xs" style={{ color: COLORS.weatheredSteel }}>
                  Total Pearls earned (stat)
                </li>
              </ul>
            </div>

            {/* Progression info */}
            {!eligible && (
              <div
                class="w-full text-center py-1 rounded text-xs font-game"
                style={{ color: COLORS.grittyGold, background: 'rgba(197,160,89,0.08)' }}
              >
                Need progression level {threshold} (current: {progressionLevel})
              </div>
            )}

            {/* Buttons — rts-btn */}
            <div class="flex gap-3 mt-2 w-full">
              <button
                type="button"
                class="rts-btn flex-1 font-heading text-sm"
                style={{
                  color: COLORS.weatheredSteel,
                  borderColor: COLORS.weatheredSteel,
                }}
                onClick={onCancel}
              >
                Cancel
              </button>
              <button
                type="button"
                class="rts-btn flex-1 font-heading text-sm"
                style={{
                  color: eligible ? COLORS.grittyGold : COLORS.weatheredSteel,
                  borderColor: eligible ? COLORS.grittyGold : COLORS.weatheredSteel,
                  opacity: eligible && !confirmed ? 1 : 0.5,
                  cursor: eligible && !confirmed ? 'pointer' : 'not-allowed',
                }}
                onClick={handleConfirm}
                disabled={!eligible || confirmed}
                aria-label={`Confirm rank up to rank ${newRank}`}
              >
                {confirmed ? 'Ranking Up...' : 'Confirm'}
              </button>
            </div>
          </div>
        </Frame9Slice>
      </div>
    </div>
  );
}
