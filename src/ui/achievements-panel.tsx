/**
 * Achievements Panel
 *
 * Displays all achievements in a grid layout. Earned achievements
 * show with gold styling; unearned ones appear dimmed.
 * Accessible from the main menu and settings panel.
 */

import { useEffect, useState } from 'preact/hooks';
import { ACHIEVEMENTS, getEarnedAchievements, loadAchievements } from '@/systems/achievements';
import { Frame9Slice } from './components/frame';
import { useScrollDrag } from './hooks/useScrollDrag';
import { achievementsOpen } from './store';

export function AchievementsPanel() {
  const [earned, setEarned] = useState<Set<string>>(new Set());
  const scrollRef = useScrollDrag<HTMLDivElement>();

  useEffect(() => {
    // Load achievements from DB and refresh state
    loadAchievements()
      .then(() => {
        setEarned(new Set(getEarnedAchievements()));
      })
      .catch(() => {
        setEarned(new Set(getEarnedAchievements()));
      });
  }, []);

  if (!achievementsOpen.value) return null;

  const earnedCount = ACHIEVEMENTS.filter((a) => earned.has(a.id)).length;

  return (
    <div
      class="absolute inset-0 z-[60] flex items-center justify-center modal-overlay"
      style={{ background: 'var(--pw-shadow-strong)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          achievementsOpen.value = false;
        }
      }}
    >
      <div
        ref={scrollRef}
        class="relative w-[90vw] max-w-[700px] modal-scroll font-game text-sm z-10"
        style={{ color: 'var(--pw-text-primary)' }}
      >
        <Frame9Slice title="ACHIEVEMENTS">
          <div class="relative">
            {/* Close button */}
            <button
              type="button"
              class="absolute top-0 right-0 rts-btn text-xl leading-none cursor-pointer px-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={() => {
                achievementsOpen.value = false;
              }}
            >
              {'\u2715'}
            </button>

            <p class="font-game text-xs mb-4" style={{ color: 'var(--pw-text-muted)' }}>
              {earnedCount} / {ACHIEVEMENTS.length} unlocked
            </p>

            {/* Achievement grid */}
            <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {ACHIEVEMENTS.map((ach) => {
                const isEarned = earned.has(ach.id);
                return (
                  <div
                    key={ach.id}
                    class="rounded-lg p-3 transition-all"
                    style={{
                      background: isEarned ? 'var(--pw-achieve-glow-08)' : 'var(--pw-white-03)',
                      border: isEarned
                        ? `1px solid var(--pw-achieve-glow-50)`
                        : `1px solid var(--pw-white-08)`,
                      opacity: isEarned ? 1 : 0.5,
                    }}
                  >
                    <div class="flex items-center gap-2 mb-1">
                      <span style={{ fontSize: '14px' }}>{isEarned ? '\u2605' : '\u2606'}</span>
                      <span
                        class="font-heading text-sm tracking-wide"
                        style={{
                          color: isEarned ? 'var(--pw-achievement)' : 'var(--pw-text-muted)',
                        }}
                      >
                        {ach.name}
                      </span>
                    </div>
                    <p
                      class="font-game text-xs pl-5"
                      style={{
                        color: isEarned ? 'var(--pw-text-secondary)' : 'var(--pw-text-muted)',
                      }}
                    >
                      {isEarned ? ach.desc : '???'}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>
        </Frame9Slice>
      </div>
    </div>
  );
}
