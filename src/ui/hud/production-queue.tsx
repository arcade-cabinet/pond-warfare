/**
 * ProductionQueue - Global production queue indicator bar.
 *
 * Shows unit icon + progress bar for each unit currently training
 * in any player building. Reads from globalProductionQueue signal
 * which is synced every frame by threat-sync.ts.
 */

import { COLORS } from '../design-tokens';
import { globalProductionQueue } from '../store';

export function ProductionQueue() {
  if (globalProductionQueue.value.length === 0) return null;

  return (
    <div class="absolute top-11 md:top-12 left-2 md:left-6 z-20 flex gap-1.5">
      {globalProductionQueue.value.map((item, i) => (
        <div
          key={
            item.entityId !== undefined ? `prod-${item.entityId}` : `prod-${item.unitLabel}-${i}`
          }
          class="relative w-14 h-8 rounded overflow-hidden flex items-center justify-center"
          style={{
            background: COLORS.bgPanel,
            border: `2px solid var(--pw-border)`,
            boxShadow: `0 0 6px ${COLORS.feedbackInfo}4D`,
          }}
        >
          {/* Progress fill */}
          <div
            class="absolute bottom-0 left-0 h-full transition-all duration-75"
            style={{
              width: `${item.progress}%`,
              background: `${COLORS.feedbackInfo}59`,
            }}
          />
          {/* Unit label */}
          <span
            class="relative text-[9px] font-numbers font-bold z-10 truncate px-1"
            style={{ color: COLORS.sepiaText }}
          >
            {item.unitLabel}
          </span>
          {/* Percentage in corner */}
          <span
            class="absolute bottom-0 right-0.5 text-[7px] font-numbers z-10"
            style={{ color: `${COLORS.feedbackInfo}CC` }}
          >
            {Math.round(item.progress)}%
          </span>
        </div>
      ))}
    </div>
  );
}
