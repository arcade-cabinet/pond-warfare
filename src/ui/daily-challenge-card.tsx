/**
 * Daily Challenge Card
 *
 * Preview card shown on the main menu displaying today's challenge,
 * XP reward, streak info, and a button to start playing.
 */

import { useEffect, useState } from 'preact/hooks';
import { getSetting } from '@/storage';
import {
  buildRecentHistory,
  calculateStreak,
  STREAK_BONUSES,
} from '@/systems/daily-challenge-streaks';
import { dailyChallengeKey, getDailyChallenge, MS_PER_DAY } from '@/systems/daily-challenges';
import { generateName, generateSeed } from './new-game/presets';
import {
  customGameSettings,
  customMapSeed,
  DEFAULT_CUSTOM_SETTINGS,
  dailyChallengeAlreadyDone,
  dailyChallengeDesc,
  dailyChallengeHistory,
  dailyChallengeStreak,
  dailyChallengeTitle,
  dailyChallengeXp,
  gameName,
  gameSeed,
  menuState,
  permadeathEnabled,
  selectedDifficulty,
} from './store';

interface CardState {
  title: string;
  desc: string;
  xp: number;
  done: boolean;
  streak: number;
}

export function DailyChallengeCard({ compact }: { compact: boolean }) {
  const [state, setState] = useState<CardState | null>(null);

  useEffect(() => {
    loadChallengeState()
      .then(setState)
      .catch(() => {});
  }, []);

  if (!state) return null;

  const { title, desc, xp, done, streak } = state;
  const nextBonus = STREAK_BONUSES.find((b) => b.days > streak);

  const handlePlay = () => {
    selectedDifficulty.value = 'normal';
    permadeathEnabled.value = false;
    customGameSettings.value = { ...DEFAULT_CUSTOM_SETTINGS };
    gameName.value = generateName();
    const seed = generateSeed();
    gameSeed.value = seed;
    customMapSeed.value = String(seed);
    menuState.value = 'playing';
  };

  return (
    <div
      class="relative z-10 mx-auto mb-2"
      style={{ width: compact ? '280px' : '340px', maxWidth: '95vw' }}
    >
      <div
        class="rounded-lg px-4 py-3"
        style={{
          background: 'linear-gradient(135deg, rgba(42,30,16,0.95), rgba(25,30,20,0.95))',
          border: done
            ? '1px solid var(--pw-accent-dim)'
            : '1px solid var(--pw-vine-highlight, #5A8022)',
          boxShadow: done
            ? 'inset 0 0 12px rgba(197,160,89,0.1)'
            : 'inset 0 0 12px rgba(90,128,34,0.15), 0 4px 12px rgba(0,0,0,0.4)',
        }}
      >
        {/* Header */}
        <div class="flex items-center justify-between mb-1">
          <span
            class="font-heading text-xs tracking-wider uppercase"
            style={{ color: 'var(--pw-gold)' }}
          >
            Daily Challenge
          </span>
          {streak > 0 && (
            <span
              class="font-numbers text-[10px] px-1.5 py-0.5 rounded"
              style={{
                background: 'var(--pw-glow-accent)',
                color: 'var(--pw-accent)',
                border: '1px solid var(--pw-accent-dim)',
              }}
            >
              {streak}-day streak
            </span>
          )}
        </div>

        {/* Challenge info */}
        <div class="mb-2">
          <div
            class="font-heading text-sm"
            style={{ color: done ? 'var(--pw-accent)' : 'var(--pw-text-primary)' }}
          >
            {done ? '\u2713 ' : ''}
            {title}
          </div>
          <div class="font-game text-[11px] mt-0.5" style={{ color: 'var(--pw-text-secondary)' }}>
            {desc}
          </div>
        </div>

        {/* Reward + action */}
        <div class="flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="font-numbers text-xs" style={{ color: 'var(--pw-accent)' }}>
              +{xp} XP
            </span>
            {nextBonus && !done && (
              <span class="font-game text-[9px]" style={{ color: 'var(--pw-text-muted)' }}>
                {nextBonus.days - streak} day{nextBonus.days - streak !== 1 ? 's' : ''} to{' '}
                {nextBonus.label}
              </span>
            )}
          </div>
          {!done && (
            <button
              type="button"
              class="rts-btn font-heading text-[11px] px-3 min-h-[32px] tracking-wider"
              onClick={handlePlay}
            >
              Play
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

/** Load today's challenge state and streak from storage. */
async function loadChallengeState(): Promise<CardState> {
  const challenge = getDailyChallenge();
  const challengeVal = await getSetting(dailyChallengeKey());
  const done = challengeVal === 'completed';

  // Build 7-day history to calculate streak
  const completedDates = new Set<string>();
  const now = new Date();
  for (let i = 0; i < 7; i++) {
    const d = new Date(now.getTime() - i * MS_PER_DAY);
    const dateStr = d.toISOString().slice(0, 10);
    const key = `daily_challenge_${dateStr}`;
    const val = await getSetting(key);
    if (val === 'completed') completedDates.add(dateStr);
  }

  const history = buildRecentHistory(completedDates, now);
  const streak = calculateStreak(history, now);

  // Sync to store signals so other components can read them
  dailyChallengeTitle.value = challenge.title;
  dailyChallengeDesc.value = challenge.description;
  dailyChallengeXp.value = challenge.xpReward;
  dailyChallengeAlreadyDone.value = done;
  dailyChallengeStreak.value = streak;
  dailyChallengeHistory.value = history.map((h) => ({
    date: h.date,
    challengeTitle: h.challengeTitle,
    completed: h.completed,
  }));

  return {
    title: challenge.title,
    desc: challenge.description,
    xp: challenge.xpReward,
    done,
    streak,
  };
}
