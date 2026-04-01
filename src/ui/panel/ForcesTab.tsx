/**
 * ForcesTab -- Main roster view for the Command Center panel.
 *
 * Reads the unitRoster signal from the store and renders a ForcesGroup
 * for each non-empty role group. When the roster is empty a placeholder
 * message is shown instead.
 */

import { game } from '@/game';
import { selectEntity } from '@/game/panel-actions';
import { dispatchTaskOverride } from '@/game/task-dispatch';
import { EntityKind } from '@/types';
import { toggleAutoBehavior } from '../game-actions';
import type { UnitRole, UnitTask } from '../roster-types';
import { unitRoster } from '../store';
import { ForcesGroup } from './ForcesGroup';

/** Map roster UnitRole to world autoBehaviors key. */
const ROLE_TO_BEHAVIOR: Record<string, 'gatherer' | 'combat' | 'healer' | 'scout'> = {
  gatherer: 'gatherer',
  combat: 'combat',
  support: 'healer',
  scout: 'scout',
};

/** Toggle auto-behavior for a role, updating both store and world. */
function toggleAutoForRole(role: UnitRole): void {
  const key = ROLE_TO_BEHAVIOR[role];
  if (key) toggleAutoBehavior(key);
}

/** Pan camera to the unit and select it. */
function handleUnitSelect(eid: number): void {
  selectEntity(eid);
}

/** Dispatch a manual task override to the ECS for a unit. */
function handleTaskChange(eid: number, task: UnitTask): void {
  dispatchTaskOverride(game.world, eid, task);
}

/** Map EntityKind to its role for display — same logic as roster-sync. */
function roleForKind(kind: EntityKind): UnitRole {
  if (kind === EntityKind.Gatherer) return 'gatherer';
  if (kind === EntityKind.Commander) return 'commander';
  if (kind === EntityKind.Healer) return 'support';
  if (kind === EntityKind.Scout) return 'scout';
  return 'combat';
}

// silence unused-reference lint for roleForKind (used by future filter logic)
void roleForKind;

export function ForcesTab() {
  const groups = unitRoster.value;
  const hasUnits = groups.length > 0;

  return (
    <div class="flex flex-col gap-2 p-2 overflow-y-auto" style={{ maxHeight: '100%' }}>
      {/* Header */}
      <div
        class="font-heading text-[10px] uppercase tracking-wider"
        style={{
          color: 'var(--pw-accent)',
          borderBottom: '1px solid var(--pw-border)',
          paddingBottom: '4px',
        }}
      >
        Forces
      </div>

      {hasUnits ? (
        groups.map((g) => (
          <ForcesGroup
            key={g.role}
            group={g}
            onAutoToggle={() => toggleAutoForRole(g.role)}
            onUnitSelect={handleUnitSelect}
            onTaskChange={handleTaskChange}
          />
        ))
      ) : (
        <div
          class="text-center py-8 text-[11px]"
          style={{ color: 'var(--pw-text-muted)' }}
          data-testid="no-units"
        >
          No units yet. Train gatherers from the Lodge.
        </div>
      )}
    </div>
  );
}
