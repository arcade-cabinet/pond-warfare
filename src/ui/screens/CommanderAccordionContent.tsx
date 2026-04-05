/**
 * CommanderAccordionContent -- Expanded content for a single commander
 * in the Pearl Upgrade Screen's Commander accordion tab.
 *
 * Shows: portrait, commander description (aura + passive), ability name
 * and description, and a SELECT / SELECTED / UNLOCK button.
 */

import type { ActiveAbilityDef, CommanderDef } from '@/config/commanders';
import { CommanderPortrait } from '@/ui/components/sprites/commanders/CommanderPortrait';
import { COLORS } from '@/ui/design-tokens';

export interface CommanderAccordionContentProps {
  def: CommanderDef;
  ability: ActiveAbilityDef | undefined;
  isSelected: boolean;
  isUnlocked: boolean;
  pearlCost: number;
  canAfford: boolean;
  onSelect: () => void;
}

export function CommanderAccordionContent({
  def,
  ability,
  isSelected,
  isUnlocked,
  pearlCost,
  canAfford,
  onSelect,
}: CommanderAccordionContentProps) {
  return (
    <div class="py-2 px-1 flex flex-col gap-2" data-testid={`commander-content-${def.id}`}>
      {/* Portrait row */}
      <div class="flex items-center gap-3">
        <div style={{ filter: isUnlocked ? 'none' : 'grayscale(0.8)' }}>
          <CommanderPortrait commanderType={def.id} size={56} />
        </div>
        <div class="flex flex-col gap-0.5 flex-1">
          <span class="font-heading text-sm" style={{ color: COLORS.grittyGold }}>
            {def.title}
          </span>
          <span class="font-game text-xs" style={{ color: COLORS.sepiaText }}>
            {def.auraDesc}
          </span>
          {def.passiveDesc !== 'None' && (
            <span class="font-game text-xs" style={{ color: COLORS.weatheredSteel }}>
              {def.passiveDesc}
            </span>
          )}
        </div>
      </div>

      {/* Ability info */}
      {ability && (
        <div class="flex flex-col gap-0.5 px-1">
          <span
            class="font-heading text-xs uppercase"
            style={{ color: 'var(--pw-pearl, #c4b5fd)' }}
          >
            {ability.name}
          </span>
          <span class="font-game text-xs" style={{ color: COLORS.weatheredSteel }}>
            {ability.description}
          </span>
        </div>
      )}

      {/* Action button */}
      {isSelected ? (
        <button
          type="button"
          class="rts-btn w-full py-2 font-heading text-sm uppercase"
          style={{
            minHeight: '44px',
            color: COLORS.mossGreen,
            borderColor: COLORS.mossGreen,
            opacity: 0.7,
            cursor: 'default',
          }}
          disabled
          aria-label={`${def.name} is selected`}
        >
          Selected
        </button>
      ) : isUnlocked ? (
        <button
          type="button"
          class="rts-btn w-full py-2 font-heading text-sm uppercase"
          style={{
            minHeight: '44px',
            color: COLORS.grittyGold,
            borderColor: COLORS.grittyGold,
            cursor: 'pointer',
          }}
          onClick={onSelect}
          aria-label={`Select ${def.name}`}
        >
          Select
        </button>
      ) : (
        <button
          type="button"
          class="rts-btn w-full py-2 font-heading text-sm uppercase"
          style={{
            minHeight: '44px',
            color: canAfford ? 'var(--pw-pearl, #c4b5fd)' : COLORS.weatheredSteel,
            borderColor: canAfford ? 'var(--pw-pearl, #c4b5fd)' : COLORS.weatheredSteel,
            opacity: canAfford ? 1 : 0.6,
            cursor: canAfford ? 'pointer' : 'not-allowed',
          }}
          onClick={canAfford ? onSelect : undefined}
          disabled={!canAfford}
          aria-label={`Unlock ${def.name} for ${pearlCost} Pearls`}
        >
          Unlock -- {pearlCost}P
        </button>
      )}
    </div>
  );
}
