/**
 * Commander Ability HUD Button
 *
 * Shows the active commander's ability with cooldown timer.
 * Tap or press Q to activate. Disabled while on cooldown.
 * On touch devices, hides the "Q" hotkey label.
 */

import { inputMode } from '@/platform';
import {
  commanderAbilityActive,
  commanderAbilityCooldown,
  commanderAbilityName,
  commanderAbilityReady,
} from '@/ui/store-gameplay';

interface Props {
  onActivate: () => void;
}

export function CommanderAbility({ onActivate }: Props) {
  const name = commanderAbilityName.value;
  const ready = commanderAbilityReady.value;
  const active = commanderAbilityActive.value;
  const cooldown = commanderAbilityCooldown.value;
  const isTouch = inputMode.value === 'touch';

  if (!name) return null;

  return (
    <button
      type="button"
      class={`
        absolute left-2 top-12 md:top-14
        flex items-center gap-1 px-2 py-1 rounded font-heading text-xs
        border transition-colors min-h-[44px] min-w-[44px] z-30
        ${active ? 'bg-yellow-500/30 border-yellow-400 text-yellow-200' : ''}
        ${ready ? 'bg-emerald-700/40 border-emerald-500 text-emerald-200 hover:bg-emerald-600/50' : ''}
        ${!ready && !active ? 'bg-gray-800/60 border-gray-600 text-gray-400 opacity-60' : ''}
      `}
      disabled={!ready}
      onClick={onActivate}
      aria-label={
        ready ? `Activate ${name}${isTouch ? '' : ' (Q)'}` : `${name} — ${cooldown}s cooldown`
      }
    >
      {!isTouch && <span class="text-sm">Q</span>}
      <span class="truncate max-w-[80px]">{name}</span>
      {active && <span class="text-yellow-300 text-[10px]">ACTIVE</span>}
      {!ready && !active && cooldown > 0 && (
        <span class="text-[10px] tabular-nums">{cooldown}s</span>
      )}
    </button>
  );
}
