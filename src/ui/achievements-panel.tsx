/**
 * Achievements Panel
 *
 * Displays all achievements in a grid layout. Earned achievements
 * show with gold styling; unearned ones appear dimmed.
 * Accessible from the main menu and settings panel.
 */

import { useEffect, useState } from 'preact/hooks';
import { ACHIEVEMENTS, getEarnedAchievements, loadAchievements } from '@/systems/achievements';
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
      style={{ background: 'rgba(0, 0, 0, 0.75)' }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          achievementsOpen.value = false;
        }
      }}
    >
      <div
        ref={scrollRef}
        class="relative w-[90vw] max-w-[700px] modal-scroll rounded-lg p-6"
        style={{
          background: 'linear-gradient(135deg, #1a2332 0%, #0f1923 100%)',
          border: '1px solid rgba(251, 191, 36, 0.3)',
          boxShadow: '0 0 30px rgba(251, 191, 36, 0.1)',
        }}
      >
        {/* Header */}
        <div class="flex items-center justify-between mb-6">
          <div>
            <h2
              class="font-heading text-xl tracking-wider uppercase"
              style={{ color: 'var(--pw-achievement)' }}
            >
              Achievements
            </h2>
            <p class="font-game text-xs mt-1" style={{ color: 'var(--pw-text-muted)' }}>
              {earnedCount} / {ACHIEVEMENTS.length} unlocked
            </p>
          </div>
          <button
            type="button"
            class="font-heading text-lg px-3 py-1 rounded"
            style={{ color: 'var(--pw-text-muted)' }}
            onClick={() => {
              achievementsOpen.value = false;
            }}
          >
            X
          </button>
        </div>

        {/* Achievement grid */}
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {ACHIEVEMENTS.map((ach) => {
            const isEarned = earned.has(ach.id);
            return (
              <div
                key={ach.id}
                class="rounded-lg p-3 transition-all"
                style={{
                  background: isEarned ? 'rgba(251, 191, 36, 0.08)' : 'rgba(255, 255, 255, 0.03)',
                  border: isEarned
                    ? '1px solid rgba(251, 191, 36, 0.5)'
                    : '1px solid rgba(255, 255, 255, 0.08)',
                  opacity: isEarned ? 1 : 0.5,
                }}
              >
                <div class="flex items-center gap-2 mb-1">
                  <span style={{ fontSize: '14px' }}>{isEarned ? '\u2605' : '\u2606'}</span>
                  <span
                    class="font-heading text-sm tracking-wide"
                    style={{ color: isEarned ? 'var(--pw-achievement)' : 'var(--pw-text-muted)' }}
                  >
                    {ach.name}
                  </span>
                </div>
                <p
                  class="font-game text-xs pl-5"
                  style={{ color: isEarned ? 'var(--pw-text-secondary)' : 'var(--pw-text-muted)' }}
                >
                  {isEarned ? ach.desc : '???'}
                </p>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
