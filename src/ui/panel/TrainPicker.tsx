/**
 * TrainPicker -- Inline unit picker for building training queue.
 *
 * Expands in-place (not a modal) to show trainable unit kinds for a
 * given building. Each option shows the unit name and resource cost
 * read from ENTITY_DEFS. Selecting a unit fires onTrain and closes.
 */

import { ENTITY_DEFS, entityKindName } from '@/config/entity-defs';
import type { EntityKind } from '@/types';

export interface TrainPickerProps {
  canTrain: EntityKind[];
  onTrain: (kind: EntityKind) => void;
  onClose: () => void;
}

/** Format a cost value with its color. Returns null if cost is 0 or missing. */
function costTag(
  value: number | undefined,
  color: string,
  label: string,
): { text: string; color: string } | null {
  if (!value || value <= 0) return null;
  return { text: `${value} ${label}`, color };
}

interface TrainOptionProps {
  kind: EntityKind;
  onTrain: (kind: EntityKind) => void;
}

function TrainOption({ kind, onTrain }: TrainOptionProps) {
  const name = entityKindName(kind) ?? 'Unit';
  const def = ENTITY_DEFS[kind];

  const costs: { text: string; color: string }[] = [];
  if (def) {
    const clam = costTag(def.clamCost, 'var(--pw-clam)', 'Clams');
    const twig = costTag(def.twigCost, 'var(--pw-twig)', 'Twigs');
    if (clam) costs.push(clam);
    if (twig) costs.push(twig);
  }

  return (
    <button
      type="button"
      class="action-btn w-full text-left px-2 py-1.5 rounded text-[10px] font-bold min-h-[36px] flex items-center justify-between gap-2"
      data-testid="train-option"
      onClick={(e) => {
        e.stopPropagation();
        onTrain(kind);
      }}
    >
      <span class="font-heading">{name}</span>
      {costs.length > 0 && (
        <span class="flex gap-1.5 flex-shrink-0">
          {costs.map((c) => (
            <span key={c.text} class="font-numbers text-[8px]" style={{ color: c.color }}>
              {c.text}
            </span>
          ))}
        </span>
      )}
    </button>
  );
}

export function TrainPicker({ canTrain, onTrain, onClose }: TrainPickerProps) {
  return (
    <div
      class="rounded p-1.5 flex flex-col gap-1"
      style={{
        background: 'var(--pw-wood-mid)',
        border: '1px solid var(--pw-border-accent)',
      }}
      data-testid="train-picker"
    >
      <div class="flex items-center justify-between mb-0.5">
        <span
          class="font-heading text-[9px] uppercase tracking-wider"
          style={{ color: 'var(--pw-accent)' }}
        >
          Train Unit
        </span>
        <button
          type="button"
          class="text-[10px] font-bold cursor-pointer px-1"
          style={{
            color: 'var(--pw-text-muted)',
            background: 'none',
            border: 'none',
          }}
          data-testid="train-picker-close"
          onClick={(e) => {
            e.stopPropagation();
            onClose();
          }}
        >
          X
        </button>
      </div>
      {canTrain.map((kind) => (
        <TrainOption key={kind} kind={kind} onTrain={onTrain} />
      ))}
    </div>
  );
}
