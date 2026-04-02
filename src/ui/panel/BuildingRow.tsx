/** BuildingRow -- Single building card with HP, training progress, and train picker. */

import { useState } from 'preact/hooks';
import { ENTITY_DEFS, entityKindName } from '@/config/entity-defs';
import type { EntityKind } from '@/types';
import { GameButton } from '../components/GameButton';
import type { RosterBuilding } from '../roster-types';
import { hideTooltip, showTooltip } from '../tooltip-helpers';
import { QueueManager } from './QueueManager';
import { TrainPicker } from './TrainPicker';

export interface BuildingRowProps {
  building: RosterBuilding;
  onSelect: (eid: number) => void;
  onTrain: (buildingEid: number, unitKind: EntityKind) => void;
  onCancelTrain?: (buildingEid: number, queueIndex: number) => void;
}

function hpColor(pct: number): string {
  if (pct > 0.6) return 'var(--pw-success)';
  if (pct > 0.3) return 'var(--pw-warning)';
  return 'var(--pw-enemy-light)';
}

const BAR_TRACK = { height: '3px', background: 'var(--pw-bar-track)' } as const;
const NAME_BTN_STYLE = {
  color: 'var(--pw-text-primary)',
  background: 'none',
  border: 'none',
  padding: 0,
} as const;

function ThinBar({ pct, color, testId }: { pct: number; color: string; testId?: string }) {
  const w = `${Math.max(0, Math.min(100, pct))}%`;
  return (
    <div class="mt-0.5 rounded-full overflow-hidden" style={BAR_TRACK}>
      <div
        class="h-full rounded-full transition-all"
        style={{ width: w, background: color }}
        data-testid={testId}
      />
    </div>
  );
}

export function BuildingRow({ building, onSelect, onTrain, onCancelTrain }: BuildingRowProps) {
  const [pickerOpen, setPickerOpen] = useState(false);
  const name = entityKindName(building.kind) ?? 'Building';
  const hpPct = building.maxHp > 0 ? building.hp / building.maxHp : 0;
  const def = ENTITY_DEFS[building.kind];

  const onMouseEnter = (e: MouseEvent) => {
    const statLines = [{ label: 'HP', value: `${building.hp}/${building.maxHp}` }];
    if (building.canTrain.length > 0) {
      const trainNames = building.canTrain.map((k) => entityKindName(k) ?? '?').join(', ');
      statLines.push({ label: 'Trains', value: trainNames });
    }
    if (building.queueItems.length > 0) {
      statLines.push({ label: 'Queue', value: building.queueItems.join(', ') });
    }
    if (def?.foodProvided) {
      statLines.push({ label: 'Food Cap', value: `+${def.foodProvided}` });
    }
    if (def?.damage) {
      statLines.push({ label: 'Damage', value: `${def.damage}` });
      statLines.push({ label: 'Range', value: `${def.attackRange}` });
    }
    showTooltip(e, { title: name, cost: '', description: '', hotkey: '', statLines });
  };

  return (
    <div
      class="rounded p-2"
      style={{ background: 'var(--pw-wood-dark)', border: '1px solid var(--pw-border)' }}
      data-testid="building-row"
      onMouseEnter={onMouseEnter}
      onMouseLeave={hideTooltip}
    >
      <div class="flex items-center justify-between">
        <button
          type="button"
          class="font-heading text-[11px] font-bold cursor-pointer truncate"
          style={NAME_BTN_STYLE}
          data-testid="building-name-btn"
          onClick={() => onSelect(building.eid)}
        >
          {name}
        </button>
        <span
          class="font-numbers text-[9px] flex-shrink-0"
          style={{ color: 'var(--pw-text-secondary)' }}
        >
          HP: {building.hp}/{building.maxHp}
        </span>
      </div>
      <ThinBar pct={hpPct * 100} color={hpColor(hpPct)} testId="building-hp-bar" />
      {building.queueItems.length > 0 && (
        <QueueManager
          queueItems={building.queueItems}
          progress={building.queueProgress}
          onCancel={(idx) => onCancelTrain?.(building.eid, idx)}
        />
      )}
      {building.canTrain.length > 0 && (
        <div class="mt-1.5">
          {!pickerOpen ? (
            <GameButton
              label="+ Train"
              onClick={() => setPickerOpen(true)}
              variant="secondary"
              size="sm"
              testId="train-btn"
            />
          ) : (
            <TrainPicker
              canTrain={building.canTrain}
              onTrain={(kind) => {
                onTrain(building.eid, kind);
                setPickerOpen(false);
              }}
              onClose={() => setPickerOpen(false)}
            />
          )}
        </div>
      )}
    </div>
  );
}
