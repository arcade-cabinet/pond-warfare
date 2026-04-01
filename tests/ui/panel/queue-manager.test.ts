/**
 * QueueManager + BuildingRow cancel tests
 *
 * Validates queue display rendering, cancel button per item,
 * and cancel handler invocation.
 */

import { cleanup, fireEvent, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EntityKind } from '@/types';
import { BuildingRow } from '@/ui/panel/BuildingRow';
import { QueueManager } from '@/ui/panel/QueueManager';
import type { RosterBuilding } from '@/ui/roster-types';

afterEach(() => {
  cleanup();
});

describe('QueueManager', () => {
  it('renders a queue item for each entry', () => {
    const onCancel = vi.fn();
    render(
      h(QueueManager, {
        queueItems: ['Brawler', 'Sniper', 'Gatherer'],
        progress: 40,
        onCancel,
      }),
    );

    const items = document.querySelectorAll('[data-testid="queue-item"]');
    expect(items.length).toBe(3);
  });

  it('renders a cancel button for each queue item', () => {
    const onCancel = vi.fn();
    render(
      h(QueueManager, {
        queueItems: ['Brawler', 'Sniper'],
        progress: 50,
        onCancel,
      }),
    );

    const cancelBtns = document.querySelectorAll('[data-testid="queue-cancel-btn"]');
    expect(cancelBtns.length).toBe(2);
  });

  it('calls onCancel with correct index when cancel button is clicked', () => {
    const onCancel = vi.fn();
    render(
      h(QueueManager, {
        queueItems: ['Brawler', 'Sniper'],
        progress: 50,
        onCancel,
      }),
    );

    const cancelBtns = document.querySelectorAll('[data-testid="queue-cancel-btn"]');
    fireEvent.click(cancelBtns[1]);
    expect(onCancel).toHaveBeenCalledWith(1);
  });

  it('shows progress for the active (first) item', () => {
    const onCancel = vi.fn();
    render(
      h(QueueManager, {
        queueItems: ['Brawler', 'Sniper'],
        progress: 75,
        onCancel,
      }),
    );

    const items = document.querySelectorAll('[data-testid="queue-item"]');
    expect(items[0].textContent).toContain('Training: Brawler');
    expect(items[0].textContent).toContain('75%');
    // Second item should not show training prefix
    expect(items[1].textContent).not.toContain('Training:');
    expect(items[1].textContent).toContain('Sniper');
  });

  it('returns null when queue is empty', () => {
    const onCancel = vi.fn();
    render(h(QueueManager, { queueItems: [], progress: 0, onCancel }));

    expect(document.querySelector('[data-testid="queue-manager"]')).toBeNull();
  });
});

function makeBuilding(overrides: Partial<RosterBuilding>): RosterBuilding {
  return {
    eid: 1,
    kind: EntityKind.Armory,
    hp: 200,
    maxHp: 200,
    queueItems: [],
    queueProgress: 0,
    canTrain: [],
    ...overrides,
  };
}

describe('BuildingRow cancel integration', () => {
  it('renders cancel buttons when building has queued items', () => {
    const building = makeBuilding({
      queueItems: ['Brawler', 'Sniper'],
      queueProgress: 30,
      canTrain: [EntityKind.Brawler, EntityKind.Sniper],
    });
    render(
      h(BuildingRow, {
        building,
        onSelect: vi.fn(),
        onTrain: vi.fn(),
        onCancelTrain: vi.fn(),
      }),
    );

    const cancelBtns = document.querySelectorAll('[data-testid="queue-cancel-btn"]');
    expect(cancelBtns.length).toBe(2);
  });

  it('calls onCancelTrain with building eid and queue index on cancel click', () => {
    const onCancelTrain = vi.fn();
    const building = makeBuilding({
      eid: 42,
      queueItems: ['Brawler', 'Sniper'],
      queueProgress: 50,
      canTrain: [EntityKind.Brawler],
    });
    render(
      h(BuildingRow, {
        building,
        onSelect: vi.fn(),
        onTrain: vi.fn(),
        onCancelTrain,
      }),
    );

    const cancelBtns = document.querySelectorAll('[data-testid="queue-cancel-btn"]');
    fireEvent.click(cancelBtns[0]);
    expect(onCancelTrain).toHaveBeenCalledWith(42, 0);

    fireEvent.click(cancelBtns[1]);
    expect(onCancelTrain).toHaveBeenCalledWith(42, 1);
  });

  it('does not render queue manager when queue is empty', () => {
    const building = makeBuilding({ queueItems: [], canTrain: [EntityKind.Brawler] });
    render(
      h(BuildingRow, {
        building,
        onSelect: vi.fn(),
        onTrain: vi.fn(),
        onCancelTrain: vi.fn(),
      }),
    );

    expect(document.querySelector('[data-testid="queue-manager"]')).toBeNull();
  });
});
