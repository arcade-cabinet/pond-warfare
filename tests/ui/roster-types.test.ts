import { describe, expect, it } from 'vitest';
import { formatUnitTaskLabel, type UnitTask } from '@/ui/roster-types';

describe('formatUnitTaskLabel', () => {
  const cases: Array<[UnitTask, string]> = [
    ['idle', 'Idle'],
    ['gathering-fish', 'Gathering Fish'],
    ['gathering-logs', 'Gathering Logs'],
    ['gathering-rocks', 'Gathering Rocks'],
    ['building', 'Building'],
    ['moving', 'Moving'],
    ['attacking', 'Attacking'],
    ['defending', 'Defending'],
    ['patrolling', 'Patrolling'],
    ['healing', 'Healing'],
    ['recon', 'Recon'],
    ['dead', 'Dead'],
  ];

  it.each(cases)('formats %s as %s', (task, label) => {
    expect(formatUnitTaskLabel(task)).toBe(label);
  });
});
