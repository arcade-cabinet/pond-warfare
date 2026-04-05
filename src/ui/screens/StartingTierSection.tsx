/**
 * Starting Tier Section (v3.1 — US6)
 *
 * Shows current starting tier and an upgrade button.
 * Ranks: Basic(free) -> Enhanced(20P) -> ... -> Mythic(2560P).
 */

import { getPearlUpgrade } from '@/config/config-loader';
import {
  getCostForRank,
  getStartingTierName,
  getStartingTierRank,
  type PrestigeState,
  STARTING_TIER_NAMES,
} from '@/config/prestige-logic';
import { COLORS } from '@/ui/design-tokens';

export interface StartingTierSectionProps {
  prestigeState: PrestigeState;
  onPurchase: () => void;
}

export function StartingTierSection({ prestigeState, onPurchase }: StartingTierSectionProps) {
  const currentRank = getStartingTierRank(prestigeState);
  const currentName = getStartingTierName(currentRank);
  const isMaxed = currentRank >= 8;

  let nextCost = 0;
  let nextName = '';
  let canAfford = false;

  if (!isMaxed) {
    const def = getPearlUpgrade('starting_tier');
    nextCost = getCostForRank(def, currentRank);
    nextName = getStartingTierName(currentRank + 1);
    canAfford = prestigeState.pearls >= nextCost;
  }

  const pct = (currentRank / 8) * 100;

  return (
    <div>
      <h2
        class="font-heading text-sm uppercase tracking-wider mb-2"
        style={{ color: COLORS.grittyGold }}
      >
        Starting Tier
      </h2>
      <p class="font-game text-xs mb-2" style={{ color: COLORS.weatheredSteel }}>
        Start each run at a higher upgrade tier. All Clam web nodes up to this tier are free.
      </p>

      {/* Current tier display */}
      <div class="flex items-center gap-3 mb-2">
        <span class="font-heading text-base" style={{ color: COLORS.sepiaText }}>
          {currentName}
        </span>
        {isMaxed && (
          <span class="font-game text-[10px] px-1 rounded" style={{ color: COLORS.mossGreen }}>
            MAX
          </span>
        )}
      </div>

      {/* Progress bar */}
      <div class="flex items-center gap-2 mb-3">
        <div
          class="flex-1 h-2 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <div
            class="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: isMaxed ? COLORS.mossGreen : COLORS.grittyGold,
            }}
          />
        </div>
        <span class="font-numbers text-[10px]" style={{ color: COLORS.weatheredSteel }}>
          {currentRank}/8
        </span>
      </div>

      {/* Tier name labels */}
      <div class="flex gap-1 mb-3 overflow-x-auto pb-1">
        {STARTING_TIER_NAMES.map((name, i) => (
          <span
            key={name}
            class="font-game text-[8px] px-1.5 py-0.5 rounded whitespace-nowrap"
            style={{
              color: i <= currentRank ? COLORS.sepiaText : COLORS.weatheredSteel,
              background:
                i === currentRank
                  ? 'rgba(197,160,89,0.2)'
                  : i < currentRank
                    ? 'rgba(74,222,128,0.1)'
                    : 'transparent',
              border:
                i === currentRank ? `1px solid ${COLORS.grittyGold}` : '1px solid transparent',
            }}
          >
            {name}
          </span>
        ))}
      </div>

      {/* Purchase button */}
      {!isMaxed && (
        <button
          type="button"
          class="rts-btn px-4 py-2 font-heading text-sm w-full"
          style={{
            color: canAfford ? 'var(--pw-pearl, #c4b5fd)' : COLORS.weatheredSteel,
            borderColor: canAfford ? 'var(--pw-pearl, #c4b5fd)' : COLORS.weatheredSteel,
            opacity: canAfford ? 1 : 0.4,
            cursor: canAfford ? 'pointer' : 'not-allowed',
            minHeight: '44px',
          }}
          onClick={onPurchase}
          disabled={!canAfford}
          aria-label={`Upgrade to ${nextName} for ${nextCost} Pearls`}
        >
          Upgrade to {nextName} — {nextCost}P
        </button>
      )}
    </div>
  );
}
