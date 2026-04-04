/**
 * Pearl Loadout Builder (v3.1 — US5)
 *
 * Full-screen loadout screen accessible from main menu.
 * Sections: Commander Select, Auto-Deploy, Multipliers, Starting Tier.
 * Design bible: Frame9Slice wrappers, design token colors, rts-btn buttons.
 */

import { useCallback, useMemo, useState } from 'preact/hooks';
import {
  getPearlUpgradeDisplayList,
  type PearlUpgradeDisplay,
  type PrestigeState,
  purchasePearlUpgrade,
} from '@/config/prestige-logic';
import type { PlayerProfile } from '@/storage/database';
import { Frame9Slice } from '@/ui/components/frame';
import { COLORS } from '@/ui/design-tokens';
import { CommanderSelectSection } from './CommanderSelectSection';
import { StartingTierSection } from './StartingTierSection';

export interface PearlUpgradeScreenProps {
  prestigeState: PrestigeState;
  onStateChange: (newState: PrestigeState) => void;
  onBack: () => void;
  selectedCommanderId: string;
  onCommanderSelect: (commanderId: string) => void;
  playerProfile: PlayerProfile;
}

type LoadoutSection = 'commander' | 'auto_deploy' | 'multiplier' | 'starting_tier';

interface SectionInfo {
  key: LoadoutSection;
  label: string;
}

const SECTIONS: SectionInfo[] = [
  { key: 'commander', label: 'Commander' },
  { key: 'auto_deploy', label: 'Auto-Deploy' },
  { key: 'multiplier', label: 'Multipliers' },
  { key: 'starting_tier', label: 'Starting Tier' },
];

function categorizeUpgrade(upgrade: PearlUpgradeDisplay): string {
  if (upgrade.id.startsWith('auto_deploy_')) return 'auto_deploy';
  if (upgrade.id.endsWith('_behavior')) return 'auto_deploy';
  if (upgrade.id === 'starting_tier') return 'starting_tier';
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
      <div class="flex-1 min-w-0">
        <div class="flex items-center gap-1.5">
          <span class="font-heading text-sm truncate" style={{ color: COLORS.sepiaText }}>
            {upgrade.label}
          </span>
          {upgrade.isMaxed && (
            <span class="font-game text-[10px] px-1 rounded" style={{ color: COLORS.mossGreen }}>
              MAX
            </span>
          )}
        </div>
        <div class="font-game text-xs" style={{ color: COLORS.weatheredSteel }}>
          {upgrade.effectSummary || upgrade.description}
        </div>
        <div class="mt-1 flex items-center gap-1.5">
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
      </div>

      {!upgrade.isMaxed && (
        <button
          type="button"
          class="rts-btn px-3 py-1.5 font-heading text-xs shrink-0"
          style={{
            color: upgrade.canAfford ? 'var(--pw-pearl, #c4b5fd)' : COLORS.weatheredSteel,
            borderColor: upgrade.canAfford ? 'var(--pw-pearl, #c4b5fd)' : COLORS.weatheredSteel,
            opacity: upgrade.canAfford ? 1 : 0.4,
            cursor: upgrade.canAfford ? 'pointer' : 'not-allowed',
            minWidth: '64px',
            minHeight: '44px',
            fontSize: '0.75rem',
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
  selectedCommanderId,
  onCommanderSelect,
  playerProfile,
}: PearlUpgradeScreenProps) {
  const [activeSection, setActiveSection] = useState<LoadoutSection>('commander');

  const upgrades = useMemo(() => getPearlUpgradeDisplayList(prestigeState), [prestigeState]);

  const grouped = useMemo(() => {
    const map = new Map<string, PearlUpgradeDisplay[]>();
    for (const u of upgrades) {
      const cat = categorizeUpgrade(u);
      if (!map.has(cat)) map.set(cat, []);
      map.get(cat)?.push(u);
    }
    return map;
  }, [upgrades]);

  const handlePurchase = useCallback(
    (upgradeId: string) => {
      const { state: newState, result } = purchasePearlUpgrade(prestigeState, upgradeId);
      if (result.success) onStateChange(newState);
    },
    [prestigeState, onStateChange],
  );

  const handleCommanderUnlock = useCallback(
    (commanderId: string, cost: number) => {
      if (prestigeState.pearls >= cost) {
        const newState = {
          ...prestigeState,
          pearls: prestigeState.pearls - cost,
        };
        onStateChange(newState);
        onCommanderSelect(commanderId);
      }
    },
    [prestigeState, onStateChange, onCommanderSelect],
  );

  const sectionUpgrades = grouped.get(activeSection) ?? [];

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
          class="rts-btn px-3 py-2 font-heading text-sm"
          style={{
            color: COLORS.weatheredSteel,
            borderColor: COLORS.weatheredSteel,
            minHeight: '44px',
          }}
          onClick={onBack}
        >
          Back
        </button>
        <h1
          class="font-heading text-xl tracking-wider uppercase"
          style={{ color: 'var(--pw-pearl, #c4b5fd)' }}
        >
          Loadout
        </h1>
        <div
          class="font-numbers text-lg font-bold px-3 py-1 rounded"
          style={{ color: 'var(--pw-pearl, #c4b5fd)', background: 'rgba(196,181,253,0.1)' }}
        >
          {prestigeState.pearls}P
        </div>
      </div>

      {/* Section tabs */}
      <div class="flex gap-1 px-4 pb-2 shrink-0 overflow-x-auto">
        {SECTIONS.map((s) => (
          <button
            key={s.key}
            type="button"
            class={`rts-btn flex-1 py-2 font-heading text-xs whitespace-nowrap ${activeSection === s.key ? 'active' : ''}`}
            style={{ minHeight: '44px', fontSize: '0.7rem' }}
            onClick={() => setActiveSection(s.key)}
          >
            {s.label}
          </button>
        ))}
      </div>

      {/* Section content */}
      <div class="flex-1 overflow-y-auto px-4 pb-4">
        <Frame9Slice>
          <div class="px-3 py-3">
            {activeSection === 'commander' && (
              <CommanderSelectSection
                selectedCommanderId={selectedCommanderId}
                onSelect={onCommanderSelect}
                playerProfile={playerProfile}
                pearls={prestigeState.pearls}
                onUnlock={handleCommanderUnlock}
              />
            )}

            {activeSection === 'starting_tier' && (
              <StartingTierSection
                prestigeState={prestigeState}
                onPurchase={() => handlePurchase('starting_tier')}
              />
            )}

            {(activeSection === 'auto_deploy' || activeSection === 'multiplier') && (
              <div class="flex flex-col gap-1">
                {sectionUpgrades.length === 0 ? (
                  <div class="text-center py-4">
                    <span class="font-game text-sm" style={{ color: COLORS.weatheredSteel }}>
                      No upgrades in this category
                    </span>
                  </div>
                ) : (
                  sectionUpgrades.map((u) => (
                    <UpgradeRow key={u.id} upgrade={u} onPurchase={handlePurchase} />
                  ))
                )}
              </div>
            )}
          </div>
        </Frame9Slice>
      </div>
    </div>
  );
}
