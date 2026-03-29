/**
 * Airdrop Button
 *
 * Floating button in the top-right area of the HUD that shows
 * remaining airdrops and allows the player to call in supplies.
 * Only visible when airdrops > 0. Shows cooldown state.
 */

import { airdropCooldown, airdropsRemaining } from '../store';

export interface AirdropButtonProps {
  onAirdrop: () => void;
}

export function AirdropButton(props: AirdropButtonProps) {
  const remaining = airdropsRemaining.value;
  const cooldown = airdropCooldown.value;

  if (remaining <= 0) return null;

  const onCooldown = cooldown > 0;

  return (
    <button
      type="button"
      class={`absolute top-14 right-4 z-20 action-btn px-3 py-2 rounded-lg font-heading text-sm flex items-center gap-2 ${
        onCooldown ? 'opacity-50 cursor-not-allowed' : ''
      }`}
      style={{
        color: onCooldown ? 'var(--pw-text-muted)' : 'var(--pw-clam)',
        borderColor: onCooldown ? 'var(--pw-text-muted)' : 'var(--pw-otter)',
        minWidth: '44px',
        minHeight: '44px',
      }}
      title={
        onCooldown
          ? `Airdrop cooldown: ${cooldown}s`
          : 'Call in supplies: +200C +100T +2 Brawlers +1 Healer'
      }
      disabled={onCooldown}
      onClick={props.onAirdrop}
    >
      <span style={{ fontSize: '1.2em' }}>{'\u{1FA82}'}</span>
      <span class="font-numbers">
        {remaining} Airdrop{remaining !== 1 ? 's' : ''}
      </span>
      {onCooldown && (
        <span class="font-numbers text-xs" style={{ color: 'var(--pw-text-muted)' }}>
          ({cooldown}s)
        </span>
      )}
    </button>
  );
}
