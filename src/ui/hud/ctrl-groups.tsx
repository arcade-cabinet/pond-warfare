/**
 * CtrlGroups - Control group badge buttons styled as rts-btn warfare tiles.
 */

import { ctrlGroupCounts, lastRecalledGroup } from '../store';

export interface CtrlGroupsProps {
  onCtrlGroupClick?: (group: number) => void;
}

export function CtrlGroups(props: CtrlGroupsProps) {
  if (Object.keys(ctrlGroupCounts.value).length === 0) return null;

  const activeGroup = lastRecalledGroup.value;

  return (
    <div class="absolute top-11 md:top-12 right-2 md:right-6 z-20 flex gap-1">
      {Object.entries(ctrlGroupCounts.value)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([gnum, count]) => {
          const isActive = activeGroup === Number(gnum);
          return (
            <button
              type="button"
              key={`cg-${gnum}`}
              class={`rts-btn min-w-[44px] min-h-[44px] flex items-center justify-center font-numbers font-bold text-xs${isActive ? ' active' : ''}`}
              style={{ padding: '0.25rem 0.5rem', fontSize: '0.85rem' }}
              title={`Group ${gnum} (${count} units) - press ${gnum} to recall`}
              onClick={(e) => {
                e.stopPropagation();
                if (props.onCtrlGroupClick) props.onCtrlGroupClick(Number(gnum));
              }}
            >
              {gnum}
            </button>
          );
        })}
    </div>
  );
}
