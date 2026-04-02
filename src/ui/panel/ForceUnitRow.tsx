/**
 * ForceUnitRow -- Single unit row inside a ForcesGroup.
 *
 * Shows unit kind name, a TaskPicker pill, a thin HP bar, and an optional
 * pin icon when the unit has a manual task override. Tapping the unit name
 * fires onSelect so the camera can pan to it.
 * Hovering the row shows a stat tooltip with HP, damage, range, speed, task.
 */

import { ENTITY_DEFS, entityKindName } from '@/config/entity-defs';
import { clearTaskOverride } from '@/game/resource-finder';
import type { EntityKind } from '@/types';
import type { RosterUnit, UnitTask } from '../roster-types';
import { hideTooltip, showTooltip } from '../tooltip-helpers';
import { TaskPicker } from './TaskPicker';

export interface ForceUnitRowProps {
  unit: RosterUnit;
  onSelect: (eid: number) => void;
  onTaskChange: (eid: number, task: UnitTask) => void;
}

function hpBarColor(pct: number): string {
  if (pct > 0.5) return 'var(--pw-success)';
  if (pct > 0.25) return 'var(--pw-warning)';
  return 'var(--pw-enemy-light)';
}

function taskLabel(task: UnitTask): string {
  const labels: Record<UnitTask, string> = {
    idle: 'Idle',
    'gathering-clams': 'Gathering Clams',
    'gathering-twigs': 'Gathering Twigs',
    'gathering-pearls': 'Gathering Pearls',
    building: 'Building',
    moving: 'Moving',
    attacking: 'Attacking',
    defending: 'Defending',
    patrolling: 'Patrolling',
    healing: 'Healing',
    scouting: 'Scouting',
    dead: 'Dead',
  };
  return labels[task] ?? task;
}

export function ForceUnitRow({ unit, onSelect, onTaskChange }: ForceUnitRowProps) {
  const isIdle = unit.task === 'idle';
  const hpPct = unit.maxHp > 0 ? unit.hp / unit.maxHp : 0;
  const name = entityKindName(unit.kind as EntityKind) ?? 'Unit';
  const def = ENTITY_DEFS[unit.kind as EntityKind];

  const onMouseEnter = (e: MouseEvent) => {
    const statLines = [
      { label: 'HP', value: `${unit.hp}/${unit.maxHp}` },
      { label: 'Damage', value: `${def?.damage ?? 0}` },
      { label: 'Range', value: `${def?.attackRange ?? 0}` },
      { label: 'Speed', value: `${def?.speed ?? 0}` },
      { label: 'Task', value: taskLabel(unit.task) },
    ];
    showTooltip(e, { title: name, cost: '', description: '', hotkey: '', statLines });
  };

  return (
    <div
      class="rounded px-1.5 py-1"
      style={{
        background: isIdle
          ? 'color-mix(in srgb, var(--pw-warning) 8%, transparent)'
          : 'transparent',
        minHeight: 'var(--pw-touch-target, 44px)',
      }}
      data-testid="force-unit-row"
      onMouseEnter={onMouseEnter}
      onMouseLeave={hideTooltip}
    >
      {/* Name + Task picker row */}
      <div class="flex items-center justify-between gap-1">
        <button
          type="button"
          class="text-[10px] font-bold cursor-pointer truncate flex items-center gap-1"
          style={{
            color: isIdle ? 'var(--pw-warning)' : 'var(--pw-text-primary)',
            background: 'none',
            border: 'none',
            padding: 0,
          }}
          data-testid="unit-name-btn"
          onClick={() => onSelect(unit.eid)}
        >
          {unit.hasOverride && (
            <span
              class="text-[8px]"
              style={{ color: 'var(--pw-accent)' }}
              title="Manual task override"
            >
              &#x1F4CC;
            </span>
          )}
          {name}
        </button>
        <div class="flex items-center gap-0.5">
          <TaskPicker
            currentTask={unit.task}
            unitKind={unit.kind}
            onChange={(task) => onTaskChange(unit.eid, task)}
          />
          {unit.hasOverride && (
            <button
              type="button"
              class="text-[10px] cursor-pointer"
              style={{
                color: 'var(--pw-text-secondary)',
                background: 'none',
                border: 'none',
                padding: '2px',
                lineHeight: 1,
              }}
              title="Return to auto-behavior"
              data-testid="unpin-btn"
              onClick={(e) => {
                e.stopPropagation();
                clearTaskOverride(unit.eid);
              }}
            >
              &#x2298;
            </button>
          )}
        </div>
      </div>

      {/* HP bar */}
      <div
        class="mt-0.5 rounded-full overflow-hidden"
        style={{ height: '3px', background: 'var(--pw-bar-track)' }}
      >
        <div
          class="h-full rounded-full transition-all"
          style={{
            width: `${Math.max(0, Math.min(100, hpPct * 100))}%`,
            background: hpBarColor(hpPct),
          }}
          data-testid="hp-bar"
        />
      </div>
    </div>
  );
}
