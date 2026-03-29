/**
 * CtrlGroups - Control group badge buttons.
 */

import { ctrlGroupCounts } from '../store';

export interface CtrlGroupsProps {
  onCtrlGroupClick?: (group: number) => void;
}

export function CtrlGroups(props: CtrlGroupsProps) {
  if (Object.keys(ctrlGroupCounts.value).length === 0) return null;

  return (
    <div class="absolute top-10 md:top-12 right-2 md:right-6 z-20 flex gap-1">
      {Object.entries(ctrlGroupCounts.value)
        .sort(([a], [b]) => Number(a) - Number(b))
        .map(([gnum, count]) => (
          <button
            type="button"
            key={`cg-${gnum}`}
            class="w-7 h-7 min-w-[44px] min-h-[44px] bg-slate-800 border border-sky-600 rounded text-sky-300 font-bold text-xs hover:bg-slate-700 hover:border-sky-400 cursor-pointer flex items-center justify-center transition-colors"
            title={`Group ${gnum} (${count} units) - press ${gnum} to recall`}
            onClick={(e) => {
              e.stopPropagation();
              if (props.onCtrlGroupClick) props.onCtrlGroupClick(Number(gnum));
            }}
          >
            {gnum}
          </button>
        ))}
    </div>
  );
}
