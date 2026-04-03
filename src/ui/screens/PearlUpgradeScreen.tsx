/**
 * Pearl Upgrade Screen (v3.0 — US15)
 *
 * Full-screen screen accessible from main menu for spending Pearls.
 * Shows all Pearl upgrades from prestige.json with current rank and cost.
 * Categories: Auto-Deploy, Auto-Behavior, Multipliers.
 */

import { useCallback, useMemo, useState } from 'preact/hooks';
import {
  getPearlUpgradeDisplayList,
  type PearlUpgradeDisplay,
  type PrestigeState,
  purchasePearlUpgrade,
} from '@/config/prestige-logic';
import { Frame9Slice } from '@/ui/components/frame';

export interface PearlUpgradeScreenProps {
  prestigeState: PrestigeState;
  onStateChange: (newState: PrestigeState) => void;
  onBack: () => void;
}

type UpgradeCategory = 'auto_deploy' | 'auto_behavior' | 'multiplier';

interface CategoryInfo {
  key: UpgradeCategory;
  label: string;
  description: string;
}

const CATEGORIES: CategoryInfo[] = [
  { key: 'auto_deploy', label: 'Auto-Deploy', description: 'Specialists spawn at match start' },
  { key: 'auto_behavior', label: 'Automations', description: 'Permanent passive abilities' },
  { key: 'multiplier', label: 'Multipliers', description: 'Permanent stat boosts' },
];

function categorizeUpgrade(upgrade: PearlUpgradeDisplay): UpgradeCategory {
  if (upgrade.id.startsWith('auto_deploy_')) return 'auto_deploy';
  if (upgrade.id.endsWith('_behavior')) return 'auto_behavior';
  return 'multiplier';
}

function UpgradeRow({
  upgrade,
  onPurchase,
}: {
  upgrade: PearlUpgradeDisplay;
  onPurchase: (id: string) => void;
}) {
  const pct = upgrade.maxRank > 0 ? (upgrade.currentRank / upgrade.maxRank) * 100 : 0;

  return (
    <div
      class="flex items-center gap-2 py-2 px-3 rounded"
      style={{
        background: upgrade.isMaxed
          ? 'rgba(74,222,128,0.06)'
          : upgrade.canAfford
            ? 'rgba(197,160,89,0.06)'
            : 'transparent',
      }}
    >
      {/* Info */}
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <span class="font-heading text-sm truncate" style={{ color: 'var(--pw-text-primary)' }}>
            {upgrade.label}
          </span>
          {upgrade.isMaxed && (
            <span class="font-game text-[10px] px-1 rounded" style={{ color: 'var(--pw-success)' }}>
              MAX
            </span>
          )}
        </div>
        <div class="font-game text-xs" style={{ color: 'var(--pw-text-muted)' }}>
          {upgrade.effectSummary || upgrade.description}
        </div>
        {/* Rank bar */}
        <div class="mt-1 flex items-center gap-1.5">
          <div
            class="flex-1 h-1.5 rounded-full overflow-hidden"
            style={{ background: 'rgba(255,255,255,0.08)' }}
          >
            <div
              class="h-full rounded-full transition-all"
              style={{
                width: `${pct}%`,
                background: upgrade.isMaxed ? 'var(--pw-success)' : 'var(--pw-pearl, #c4b5fd)',
              }}
            />
          </div>
          <span
            class="font-numbers text-[10px] whitespace-nowrap"
            style={{ color: 'var(--pw-text-muted)' }}
          >
            {upgrade.currentRank}/{upgrade.maxRank}
          </span>
        </div>
      </div>

      {/* Purchase button */}
      {!upgrade.isMaxed && (
        <button
          type="button"
          class="action-btn px-3 py-1.5 font-heading text-xs rounded-lg shrink-0"
          style={{
            color: upgrade.canAfford ? 'var(--pw-pearl, #c4b5fd)' : 'var(--pw-text-muted)',
            borderColor: upgrade.canAfford ? 'var(--pw-pearl, #c4b5fd)' : 'var(--pw-text-muted)',
            opacity: upgrade.canAfford ? 1 : 0.4,
            cursor: upgrade.canAfford ? 'pointer' : 'not-allowed',
            minWidth: '64px',
            minHeight: '44px',
          }}
          onClick={() => onPurchase(upgrade.id)}
          disabled={!upgrade.canAfford}
          aria-label={`Buy ${upgrade.label} for ${upgrade.costPerRank} Pearls`}
        >
          {upgrade.costPerRank}P
        </button>
      )}
    </div>
  );
}

export function PearlUpgradeScreen({
  prestigeState,
  onStateChange,
  onBack,
}: PearlUpgradeScreenProps) {
  const [activeCategory, setActiveCategory] = useState<UpgradeCategory>('auto_deploy');

  const upgrades = useMemo(() => getPearlUpgradeDisplayList(prestigeState), [prestigeState]);

  const grouped = useMemo(() => {
    const map = new Map<UpgradeCategory, PearlUpgradeDisplay[]>();
    for (const cat of CATEGORIES) {
      map.set(cat.key, []);
    }
    for (const u of upgrades) {
      const cat = categorizeUpgrade(u);
      map.get(cat)?.push(u);
    }
    return map;
  }, [upgrades]);

  const handlePurchase = useCallback(
    (upgradeId: string) => {
      const { state: newState, result } = purchasePearlUpgrade(prestigeState, upgradeId);
      if (result.success) {
        onStateChange(newState);
      }
    },
    [prestigeState, onStateChange],
  );

  const activeUpgrades = grouped.get(activeCategory) ?? [];
  const activeCategoryInfo = CATEGORIES.find((c) => c.key === activeCategory);

  return (
    <div
      class="absolute inset-0 flex flex-col z-40 overflow-hidden"
      style={{
        background:
          'radial-gradient(ellipse at 50% 30%, rgba(196,181,253,0.05), rgba(0,0,0,0.95) 70%)',
      }}
    >
      {/* Header */}
      <div class="flex items-center justify-between px-4 py-3 shrink-0">
        <button
          type="button"
          class="action-btn px-3 py-2 font-heading text-sm rounded-lg"
          style={{
            color: 'var(--pw-text-secondary)',
            borderColor: 'var(--pw-text-muted)',
            minHeight: '44px',
          }}
          onClick={onBack}
        >
          Back
        </button>
        <h1
          class="font-title text-xl tracking-wider uppercase"
          style={{ color: 'var(--pw-pearl, #c4b5fd)' }}
        >
          Pearl Upgrades
        </h1>
        <div
          class="font-numbers text-lg font-bold px-3 py-1 rounded"
          style={{
            color: 'var(--pw-pearl, #c4b5fd)',
            background: 'rgba(196,181,253,0.1)',
          }}
        >
          {prestigeState.pearls}P
        </div>
      </div>

      {/* Rank badge */}
      <div class="text-center pb-2 shrink-0">
        <span class="font-game text-xs" style={{ color: 'var(--pw-text-muted)' }}>
          Prestige Rank {prestigeState.rank} — Total Pearls Earned:{' '}
          {prestigeState.totalPearlsEarned}
        </span>
      </div>

      {/* Category tabs */}
      <div class="flex gap-1 px-4 pb-2 shrink-0">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.key}
            type="button"
            class="flex-1 py-2 font-heading text-xs rounded-lg transition-colors"
            style={{
              color:
                activeCategory === cat.key ? 'var(--pw-pearl, #c4b5fd)' : 'var(--pw-text-muted)',
              background:
                activeCategory === cat.key ? 'rgba(196,181,253,0.12)' : 'rgba(255,255,255,0.03)',
              borderBottom:
                activeCategory === cat.key
                  ? '2px solid var(--pw-pearl, #c4b5fd)'
                  : '2px solid transparent',
              minHeight: '44px',
            }}
            onClick={() => setActiveCategory(cat.key)}
          >
            {cat.label}
          </button>
        ))}
      </div>

      {/* Category description */}
      {activeCategoryInfo && (
        <div class="px-4 pb-2 shrink-0">
          <span class="font-game text-xs" style={{ color: 'var(--pw-text-muted)' }}>
            {activeCategoryInfo.description}
          </span>
        </div>
      )}

      {/* Upgrade list */}
      <div class="flex-1 overflow-y-auto px-4 pb-4">
        <Frame9Slice>
          <div class="px-2 py-2 flex flex-col gap-1">
            {activeUpgrades.length === 0 ? (
              <div class="text-center py-4">
                <span class="font-game text-sm" style={{ color: 'var(--pw-text-muted)' }}>
                  No upgrades in this category
                </span>
              </div>
            ) : (
              activeUpgrades.map((u) => (
                <UpgradeRow key={u.id} upgrade={u} onPurchase={handlePurchase} />
              ))
            )}
          </div>
        </Frame9Slice>
      </div>
    </div>
  );
}
