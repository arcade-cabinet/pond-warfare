/** TaskPicker -- Inline dropdown for assigning a unit task. */

import { useState } from 'preact/hooks';
import { EntityKind } from '@/types';
import type { UnitTask } from '../roster-types';

export interface TaskPickerProps {
  currentTask: UnitTask;
  unitKind: EntityKind;
  onChange: (task: UnitTask) => void;
}

const TASK_LABELS: Record<UnitTask, string> = {
  idle: 'Idle',
  'gathering-clams': 'Gather Clams',
  'gathering-twigs': 'Gather Twigs',
  'gathering-pearls': 'Gather Pearls',
  building: 'Build',
  moving: 'Moving',
  attacking: 'Attack',
  defending: 'Defend Lodge',
  patrolling: 'Patrol',
  healing: 'Heal',
  scouting: 'Scout',
  dead: 'Dead',
};

const COMBAT_TASKS: UnitTask[] = ['idle', 'patrolling', 'defending', 'attacking'];

const TASKS_BY_KIND: Record<number, UnitTask[]> = {
  [EntityKind.Gatherer]: ['idle', 'gathering-clams', 'gathering-twigs', 'gathering-pearls'],
  [EntityKind.Brawler]: COMBAT_TASKS,
  [EntityKind.Sniper]: COMBAT_TASKS,
  [EntityKind.Shieldbearer]: COMBAT_TASKS,
  [EntityKind.Catapult]: COMBAT_TASKS,
  [EntityKind.Swimmer]: COMBAT_TASKS,
  [EntityKind.Trapper]: COMBAT_TASKS,
  [EntityKind.Healer]: ['idle', 'healing'],
  [EntityKind.Scout]: ['idle', 'scouting'],
  [EntityKind.Commander]: ['idle', 'defending'],
};

function pillColor(task: UnitTask): string {
  if (task === 'idle') return 'var(--pw-warning)';
  if (task.startsWith('gathering') || task === 'building') return 'var(--pw-clam)';
  if (task === 'attacking') return 'var(--pw-enemy-light)';
  if (task === 'healing') return 'var(--pw-success)';
  if (task === 'scouting') return 'var(--pw-scout)';
  return 'var(--pw-accent)';
}

export function TaskPicker({ currentTask, unitKind, onChange }: TaskPickerProps) {
  const [open, setOpen] = useState(false);
  const tasks = TASKS_BY_KIND[unitKind] ?? COMBAT_TASKS;
  const color = pillColor(currentTask);
  const label = TASK_LABELS[currentTask] ?? currentTask;

  return (
    <div class="relative" style={{ zIndex: open ? 20 : 1 }}>
      {/* Pill button */}
      <button
        type="button"
        class="px-2 py-0.5 rounded-full text-[9px] font-bold cursor-pointer min-h-[28px]"
        style={{
          border: `1px solid ${color}`,
          color,
          background: `color-mix(in srgb, ${color} 10%, transparent)`,
        }}
        data-testid="task-pill"
        onClick={(e) => {
          e.stopPropagation();
          setOpen(!open);
        }}
      >
        {label} &#x25BE;
      </button>

      {/* Dropdown */}
      {open && (
        <div
          class="absolute right-0 mt-1 rounded overflow-hidden"
          style={{
            background: 'var(--pw-wood-dark)',
            border: '1px solid var(--pw-border)',
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            minWidth: '120px',
            bottom: 'auto',
          }}
          data-testid="task-dropdown"
        >
          {tasks.map((t) => {
            const active = t === currentTask;
            const c = pillColor(t);
            return (
              <button
                key={t}
                type="button"
                class="block w-full text-left px-2 py-1.5 text-[9px] font-bold cursor-pointer min-h-[32px]"
                style={{
                  color: active ? c : 'var(--pw-text-primary)',
                  background: active ? `color-mix(in srgb, ${c} 15%, transparent)` : 'transparent',
                  borderBottom: '1px solid var(--pw-border)',
                }}
                onClick={(e) => {
                  e.stopPropagation();
                  onChange(t);
                  setOpen(false);
                }}
              >
                {active ? '\u2713 ' : ''}
                {TASK_LABELS[t]}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
