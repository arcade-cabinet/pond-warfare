/**
 * ProductionQueue - Global production queue indicator bar.
 */

import { globalProductionQueue } from '../store';

export function ProductionQueue() {
  if (globalProductionQueue.value.length === 0) return null;

  return (
    <div class="absolute top-11 md:top-12 left-2 md:left-6 z-20 flex gap-1">
      {globalProductionQueue.value.map((item, i) => (
        <div
          key={
            item.entityId !== undefined ? `prod-${item.entityId}` : `prod-${item.unitLabel}-${i}`
          }
          class="relative w-10 h-6 rounded overflow-hidden flex items-center justify-center"
          style={{
            background: 'var(--pw-bg-surface)',
            border: '1px solid var(--pw-border)',
          }}
        >
          <div
            class="absolute bottom-0 left-0 h-full transition-all duration-75"
            style={{ width: `${item.progress}%`, background: 'var(--pw-success)', opacity: 0.5 }}
          />
          <span class="relative text-[8px] font-numbers font-bold z-10 truncate px-0.5" style={{ color: 'var(--pw-text-primary)' }}>
            {item.unitLabel}
          </span>
        </div>
      ))}
    </div>
  );
}
