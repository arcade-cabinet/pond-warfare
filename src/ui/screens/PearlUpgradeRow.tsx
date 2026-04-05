/**
 * PearlUpgradeRow -- Single Pearl upgrade row for accordion content.
 *
 * Shows upgrade name, description, rank progress, and a BUY button.
 * Used inside the compact Pearl Loadout modal's PondAccordion sections.
 */

import type { PearlUpgradeDisplay } from '@/config/prestige-logic';
import { COLORS } from '@/ui/design-tokens';

export interface PearlUpgradeRowProps {
  upgrade: PearlUpgradeDisplay;
  onPurchase: (id: string) => void;
  pearls: number;
}

export function PearlUpgradeRow({ upgrade, onPurchase, pearls }: PearlUpgradeRowProps) {
  const canAfford = !upgrade.isMaxed && pearls >= upgrade.costPerRank;
  const pct = upgrade.maxRank > 0 ? (upgrade.currentRank / upgrade.maxRank) * 100 : 0;

  return (
    <div class="py-2 px-1 flex flex-col gap-2">
      <div>
        <span class="font-heading text-sm" style={{ color: COLORS.sepiaText }}>
          {upgrade.label}
        </span>
        <div class="font-game text-xs mt-1" style={{ color: COLORS.weatheredSteel }}>
          {upgrade.effectSummary || upgrade.description}
        </div>
      </div>

      {/* Rank progress bar */}
      <div class="flex items-center gap-2">
        <div
          class="flex-1 h-1.5 rounded-full overflow-hidden"
          style={{ background: 'rgba(255,255,255,0.08)' }}
        >
          <div
            class="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: upgrade.isMaxed ? COLORS.mossGreen : 'var(--pw-pearl, #c4b5fd)',
            }}
          />
        </div>
        <span class="font-numbers text-[10px]" style={{ color: COLORS.weatheredSteel }}>
          {upgrade.currentRank}/{upgrade.maxRank}
        </span>
      </div>

      {/* Buy button */}
      {!upgrade.isMaxed && (
        <button
          type="button"
          class="rts-btn w-full py-2 font-heading text-sm"
          style={{
            color: canAfford ? 'var(--pw-pearl, #c4b5fd)' : '#c44',
            borderColor: canAfford ? 'var(--pw-pearl, #c4b5fd)' : COLORS.weatheredSteel,
            opacity: canAfford ? 1 : 0.6,
            cursor: canAfford ? 'pointer' : 'not-allowed',
            minHeight: '44px',
          }}
          onClick={() => canAfford && onPurchase(upgrade.id)}
          disabled={!canAfford}
          aria-label={`Buy ${upgrade.label} for ${upgrade.costPerRank} Pearls`}
        >
          {canAfford ? `Buy -- ${upgrade.costPerRank}P` : `${upgrade.costPerRank}P (not enough)`}
        </button>
      )}
    </div>
  );
}
