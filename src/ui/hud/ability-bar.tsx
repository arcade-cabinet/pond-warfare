/**
 * Ability Bar
 *
 * Shows active ability buttons (Rally Cry, Pond Blessing, Tidal Surge)
 * when the corresponding tech has been researched. Each button shows
 * cooldown or "used" state.
 */

import {
  pondBlessingAvailable,
  rallyCryActive,
  rallyCryAvailable,
  rallyCryCooldown,
  tidalSurgeAvailable,
} from '../store';

export interface AbilityBarProps {
  onRallyCry: () => void;
  onPondBlessing: () => void;
  onTidalSurge: () => void;
}

export function AbilityBar(props: AbilityBarProps) {
  const hasRally = rallyCryAvailable.value;
  const hasPond = pondBlessingAvailable.value;
  const hasTidal = tidalSurgeAvailable.value;

  if (!hasRally && !hasPond && !hasTidal) return null;

  const rallyOnCooldown = rallyCryCooldown.value > 0;
  const rallyActive = rallyCryActive.value;

  return (
    <div class="absolute top-28 right-4 z-20 flex flex-col gap-2">
      {hasRally && (
        <button
          type="button"
          class={`action-btn px-3 py-2 rounded-lg font-heading text-xs flex items-center gap-2 ${
            rallyOnCooldown || rallyActive ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          style={{
            color: rallyActive
              ? 'var(--pw-success)'
              : rallyOnCooldown
                ? 'var(--pw-text-muted)'
                : 'var(--pw-warning)',
            borderColor: rallyActive ? 'var(--pw-success)' : 'var(--pw-warning)',
            minWidth: '44px',
            minHeight: '44px',
          }}
          title={
            rallyActive
              ? 'Rally Cry active!'
              : rallyOnCooldown
                ? `Rally Cry cooldown: ${rallyCryCooldown.value}s`
                : 'Rally Cry: +30% speed for all units (10s)'
          }
          disabled={rallyOnCooldown || rallyActive}
          onClick={props.onRallyCry}
        >
          <span>Rally Cry</span>
          {rallyActive && (
            <span class="font-numbers text-xs" style={{ color: 'var(--pw-success)' }}>
              ACTIVE
            </span>
          )}
          {rallyOnCooldown && !rallyActive && (
            <span class="font-numbers text-xs" style={{ color: 'var(--pw-text-muted)' }}>
              ({rallyCryCooldown.value}s)
            </span>
          )}
        </button>
      )}
      {hasPond && (
        <button
          type="button"
          class="action-btn px-3 py-2 rounded-lg font-heading text-xs flex items-center gap-2"
          style={{
            color: 'var(--pw-accent)',
            borderColor: 'var(--pw-accent)',
            minWidth: '44px',
            minHeight: '44px',
          }}
          title="Pond Blessing: heal all units to full HP (one-time)"
          onClick={props.onPondBlessing}
        >
          <span>Pond Blessing</span>
        </button>
      )}
      {hasTidal && (
        <button
          type="button"
          class="action-btn px-3 py-2 rounded-lg font-heading text-xs flex items-center gap-2"
          style={{
            color: 'var(--pw-enemy-light)',
            borderColor: 'var(--pw-enemy-light)',
            minWidth: '44px',
            minHeight: '44px',
          }}
          title="Tidal Surge: deal 50 damage to all enemies (one-time)"
          onClick={props.onTidalSurge}
        >
          <span>Tidal Surge</span>
        </button>
      )}
    </div>
  );
}
