/**
 * ProductionQueue - Global production queue indicator bar.
 */

import { globalProductionQueue } from '../store';

export function ProductionQueue() {
  if (globalProductionQueue.value.length === 0) return null;

  return (
    <div class="absolute top-10 md:top-12 left-2 md:left-6 z-20 flex gap-1">
      {globalProductionQueue.value.map((item, i) => (
        <div
          key={
            item.entityId !== undefined ? `prod-${item.entityId}` : `prod-${item.unitLabel}-${i}`
          }
          class="relative w-10 h-6 bg-slate-800 border border-slate-600 rounded overflow-hidden flex items-center justify-center"
        >
          <div
            class="absolute bottom-0 left-0 h-full bg-green-700 opacity-60 transition-all duration-75"
            style={{ width: `${item.progress}%` }}
          />
          <span class="relative text-[8px] font-bold text-slate-200 z-10 truncate px-0.5">
            {item.unitLabel}
          </span>
        </div>
      ))}
    </div>
  );
}
