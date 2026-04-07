/**
 * Pearl Loadout Modal (v3.2 -- US5)
 *
 * Compact center modal with two tabs: Commander and Upgrades.
 * Commander tab: PondAccordion with one section per commander
 *   (collapsed: name + portrait + SELECTED badge; expanded: description + SELECT).
 * Upgrades tab: PondAccordion with Pearl upgrade categories showing
 * the full rank path for each grouped specialist or systems track.
 * Close triggers a confirmation overlay summarising session purchases.
 */

import { useCallback, useMemo, useState } from 'preact/hooks';
import { COMMANDER_ABILITIES, COMMANDERS } from '@/config/commanders';
import {
  getPearlUpgradeDisplayList,
  type PearlUpgradeDisplay,
  type PrestigeState,
  purchasePearlUpgrade,
} from '@/config/prestige-logic';
import type { PlayerProfile } from '@/storage/database';
import { Frame9Slice } from '@/ui/components/frame';
import { type AccordionSection, PondAccordion } from '@/ui/components/PondAccordion';
import { COLORS } from '@/ui/design-tokens';
import { CommanderAccordionContent } from './CommanderAccordionContent';
import { ConfirmChoicesOverlay } from './ConfirmChoicesOverlay';
import { PearlUpgradeRow } from './PearlUpgradeRow';
import {
  buildCommanderSections,
  COMMANDER_PEARL_COSTS,
  getUpgradeGroups,
} from './pearl-upgrade-helpers';

export interface PearlUpgradeScreenProps {
  prestigeState: PrestigeState;
  onStateChange: (newState: PrestigeState) => void;
  onBack: () => void;
  selectedCommanderId: string;
  onCommanderSelect: (commanderId: string) => void;
  playerProfile: PlayerProfile;
}

type TabKey = 'commander' | 'upgrades';

export function PearlUpgradeScreen({
  prestigeState,
  onStateChange,
  onBack,
  selectedCommanderId,
  onCommanderSelect,
  playerProfile,
}: PearlUpgradeScreenProps) {
  const [activeTab, setActiveTab] = useState<TabKey>('commander');
  const [purchases, setPurchases] = useState<string[]>([]);
  const [showConfirm, setShowConfirm] = useState(false);

  const upgrades = useMemo(() => getPearlUpgradeDisplayList(prestigeState), [prestigeState]);
  const upgradeGroups = useMemo(() => getUpgradeGroups(upgrades), [upgrades]);

  const handlePurchase = useCallback(
    (upgradeId: string) => {
      const { state: newState, result } = purchasePearlUpgrade(prestigeState, upgradeId);
      if (result.success) {
        const display = upgrades.find((u) => u.id === upgradeId);
        setPurchases((prev) => [...prev, display?.label ?? upgradeId]);
        onStateChange(newState);
      }
    },
    [prestigeState, onStateChange, upgrades],
  );

  const handleCommanderUnlock = useCallback(
    (commanderId: string, cost: number) => {
      if (prestigeState.pearls >= cost) {
        const newState = { ...prestigeState, pearls: prestigeState.pearls - cost };
        const def = COMMANDERS.find((c) => c.id === commanderId);
        setPurchases((prev) => [...prev, `Unlock ${def?.name ?? commanderId}`]);
        onStateChange(newState);
        onCommanderSelect(commanderId);
      }
    },
    [prestigeState, onStateChange, onCommanderSelect],
  );

  const handleSelectCommander = useCallback(
    (commanderId: string) => {
      const def = COMMANDERS.find((c) => c.id === commanderId);
      const isUnlocked = def && (def.unlock === null || def.unlock.check(playerProfile));
      if (isUnlocked) {
        onCommanderSelect(commanderId);
      } else {
        const cost = COMMANDER_PEARL_COSTS[commanderId] ?? 0;
        if (prestigeState.pearls >= cost) {
          handleCommanderUnlock(commanderId, cost);
        }
      }
    },
    [playerProfile, prestigeState, onCommanderSelect, handleCommanderUnlock],
  );

  const commanderSections = useMemo(
    () => buildCommanderSections(selectedCommanderId, playerProfile, prestigeState.pearls),
    [selectedCommanderId, playerProfile, prestigeState.pearls],
  );

  const accordionSections: AccordionSection[] = useMemo(() => {
    return [...upgradeGroups.entries()].map(([cat, items]) => {
      const remaining = items.filter((item) => !item.isMaxed);
      const affordable = remaining.filter((item) => item.canAfford);
      const summary =
        remaining.length === 0
          ? 'Complete'
          : affordable.length > 0
            ? `${affordable.length} ready`
            : `${remaining.length} remaining`;
      return { key: cat, title: cat, summary };
    });
  }, [upgradeGroups]);

  const handleClose = useCallback(() => {
    if (purchases.length === 0) {
      onBack();
    } else {
      setShowConfirm(true);
    }
  }, [purchases, onBack]);

  const handleConfirm = useCallback(() => {
    setShowConfirm(false);
    onBack();
  }, [onBack]);

  const handleGoBack = useCallback(() => {
    setShowConfirm(false);
  }, []);

  return (
    <div
      class="absolute inset-0 flex items-center justify-center z-40"
      style={{ background: 'rgba(0,0,0,0.75)' }}
    >
      <div class="w-full flex flex-col" style={{ maxWidth: '480px', maxHeight: '85dvh' }}>
        <Frame9Slice title="Pearl Loadout">
          <div
            class="px-3 py-2 flex flex-col gap-2"
            style={{ maxHeight: '75dvh', overflow: 'auto' }}
          >
            {/* Pearl balance */}
            <div class="flex items-center justify-between">
              <span
                class="font-heading text-sm uppercase"
                style={{ color: 'var(--pw-pearl, #c4b5fd)' }}
              >
                Pearl Balance
              </span>
              <span
                class="font-numbers text-lg font-bold px-2 py-0.5 rounded"
                style={{ color: 'var(--pw-pearl, #c4b5fd)', background: 'rgba(196,181,253,0.1)' }}
              >
                {prestigeState.pearls}P
              </span>
            </div>

            {/* Tab row */}
            <div class="flex gap-1">
              {(['commander', 'upgrades'] as TabKey[]).map((tab) => (
                <button
                  key={tab}
                  type="button"
                  class={`rts-btn flex-1 py-2 font-heading text-xs uppercase ${activeTab === tab ? 'active' : ''}`}
                  style={{ minHeight: '44px' }}
                  onClick={() => setActiveTab(tab)}
                >
                  {tab === 'commander' ? 'Commander' : 'Upgrades'}
                </button>
              ))}
            </div>

            {/* Commander tab -- accordion list */}
            {activeTab === 'commander' && (
              <PondAccordion sections={commanderSections} allowMultiple={false}>
                {commanderSections.map((section) => {
                  const def = COMMANDERS.find((c) => c.id === section.key);
                  if (!def) return null;
                  return (
                    <CommanderAccordionContent
                      key={section.key}
                      def={def}
                      ability={COMMANDER_ABILITIES[def.id]}
                      isSelected={selectedCommanderId === def.id}
                      isUnlocked={def.unlock === null || def.unlock.check(playerProfile)}
                      pearlCost={COMMANDER_PEARL_COSTS[def.id] ?? 0}
                      canAfford={prestigeState.pearls >= (COMMANDER_PEARL_COSTS[def.id] ?? 0)}
                      onSelect={() => handleSelectCommander(def.id)}
                    />
                  );
                })}
              </PondAccordion>
            )}

            {/* Upgrades tab */}
            {activeTab === 'upgrades' && (
              <PondAccordion sections={accordionSections} allowMultiple={false}>
                {[...upgradeGroups.entries()].map(([cat, upgradesInGroup]) => (
                  <PearlUpgradeCategoryContent
                    key={cat}
                    upgrades={upgradesInGroup}
                    pearls={prestigeState.pearls}
                    onPurchase={handlePurchase}
                  />
                ))}
              </PondAccordion>
            )}

            {/* Close button */}
            <button
              type="button"
              class="rts-btn w-full py-2 font-heading text-sm uppercase"
              style={{ minHeight: '44px', color: COLORS.weatheredSteel }}
              onClick={handleClose}
            >
              Close
            </button>
          </div>
        </Frame9Slice>
      </div>

      {/* Confirmation overlay */}
      {showConfirm && (
        <ConfirmChoicesOverlay
          purchases={purchases}
          onConfirm={handleConfirm}
          onGoBack={handleGoBack}
        />
      )}
    </div>
  );
}

/** Expanded content for a single Pearl upgrade category. */
function PearlUpgradeCategoryContent({
  upgrades,
  pearls,
  onPurchase,
}: {
  upgrades: PearlUpgradeDisplay[];
  pearls: number;
  onPurchase: (id: string) => void;
}) {
  if (upgrades.every((upgrade) => upgrade.isMaxed)) {
    return (
      <div class="py-3 text-center">
        <span class="font-heading text-sm" style={{ color: COLORS.mossGreen }}>
          All upgrades purchased
        </span>
      </div>
    );
  }

  return (
    <div class="flex flex-col divide-y divide-white/10">
      {upgrades.map((upgrade) => (
        <PearlUpgradeRow
          key={upgrade.id}
          upgrade={upgrade}
          onPurchase={onPurchase}
          pearls={pearls}
        />
      ))}
    </div>
  );
}
