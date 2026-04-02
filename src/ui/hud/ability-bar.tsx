/**
 * Ability Bar
 *
 * Shows active ability buttons (Rally Cry, Pond Blessing, Tidal Surge)
 * when the corresponding tech has been researched. Each button shows
 * cooldown or "used" state.
 */

import {
  commanderAbilityActive,
  commanderAbilityCooldown,
  commanderAbilityName,
  commanderAbilityReady,
  pondBlessingAvailable,
  rallyCryActive,
  rallyCryAvailable,
  rallyCryCooldown,
  tidalSurgeAvailable,
} from '../store';

/** Small hotkey badge positioned at top-right of a button. */
function KeyBadge({ label }: { label: string }) {
  return (
    <span
      class="absolute top-1 right-1 font-numbers text-[8px] px-1 rounded"
      style={{
        background: 'var(--pw-shadow-medium)',
        color: 'var(--pw-text-muted)',
        lineHeight: '1.3',
      }}
    >
      {label}
    </span>
  );
}

export interface AbilityBarProps {
  onRallyCry: () => void;
  onPondBlessing: () => void;
  onTidalSurge: () => void;
  onCommanderAbility?: () => void;
}

export function AbilityBar(props: AbilityBarProps) {
  const hasRally = rallyCryAvailable.value;
  const hasPond = pondBlessingAvailable.value;
  const hasTidal = tidalSurgeAvailable.value;
  const cmdName = commanderAbilityName.value;
  const cmdReady = commanderAbilityReady.value;
  const cmdActive = commanderAbilityActive.value;
  const cmdCooldown = commanderAbilityCooldown.value;
  const hasCmd = !!cmdName;

  if (!hasRally && !hasPond && !hasTidal && !hasCmd) return null;

  const rallyOnCooldown = rallyCryCooldown.value > 0;
  const rallyActive = rallyCryActive.value;

  return (
    <div class="absolute top-28 right-4 z-20 flex flex-col gap-2">
      {hasCmd && (
        <button
          type="button"
          class={`action-btn relative px-3 py-2 rounded-lg font-heading text-xs flex items-center gap-2 ${
            !cmdReady || cmdActive ? 'opacity-50 cursor-not-allowed' : ''
          }`}
          style={{
            color: cmdActive
              ? 'var(--pw-success)'
              : cmdReady
                ? 'var(--pw-accent)'
                : 'var(--pw-text-muted)',
            borderColor: cmdActive ? 'var(--pw-success)' : 'var(--pw-accent)',
            minWidth: '44px',
            minHeight: '44px',
          }}
          title={
            cmdActive
              ? `${cmdName} active!`
              : cmdCooldown > 0
                ? `${cmdName} cooldown: ${cmdCooldown}s`
                : `${cmdName} (Q)`
          }
          disabled={!cmdReady || cmdActive}
          onClick={props.onCommanderAbility}
        >
          <KeyBadge label="Q" />
          <span>{cmdName}</span>
          {cmdActive && (
            <span class="font-numbers text-xs" style={{ color: 'var(--pw-success)' }}>
              ACTIVE
            </span>
          )}
          {cmdCooldown > 0 && !cmdActive && (
            <span class="font-numbers text-xs" style={{ color: 'var(--pw-text-muted)' }}>
              ({cmdCooldown}s)
            </span>
          )}
        </button>
      )}
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
