/**
 * CommandsTab — Deselect, Stop, Select All + auto-behavior toggles.
 *
 * Contextual: shows relevant auto-behaviors based on idle unit types.
 * Deselect is greyed out when nothing is selected.
 */

import { AutoToggle } from '../components/AutoToggle';
import {
  cycleIdleWorker,
  deselect,
  haltSelection,
  selectAllUnits,
  selectArmyUnits,
} from '../game-actions';
import {
  armyCount,
  autoAttackEnabled,
  autoBuildEnabled,
  autoDefendEnabled,
  autoGatherEnabled,
  autoHealEnabled,
  autoScoutEnabled,
  idleCombatCount,
  idleGathererCount,
  idleHealerCount,
  idleScoutCount,
  idleWorkerCount,
  selectionCount,
} from '../store';

export function CommandsTab() {
  const count = selectionCount.value;
  const totalIdle = idleWorkerCount.value;
  const hasGatherers = idleGathererCount.value > 0;
  const hasCombat = idleCombatCount.value > 0;
  const hasHealers = idleHealerCount.value > 0;
  const hasScouts = idleScoutCount.value > 0;

  return (
    <div class="flex flex-col gap-2 p-2">
      {/* Primary commands */}
      <div class="grid grid-cols-3 gap-1">
        <button
          type="button"
          class={`action-btn py-2 rounded font-heading font-bold text-[10px] min-h-[44px] ${count === 0 ? 'opacity-35 cursor-not-allowed' : ''}`}
          disabled={count === 0}
          onClick={deselect}
        >
          Deselect
        </button>
        <button
          type="button"
          class={`action-btn py-2 rounded font-heading font-bold text-[10px] min-h-[44px] ${count === 0 ? 'opacity-35 cursor-not-allowed' : ''}`}
          disabled={count === 0}
          onClick={haltSelection}
        >
          Stop
        </button>
        <button
          type="button"
          class="action-btn py-2 rounded font-heading font-bold text-[10px] min-h-[44px]"
          onClick={selectAllUnits}
        >
          Select All
        </button>
      </div>

      {/* Quick-select */}
      <div class="flex gap-1 flex-wrap">
        {totalIdle > 0 && (
          <button
            type="button"
            class="px-2 py-1 rounded-full text-[10px] font-bold cursor-pointer min-h-[36px]"
            style={{ border: '1px solid var(--pw-warning)', color: 'var(--pw-warning)' }}
            onClick={cycleIdleWorker}
          >
            {totalIdle} Idle
          </button>
        )}
        {armyCount.value > 0 && (
          <button
            type="button"
            class="px-2 py-1 rounded-full text-[10px] font-bold cursor-pointer min-h-[36px]"
            style={{ border: '1px solid var(--pw-enemy)', color: 'var(--pw-enemy-light)' }}
            onClick={selectArmyUnits}
          >
            Army ({armyCount.value})
          </button>
        )}
      </div>

      {/* Auto-behavior toggles */}
      {totalIdle > 0 && (
        <>
          <div
            class="font-heading text-[10px] uppercase tracking-wider pt-1"
            style={{ color: 'var(--pw-accent)', borderTop: '1px solid var(--pw-border)' }}
          >
            Auto-Behaviors
          </div>
          <div class="flex gap-1 flex-wrap">
            {hasGatherers && (
              <>
                <AutoToggle
                  label="Gather"
                  enabled={autoGatherEnabled.value}
                  color="var(--pw-warning)"
                  onToggle={() => {
                    autoGatherEnabled.value = !autoGatherEnabled.value;
                  }}
                />
                <AutoToggle
                  label="Build"
                  enabled={autoBuildEnabled.value}
                  color="var(--pw-twig)"
                  onToggle={() => {
                    autoBuildEnabled.value = !autoBuildEnabled.value;
                  }}
                />
              </>
            )}
            {hasCombat && (
              <>
                <AutoToggle
                  label="Attack"
                  enabled={autoAttackEnabled.value}
                  color="var(--pw-enemy-light)"
                  onToggle={() => {
                    autoAttackEnabled.value = !autoAttackEnabled.value;
                  }}
                />
                <AutoToggle
                  label="Defend"
                  enabled={autoDefendEnabled.value}
                  color="var(--pw-accent)"
                  onToggle={() => {
                    autoDefendEnabled.value = !autoDefendEnabled.value;
                  }}
                />
              </>
            )}
            {hasHealers && (
              <AutoToggle
                label="Heal"
                enabled={autoHealEnabled.value}
                color="var(--pw-success)"
                onToggle={() => {
                  autoHealEnabled.value = !autoHealEnabled.value;
                }}
              />
            )}
            {hasScouts && (
              <AutoToggle
                label="Scout"
                enabled={autoScoutEnabled.value}
                color="#b090d8"
                onToggle={() => {
                  autoScoutEnabled.value = !autoScoutEnabled.value;
                }}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
}
