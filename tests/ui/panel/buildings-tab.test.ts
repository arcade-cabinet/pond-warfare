/**
 * BuildingsTab Tests
 *
 * Tests that the Buildings tab renders from the buildingRoster signal,
 * sorts buildings correctly (Lodge first), and shows an empty state.
 */

import { cleanup, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { EntityKind } from '@/types';
import { BuildingsTab } from '@/ui/panel/BuildingsTab';
import type { RosterBuilding } from '@/ui/roster-types';
import * as store from '@/ui/store';

function makeBuilding(
  overrides: Partial<RosterBuilding> & { eid: number; kind: EntityKind },
): RosterBuilding {
  return {
    hp: 200,
    maxHp: 200,
    queueItems: [],
    queueProgress: 0,
    canTrain: [],
    ...overrides,
  };
}

beforeEach(() => {
  store.buildingRoster.value = [];
});

afterEach(() => {
  cleanup();
});

describe('BuildingsTab', () => {
  it('shows empty state when no buildings exist', () => {
    render(h(BuildingsTab, {}));
    const empty = document.querySelector('[data-testid="buildings-empty"]');
    expect(empty).toBeTruthy();
    expect(empty?.textContent).toContain('No buildings');
  });

  it('renders building rows from buildingRoster signal', () => {
    store.buildingRoster.value = [
      makeBuilding({ eid: 1, kind: EntityKind.Lodge }),
      makeBuilding({ eid: 2, kind: EntityKind.Tower }),
    ];
    render(h(BuildingsTab, {}));
    const rows = document.querySelectorAll('[data-testid="building-row"]');
    expect(rows.length).toBe(2);
  });

  it('sorts Lodge first, then production, then defensive', () => {
    store.buildingRoster.value = [
      makeBuilding({ eid: 3, kind: EntityKind.Wall }),
      makeBuilding({ eid: 1, kind: EntityKind.Armory }),
      makeBuilding({ eid: 2, kind: EntityKind.Lodge }),
    ];
    render(h(BuildingsTab, {}));
    const names = Array.from(document.querySelectorAll('[data-testid="building-name-btn"]'));
    const labels = names.map((el) => el.textContent?.trim());
    expect(labels[0]).toBe('Lodge');
    expect(labels[1]).toBe('Armory');
    expect(labels[2]).toBe('Wall');
  });

  it('does not show buildings-tab container when empty', () => {
    render(h(BuildingsTab, {}));
    const tab = document.querySelector('[data-testid="buildings-tab"]');
    expect(tab).toBeNull();
  });
});
