/**
 * CommandCenterOverview — Compact overview when nothing is selected.
 * Includes idle/army buttons and auto-behavior toggles.
 */

import {
  armyCount,
  autoCombatEnabled,
  autoGathererEnabled,
  autoHealerEnabled,
  autoScoutEnabled,
  food,
  idleCombatCount,
  idleGathererCount,
  idleHealerCount,
  idleScoutCount,
  idleWorkerCount,
  maxFood,
} from './store';

/** Compact auto-behavior toggle. */
function AutoToggle({
  label,
  enabled,
  color,
  onToggle,
}: {
  label: string;
  enabled: boolean;
  color: string;
  onToggle: () => void;
}) {
  return (
    <button
      type="button"
      class="px-1.5 py-1 rounded text-[9px] font-bold cursor-pointer transition-colors min-h-[36px]"
      style={{
        border: `1px solid ${color}`,
        color,
        background: enabled ? `color-mix(in srgb, ${color} 12%, transparent)` : 'transparent',
      }}
      onClick={(e) => {
        e.stopPropagation();
        onToggle();
      }}
    >
      {enabled ? '\u2713 ' : ''}
      {label}
    </button>
  );
}

export function CommandCenterOverview({
  onIdleClick,
  onArmyClick,
}: {
  onIdleClick?: () => void;
  onArmyClick?: () => void;
}) {
  const hasGatherers = idleGathererCount.value > 0;
  const hasCombat = idleCombatCount.value > 0;
  const hasHealers = idleHealerCount.value > 0;
  const hasScouts = idleScoutCount.value > 0;
  const totalIdle = idleWorkerCount.value;

  return (
    <div class="flex flex-col gap-1">
      <div class="flex items-center gap-2">
        <h2
          class="font-heading text-sm md:text-base leading-tight"
          style={{ color: 'var(--pw-accent-dim)' }}
        >
          Command Center
        </h2>
        <div
          class="flex gap-1 text-[10px] md:text-xs font-numbers"
          style={{ color: 'var(--pw-text-secondary)' }}
        >
          <span style={{ color: 'var(--pw-food)' }}>
            {food.value}/{maxFood.value}
          </span>
        </div>
      </div>

      {/* Idle + Army quick-select buttons */}
      <div class="flex gap-1 flex-wrap">
        {totalIdle > 0 && (
          <button
            type="button"
            class="px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer"
            style={{ border: '1px solid var(--pw-warning)', color: 'var(--pw-warning)' }}
            onClick={(e) => {
              e.stopPropagation();
              onIdleClick?.();
            }}
          >
            {totalIdle} Idle
          </button>
        )}
        {armyCount.value > 0 && (
          <button
            type="button"
            class="px-2 py-0.5 rounded-full text-[10px] font-bold cursor-pointer"
            style={{ border: '1px solid var(--pw-enemy)', color: 'var(--pw-enemy-light)' }}
            onClick={(e) => {
              e.stopPropagation();
              onArmyClick?.();
            }}
          >
            Army ({armyCount.value})
          </button>
        )}
      </div>

      {/* Auto-behavior toggles */}
      {totalIdle > 0 && (
        <div class="flex gap-1 flex-wrap">
          {hasGatherers && (
            <AutoToggle
              label="Gatherer"
              enabled={autoGathererEnabled.value}
              color="var(--pw-warning)"
              onToggle={() => {
                autoGathererEnabled.value = !autoGathererEnabled.value;
              }}
            />
          )}
          {hasCombat && (
            <AutoToggle
              label="Combat"
              enabled={autoCombatEnabled.value}
              color="var(--pw-enemy-light)"
              onToggle={() => {
                autoCombatEnabled.value = !autoCombatEnabled.value;
              }}
            />
          )}
          {hasHealers && (
            <AutoToggle
              label="Healer"
              enabled={autoHealerEnabled.value}
              color="var(--pw-success)"
              onToggle={() => {
                autoHealerEnabled.value = !autoHealerEnabled.value;
              }}
            />
          )}
          {hasScouts && (
            <AutoToggle
              label="Scout"
              enabled={autoScoutEnabled.value}
              color="var(--pw-scout)"
              onToggle={() => {
                autoScoutEnabled.value = !autoScoutEnabled.value;
              }}
            />
          )}
        </div>
      )}
    </div>
  );
}
