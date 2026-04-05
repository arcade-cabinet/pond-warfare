/**
 * Pond Blessing & Tidal Surge HUD Buttons
 *
 * Visible tap targets for legacy abilities (distinct from Commander ability).
 * On touch devices, hides keyboard shortcut labels.
 * These appear below the CommanderAbility button in the left HUD column.
 */

import { inputMode } from '@/platform';
import {
  pondBlessingAvailable,
  rallyCryAvailable,
  rallyCryCooldown,
  tidalSurgeAvailable,
} from '@/ui/store-gameplay';

export interface AbilityButtonsProps {
  onRallyCry?: () => void;
  onPondBlessing?: () => void;
  onTidalSurge?: () => void;
}

function AbilityBtn({
  label,
  hotkey,
  available,
  cooldownText,
  color,
  onClick,
}: {
  label: string;
  hotkey: string;
  available: boolean;
  cooldownText?: string;
  color: string;
  onClick?: () => void;
}) {
  const isTouch = inputMode.value === 'touch';

  return (
    <button
      type="button"
      class={`
        flex items-center gap-1 px-2 py-1 rounded font-heading text-xs
        border transition-colors min-h-[44px] min-w-[44px]
        ${available ? `border-${color} hover:bg-${color}/20` : 'bg-gray-800/60 border-gray-600 text-gray-400 opacity-60'}
      `}
      style={{
        borderColor: available
          ? `var(--pw-${color === 'emerald' ? 'success' : color === 'sky' ? 'info' : 'warning'})`
          : undefined,
        color: available
          ? `var(--pw-${color === 'emerald' ? 'success' : color === 'sky' ? 'info' : 'warning'})`
          : undefined,
      }}
      disabled={!available}
      onClick={onClick}
      aria-label={`${label}${isTouch ? '' : ` (${hotkey})`}`}
    >
      {!isTouch && <span class="text-[10px] font-bold">{hotkey}</span>}
      <span class="truncate max-w-[70px]">{label}</span>
      {!available && cooldownText && <span class="text-[10px] tabular-nums">{cooldownText}</span>}
    </button>
  );
}

export function AbilityButtons({ onRallyCry, onPondBlessing, onTidalSurge }: AbilityButtonsProps) {
  const showRally = rallyCryAvailable.value;
  const showBlessing = pondBlessingAvailable.value;
  const showSurge = tidalSurgeAvailable.value;
  const rallyCd = rallyCryCooldown.value;

  // If no abilities are available, render nothing
  if (!showRally && !showBlessing && !showSurge) return null;

  return (
    <div class="absolute left-2 top-24 md:top-28 flex flex-col gap-1 z-30">
      {showRally && (
        <AbilityBtn
          label="Sprint"
          hotkey="B"
          available={rallyCd <= 0}
          cooldownText={rallyCd > 0 ? `${rallyCd}s` : undefined}
          color="emerald"
          onClick={onRallyCry}
        />
      )}
      {showBlessing && (
        <AbilityBtn
          label="Blessing"
          hotkey="G"
          available
          color="emerald"
          onClick={onPondBlessing}
        />
      )}
      {showSurge && (
        <AbilityBtn label="Tidal Surge" hotkey="N" available color="sky" onClick={onTidalSurge} />
      )}
    </div>
  );
}
