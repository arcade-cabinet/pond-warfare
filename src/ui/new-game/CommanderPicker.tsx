/**
 * New Game — Commander Picker
 *
 * Grid of commander cards for the new game modal. Each card shows
 * commander name, title, colored initial circle, aura/passive bonuses,
 * and selected highlight. Taps update store.selectedCommander.
 */

import { COMMANDERS, type CommanderDef } from '@/config/commanders';
import { persistSetting } from '@/storage/settings-persistence';
import { selectedCommander } from '@/ui/store';

/** Map sprite variant names to CSS color values. */
const VARIANT_COLORS: Record<string, string> = {
  blue: 'var(--pw-commander-blue)',
  green: 'var(--pw-commander-green)',
  gold: 'var(--pw-commander-gold)',
  cyan: 'var(--pw-accent)',
  purple: 'var(--pw-commander-purple)',
  red: 'var(--pw-commander-red)',
  yellow: 'var(--pw-commander-yellow)',
};

function CommanderCard({ def, selected }: { def: CommanderDef; selected: boolean }) {
  const color = VARIANT_COLORS[def.spriteVariant] ?? 'var(--pw-accent)';
  const locked = def.unlock !== null;

  return (
    <button
      type="button"
      class="rounded-lg p-3 cursor-pointer transition-all duration-150 text-left w-full"
      style={{
        minHeight: '44px',
        background: selected ? `${color}18` : 'rgba(20, 30, 35, 0.7)',
        border: selected ? `2px solid ${color}` : '2px solid var(--pw-border)',
        boxShadow: selected ? `0 0 12px ${color}30` : 'none',
      }}
      onClick={() => {
        selectedCommander.value = def.id;
        persistSetting('selectedCommander', def.id);
      }}
      data-testid={`commander-${def.id}`}
      aria-pressed={selected}
    >
      <div class="flex items-start gap-3">
        {/* Colored initial circle */}
        <div
          class="flex-shrink-0 flex items-center justify-center rounded-full font-title font-bold text-sm"
          style={{
            width: '40px',
            height: '40px',
            background: `${color}25`,
            border: `2px solid ${color}`,
            color,
          }}
        >
          {def.name.charAt(0).toUpperCase()}
        </div>

        <div class="flex-1 min-w-0">
          {/* Name + title */}
          <div
            class="font-title text-sm tracking-wide"
            style={{ color: selected ? color : 'var(--pw-text-primary)' }}
          >
            {def.name}
          </div>
          <div
            class="font-game text-[9px] tracking-wider uppercase"
            style={{ color: 'var(--pw-text-muted)' }}
          >
            {def.title}
          </div>

          {/* Bonuses */}
          <div class="mt-1.5 space-y-0.5">
            {def.auraDesc !== 'None' && (
              <div class="font-game text-[10px]" style={{ color: 'var(--pw-text-secondary)' }}>
                <span style={{ color }}>Aura:</span> {def.auraDesc}
              </div>
            )}
            {def.passiveDesc !== 'None' && (
              <div class="font-game text-[10px]" style={{ color: 'var(--pw-text-secondary)' }}>
                <span style={{ color }}>Passive:</span> {def.passiveDesc}
              </div>
            )}
          </div>

          {/* Unlock requirement badge */}
          {locked && (
            <div
              class="font-game text-[9px] mt-1 opacity-60"
              style={{ color: 'var(--pw-text-muted)' }}
            >
              Unlock: {def.unlock?.requirement}
            </div>
          )}
        </div>
      </div>
    </button>
  );
}

export function CommanderPicker() {
  const current = selectedCommander.value;

  return (
    <div>
      <div
        class="font-game text-[10px] tracking-wider uppercase mb-2"
        style={{ color: 'var(--pw-text-muted)' }}
      >
        Commander
      </div>
      <div class="grid grid-cols-1 gap-2" data-testid="commander-picker">
        {COMMANDERS.map((def) => (
          <CommanderCard key={def.id} def={def} selected={current === def.id} />
        ))}
      </div>
    </div>
  );
}
