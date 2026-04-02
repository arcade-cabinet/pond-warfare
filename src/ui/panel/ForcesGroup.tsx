/** ForcesGroup -- Collapsible group header with auto-toggle and unit list. */

import { useState } from 'preact/hooks';
import { AutoToggle } from '../components/AutoToggle';
import type { RosterGroup, UnitTask } from '../roster-types';
import { ForceUnitRow } from './ForceUnitRow';

export interface ForcesGroupProps {
  group: RosterGroup;
  onAutoToggle: () => void;
  onUnitSelect: (eid: number) => void;
  onTaskChange: (eid: number, task: UnitTask) => void;
}

const ROLE_COLORS: Record<string, string> = {
  gatherer: 'var(--pw-warning)',
  combat: 'var(--pw-enemy-light)',
  support: 'var(--pw-success)',
  scout: 'var(--pw-scout)',
  commander: 'var(--pw-accent)',
};

export function ForcesGroup({ group, onAutoToggle, onUnitSelect, onTaskChange }: ForcesGroupProps) {
  const [collapsed, setCollapsed] = useState(false);
  const color = ROLE_COLORS[group.role] ?? 'var(--pw-text-primary)';
  const showAutoToggle = group.role !== 'commander';

  return (
    <div
      class="rounded"
      style={{ border: `1px solid color-mix(in srgb, ${color} 30%, transparent)` }}
      data-testid="forces-group"
    >
      {/* Header */}
      <button
        type="button"
        class="flex items-center justify-between w-full px-2 py-1 cursor-pointer min-h-[36px]"
        style={{
          background: `color-mix(in srgb, ${color} 8%, var(--pw-wood-dark))`,
          border: 'none',
          borderBottom: collapsed
            ? 'none'
            : `1px solid color-mix(in srgb, ${color} 20%, transparent)`,
        }}
        data-testid="group-header"
        onClick={() => setCollapsed(!collapsed)}
      >
        <span class="flex items-center gap-1.5">
          <span class="text-[10px] font-heading font-bold" style={{ color }}>
            {collapsed ? '\u25B6' : '\u25BC'}{' '}
            {group.role.charAt(0).toUpperCase() + group.role.slice(1)}
          </span>
          <span class="text-[9px] font-numbers" style={{ color: 'var(--pw-text-muted)' }}>
            ({group.units.length})
          </span>
          {group.idleCount > 0 && (
            <span
              class="px-1 rounded-full text-[8px] font-bold"
              style={{
                background: 'color-mix(in srgb, var(--pw-warning) 20%, transparent)',
                color: 'var(--pw-warning)',
              }}
              data-testid="idle-badge"
            >
              {group.idleCount} idle
            </span>
          )}
        </span>

        {showAutoToggle && (
          <span onClick={(e) => e.stopPropagation()}>
            <AutoToggle
              label="Auto"
              enabled={group.autoEnabled}
              color={color}
              onToggle={onAutoToggle}
            />
          </span>
        )}
      </button>

      {/* Unit list */}
      {!collapsed && (
        <div class="flex flex-col gap-0.5 p-1" data-testid="unit-list">
          {group.units.map((u) => (
            <ForceUnitRow
              key={u.eid}
              unit={u}
              onSelect={onUnitSelect}
              onTaskChange={onTaskChange}
            />
          ))}
        </div>
      )}
    </div>
  );
}
