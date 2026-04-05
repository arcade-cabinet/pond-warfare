/**
 * Tooltip – floating tooltip rendered from store signals.
 */

import * as store from '@/ui/store';

export function Tooltip() {
  if (!store.tooltipVisible.value || !store.tooltipData.value) return null;
  const d = store.tooltipData.value;
  return (
    <div
      class="tooltip"
      style={{ left: `${store.tooltipX.value}px`, top: `${store.tooltipY.value}px` }}
    >
      <div class="font-heading font-bold">{d.title}</div>
      {d.status && (
        <div
          class="text-[10px] font-heading font-bold"
          style={{ color: d.statusColor ?? 'var(--pw-text-muted)' }}
        >
          {d.status}
        </div>
      )}
      {d.costBreakdown ? (
        <div class="flex gap-2 font-numbers text-[10px]">
          {d.costBreakdown.fish != null && d.costBreakdown.fish > 0 && (
            <span style={{ color: 'var(--pw-clam)' }}>{d.costBreakdown.fish} Fish</span>
          )}
          {d.costBreakdown.logs != null && d.costBreakdown.logs > 0 && (
            <span style={{ color: 'var(--pw-twig)' }}>{d.costBreakdown.logs} Logs</span>
          )}
          {d.costBreakdown.food != null && d.costBreakdown.food > 0 && (
            <span style={{ color: 'var(--pw-food)' }}>{d.costBreakdown.food} Food</span>
          )}
          {d.costBreakdown.rocks != null && d.costBreakdown.rocks > 0 && (
            <span style={{ color: 'var(--pw-pearl, #e0b0ff)' }}>{d.costBreakdown.rocks} Rocks</span>
          )}
        </div>
      ) : (
        d.cost && (
          <div class="font-numbers" style={{ color: 'var(--pw-accent)' }}>
            {d.cost}
          </div>
        )
      )}
      {d.statLines && d.statLines.length > 0 && (
        <div class="flex flex-col gap-0.5 mt-0.5">
          {d.statLines.map((s) => (
            <div key={s.label} class="flex justify-between gap-3 text-[10px]">
              <span class="font-game" style={{ color: 'var(--pw-text-muted)' }}>
                {s.label}
              </span>
              <span class="font-numbers" style={{ color: 'var(--pw-text-primary)' }}>
                {s.value}
              </span>
            </div>
          ))}
        </div>
      )}
      {d.description && (
        <div class="text-xs font-game" style={{ color: 'var(--pw-text-muted)' }}>
          {d.description}
        </div>
      )}
      {d.requires && (
        <div class="text-[10px] font-game italic" style={{ color: 'var(--pw-warning)' }}>
          {d.requires}
        </div>
      )}
      {d.hotkey && (
        <div class="text-xs font-numbers" style={{ color: 'var(--pw-text-muted)' }}>
          [{d.hotkey}]
        </div>
      )}
    </div>
  );
}
