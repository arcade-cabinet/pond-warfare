/**
 * Unlock Progression Display
 *
 * Shows unlock progress on the main menu: total count with progress bar,
 * grouped by category, with locked/unlocked status and NEW badges.
 * Reads from the unlock tracker's cached state.
 */

import { useEffect, useState } from 'preact/hooks';
import { UNLOCK_CATEGORIES, UNLOCKS } from '@/config/unlocks';
import { getNextUnlockHint } from '@/systems/next-unlock-hint';
import { getCachedProfile, getUnlockedIds, loadUnlocks } from '@/systems/unlock-tracker';

/** Recently unlocked IDs (set externally after a game ends). */
const recentlyUnlocked = new Set<string>();

/** Mark an unlock as recently earned (for NEW badge). */
export function markRecentUnlock(id: string): void {
  recentlyUnlocked.add(id);
}

/** Clear recent badges (e.g. when the player opens unlocks panel). */
export function clearRecentUnlocks(): void {
  recentlyUnlocked.clear();
}

export function UnlockProgress() {
  const [unlockedSet, setUnlockedSet] = useState<ReadonlySet<string>>(new Set());

  useEffect(() => {
    loadUnlocks()
      .then(() => {
        setUnlockedSet(new Set(getUnlockedIds()));
      })
      .catch(() => {
        setUnlockedSet(new Set(getUnlockedIds()));
      });
  }, []);

  const totalUnlocked = UNLOCKS.filter((u) => unlockedSet.has(u.id)).length;
  const totalCount = UNLOCKS.length;
  const pct = totalCount > 0 ? (totalUnlocked / totalCount) * 100 : 0;

  return (
    <div class="w-full max-w-[320px]">
      {/* Progress bar */}
      <div class="flex items-center gap-2 mb-1.5">
        <span class="font-numbers text-[11px]" style={{ color: 'var(--pw-unlock)' }}>
          {totalUnlocked}/{totalCount}
        </span>
        <div
          class="flex-1 h-1.5 rounded-full overflow-hidden"
          style={{ background: 'var(--pw-unlock-glow-15)' }}
        >
          <div
            class="h-full rounded-full transition-all"
            style={{
              width: `${pct}%`,
              background: 'linear-gradient(90deg, #a78bfa, #c084fc)',
            }}
          />
        </div>
      </div>

      {/* Category breakdown */}
      <div class="flex flex-wrap gap-1">
        {UNLOCK_CATEGORIES.map((cat) => {
          const catUnlocks = UNLOCKS.filter((u) => u.category === cat.key);
          const catUnlockedCount = catUnlocks.filter((u) => unlockedSet.has(u.id)).length;
          const hasNew = catUnlocks.some((u) => recentlyUnlocked.has(u.id));
          return (
            <CategoryBadge
              key={cat.key}
              label={cat.label}
              count={catUnlockedCount}
              total={catUnlocks.length}
              hasNew={hasNew}
            />
          );
        })}
      </div>
    </div>
  );
}

function CategoryBadge({
  label,
  count,
  total,
  hasNew,
}: {
  label: string;
  count: number;
  total: number;
  hasNew: boolean;
}) {
  const complete = count === total;
  return (
    <span
      class="font-game text-[9px] px-1.5 py-0.5 rounded relative"
      style={{
        background: complete ? 'var(--pw-unlock-glow-15)' : 'var(--pw-white-04)',
        border: complete ? `1px solid var(--pw-unlock-glow-40)` : `1px solid var(--pw-white-08)`,
        color: complete ? 'var(--pw-unlock)' : 'var(--pw-text-muted)',
      }}
    >
      {label} {count}/{total}
      {hasNew && (
        <span
          class="absolute -top-1 -right-1 font-heading text-[7px] px-0.5 rounded"
          style={{ background: 'var(--pw-difficulty-speedrun)', color: 'var(--pw-advisor-text)' }}
        >
          NEW
        </span>
      )}
    </span>
  );
}

/** Next unlock hint component for the main menu. */
export function NextUnlockHint() {
  const [hint, setHint] = useState<string | null>(null);

  useEffect(() => {
    loadUnlocks()
      .then(() => {
        const p = getCachedProfile();
        const result = getNextUnlockHint(p);
        if (result) setHint(result.text);
      })
      .catch(() => {});
  }, []);

  if (!hint) return null;

  return (
    <p
      class="font-game text-[10px] mt-1 text-center"
      style={{ color: 'var(--pw-unlock-glow-70)', maxWidth: '280px' }}
    >
      Next: {hint}
    </p>
  );
}
