/**
 * BuildingsTab -- Building list view for the Command Center panel.
 *
 * Reads the `buildingRoster` signal from the store and renders a sorted
 * list of BuildingRow components. Buildings are sorted: Lodge first, then
 * production buildings (Armory, Nest-like), then defensive (Tower, Wall),
 * then everything else.
 */

import { ENTITY_DEFS } from '@/config/entity-defs';
import { game } from '@/game';
import { selectBuilding } from '@/game/panel-actions';
import { cancelTrain, train } from '@/input/selection';
import { EntityKind } from '@/types';
import type { RosterBuilding } from '../roster-types';
import { buildingRoster } from '../store';
import { BuildingRow } from './BuildingRow';

/** Sort priority: lower = higher in list. */
function sortPriority(kind: EntityKind): number {
  switch (kind) {
    case EntityKind.Lodge:
      return 0;
    case EntityKind.Armory:
    case EntityKind.Burrow:
    case EntityKind.FishingHut:
    case EntityKind.HerbalistHut:
    case EntityKind.ScoutPost:
      return 1;
    case EntityKind.Tower:
    case EntityKind.Watchtower:
    case EntityKind.Wall:
      return 2;
    default:
      return 3;
  }
}

function sortBuildings(a: RosterBuilding, b: RosterBuilding): number {
  const pa = sortPriority(a.kind);
  const pb = sortPriority(b.kind);
  if (pa !== pb) return pa - pb;
  return a.eid - b.eid;
}

/** Pan camera to the building and select it. */
function handleSelect(eid: number): void {
  selectBuilding(eid);
}

function handleTrain(buildingEid: number, unitKind: EntityKind): void {
  const def = ENTITY_DEFS[unitKind];
  if (!def) return;
  train(game.world, buildingEid, unitKind, def.clamCost ?? 0, def.twigCost ?? 0, def.foodCost ?? 1);
  game.syncUIStore();
}

function handleCancelTrain(buildingEid: number, queueIndex: number): void {
  cancelTrain(game.world, buildingEid, queueIndex);
  game.syncUIStore();
}

export function BuildingsTab() {
  const buildings = buildingRoster.value;

  if (buildings.length === 0) {
    return (
      <div class="flex-1 flex items-center justify-center p-4" data-testid="buildings-empty">
        <span
          class="font-game text-xs italic text-center"
          style={{ color: 'var(--pw-text-muted)' }}
        >
          No buildings yet. Select a Gatherer and right-click to place one.
        </span>
      </div>
    );
  }

  const sorted = [...buildings].sort(sortBuildings);

  return (
    <div class="flex flex-col gap-2 p-2 overflow-y-auto flex-1" data-testid="buildings-tab">
      {sorted.map((b) => (
        <BuildingRow
          key={b.eid}
          building={b}
          onSelect={handleSelect}
          onTrain={handleTrain}
          onCancelTrain={handleCancelTrain}
        />
      ))}
    </div>
  );
}
