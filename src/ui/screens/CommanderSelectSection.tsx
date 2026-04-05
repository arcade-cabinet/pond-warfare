/**
 * Commander Select Section (v3.1 — US5)
 *
 * Shows all 7 commanders as pixel art portraits in a horizontal row.
 * Unlocked commanders are tappable, locked ones are greyed with Pearl cost.
 * Active commander has gold checkmark/border.
 */

import { useCallback } from 'preact/hooks';
import { COMMANDER_ABILITIES, COMMANDERS, type CommanderDef } from '@/config/commanders';
import type { PlayerProfile } from '@/storage/database';
import { CommanderPortrait } from '@/ui/components/sprites/commanders/CommanderPortrait';
import { COLORS } from '@/ui/design-tokens';

export interface CommanderSelectSectionProps {
  selectedCommanderId: string;
  onSelect: (commanderId: string) => void;
  playerProfile: PlayerProfile;
  pearls: number;
  onUnlock: (commanderId: string, cost: number) => void;
}

/** Pearl unlock cost per commander (id -> cost). Free commander has no entry. */
const COMMANDER_PEARL_COSTS: Record<string, number> = {
  sage: 25,
  warden: 50,
  tidekeeper: 75,
  shadowfang: 100,
  ironpaw: 125,
  stormcaller: 150,
};

function CommanderCard({
  def,
  isSelected,
  isUnlocked,
  pearlCost,
  canAfford,
  onTap,
}: {
  def: CommanderDef;
  isSelected: boolean;
  isUnlocked: boolean;
  pearlCost: number;
  canAfford: boolean;
  onTap: () => void;
}) {
  const ability = COMMANDER_ABILITIES[def.id];
  const borderColor = isSelected
    ? COLORS.grittyGold
    : isUnlocked
      ? COLORS.weatheredSteel
      : COLORS.woodDark;

  return (
    <button
      type="button"
      class="flex flex-col items-center gap-1 p-2 rounded relative"
      style={{
        border: `2px solid ${borderColor}`,
        background: isSelected
          ? 'rgba(197,160,89,0.15)'
          : isUnlocked
            ? 'rgba(255,255,255,0.03)'
            : 'rgba(0,0,0,0.3)',
        opacity: isUnlocked ? 1 : 0.6,
        cursor: isUnlocked || canAfford ? 'pointer' : 'not-allowed',
        minWidth: '90px',
        minHeight: '44px',
      }}
      onClick={onTap}
      aria-label={isUnlocked ? `Select ${def.name}` : `Unlock ${def.name} for ${pearlCost} Pearls`}
    >
      {/* Gold checkmark for selected */}
      {isSelected && (
        <div
          class="absolute -top-1 -right-1 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold"
          style={{
            background: COLORS.grittyGold,
            color: COLORS.woodDark,
          }}
        >
          ✓
        </div>
      )}

      {/* Portrait */}
      <div style={{ filter: isUnlocked ? 'none' : 'grayscale(0.8)' }}>
        <CommanderPortrait commanderType={def.id} size={64} />
      </div>

      {/* Name */}
      <span
        class="font-heading text-[10px] text-center leading-tight"
        style={{ color: isUnlocked ? COLORS.sepiaText : COLORS.weatheredSteel }}
      >
        {def.title}
      </span>

      {/* Passive description */}
      <span
        class="font-game text-[8px] text-center leading-tight"
        style={{ color: COLORS.weatheredSteel }}
      >
        {def.auraDesc}
      </span>

      {/* Active ability name */}
      {ability && (
        <span
          class="font-game text-[8px] text-center"
          style={{ color: 'var(--pw-pearl, #c4b5fd)' }}
        >
          {ability.name}
        </span>
      )}

      {/* Lock overlay with Pearl cost */}
      {!isUnlocked && (
        <span
          class="font-numbers text-xs font-bold"
          style={{
            color: canAfford ? 'var(--pw-pearl, #c4b5fd)' : COLORS.weatheredSteel,
          }}
        >
          {pearlCost}P
        </span>
      )}
    </button>
  );
}

export function CommanderSelectSection({
  selectedCommanderId,
  onSelect,
  playerProfile,
  pearls,
  onUnlock,
}: CommanderSelectSectionProps) {
  const handleTap = useCallback(
    (def: CommanderDef) => {
      const isUnlocked = def.unlock === null || def.unlock.check(playerProfile);
      if (isUnlocked) {
        onSelect(def.id);
      } else {
        const cost = COMMANDER_PEARL_COSTS[def.id] ?? 0;
        if (pearls >= cost) {
          onUnlock(def.id, cost);
        }
      }
    },
    [playerProfile, pearls, onSelect, onUnlock],
  );

  return (
    <div>
      <h2
        class="font-heading text-sm uppercase tracking-wider mb-2"
        style={{ color: COLORS.grittyGold }}
      >
        Commander
      </h2>
      <div class="flex gap-2 overflow-x-auto pb-2" style={{ scrollSnapType: 'x mandatory' }}>
        {COMMANDERS.map((def) => {
          const isUnlocked = def.unlock === null || def.unlock.check(playerProfile);
          const pearlCost = COMMANDER_PEARL_COSTS[def.id] ?? 0;
          return (
            <CommanderCard
              key={def.id}
              def={def}
              isSelected={selectedCommanderId === def.id}
              isUnlocked={isUnlocked}
              pearlCost={pearlCost}
              canAfford={pearls >= pearlCost}
              onTap={() => handleTap(def)}
            />
          );
        })}
      </div>
    </div>
  );
}
