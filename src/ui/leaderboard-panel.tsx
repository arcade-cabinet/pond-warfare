/**
 * Leaderboard Panel
 *
 * Full-screen modal overlay showing the player's rank badge, personal bests,
 * win streak, and career stats. Accessed from the main menu.
 */

import { useEffect, useState } from 'preact/hooks';
import {
  formatDuration,
  formatPlaytime,
  type LeaderboardData,
  loadLeaderboardData,
  winsToNextRank,
} from '@/systems/leaderboard';
import { useScrollDrag } from './hooks/useScrollDrag';
import { leaderboardOpen } from './store';

export function LeaderboardPanel() {
  const [data, setData] = useState<LeaderboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const scrollRef = useScrollDrag<HTMLDivElement>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    loadLeaderboardData()
      .then((d) => {
        if (!cancelled) {
          setData(d);
          setLoading(false);
        }
      })
      .catch(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleClose = () => {
    leaderboardOpen.value = false;
  };

  return (
    <div
      class="absolute inset-0 z-[60] flex items-center justify-center modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      {/* Backdrop */}
      <div class="absolute inset-0" style={{ background: 'rgba(12, 26, 31, 0.85)' }} />

      {/* Panel card */}
      <div
        ref={scrollRef}
        class="relative rounded-lg shadow-2xl w-[420px] max-w-[95vw] modal-scroll p-5 md:p-6 font-game text-sm z-10 parchment-panel pond-panel-bg"
        style={{ color: 'var(--pw-text-primary)' }}
      >
        {/* Header */}
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-title text-xl tracking-wide" style={{ color: 'var(--pw-accent)' }}>
            Leaderboard
          </h2>
          <button
            type="button"
            class="hud-btn text-xl leading-none cursor-pointer px-2 min-w-[44px] min-h-[44px] flex items-center justify-center rounded"
            onClick={handleClose}
            title="Close"
          >
            {'\u2715'}
          </button>
        </div>

        {loading || !data ? (
          <div class="text-center py-8 font-game text-sm" style={{ color: 'var(--pw-text-muted)' }}>
            Loading...
          </div>
        ) : (
          <>
            {/* Rank badge */}
            <div class="flex flex-col items-center mb-5">
              <div
                class="text-5xl font-bold"
                style={{ color: data.rank.color, textShadow: `0 0 16px ${data.rank.color}40` }}
              >
                {data.rank.icon}
              </div>
              <div
                class="font-heading font-bold text-2xl tracking-wider uppercase mt-1"
                style={{ color: data.rank.color }}
              >
                {data.rank.label}
              </div>
              {winsToNextRank(data.totalWins) > 0 ? (
                <div class="font-game text-xs mt-1" style={{ color: 'var(--pw-text-muted)' }}>
                  {winsToNextRank(data.totalWins)} wins to next rank
                </div>
              ) : (
                <div class="font-game text-xs mt-1" style={{ color: data.rank.color }}>
                  Max rank achieved
                </div>
              )}
            </div>

            {/* Personal bests */}
            <div class="mb-4">
              <div class="section-header mb-2">Personal Bests</div>
              <div class="space-y-1.5">
                <StatRow label="Fastest Win" value={formatDuration(data.fastestWinSeconds)} />
                <StatRow label="Most Kills (career)" value={String(data.totalKills)} />
                <StatRow
                  label="Longest Survival"
                  value={formatDuration(data.longestSurvivalSeconds)}
                />
                <StatRow
                  label="Highest Difficulty Won"
                  value={data.highestDifficultyWon || '--'}
                  capitalize
                />
              </div>
            </div>

            {/* Win streak */}
            <div class="mb-4">
              <div class="section-header mb-2">Win Streak</div>
              <div class="space-y-1.5">
                <StatRow
                  label="Current Streak"
                  value={String(data.winStreak)}
                  highlight={data.winStreak >= 3}
                />
                <StatRow label="Best Streak" value={String(data.bestWinStreak)} />
              </div>
            </div>

            {/* Career stats */}
            <div>
              <div class="section-header mb-2">Career Stats</div>
              <div class="space-y-1.5">
                <StatRow label="Total Games" value={String(data.totalGames)} />
                <StatRow label="Wins" value={String(data.totalWins)} />
                <StatRow label="Losses" value={String(data.totalLosses)} />
                <StatRow
                  label="Win Rate"
                  value={
                    data.totalGames > 0
                      ? `${Math.round((data.totalWins / data.totalGames) * 100)}%`
                      : '--'
                  }
                />
                <StatRow label="Total Playtime" value={formatPlaytime(data.totalPlaytimeSeconds)} />
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function StatRow({
  label,
  value,
  highlight,
  capitalize,
}: {
  label: string;
  value: string;
  highlight?: boolean;
  capitalize?: boolean;
}) {
  return (
    <div class="flex items-center justify-between min-h-[28px]">
      <span class="font-game text-xs" style={{ color: 'var(--pw-text-muted)' }}>
        {label}
      </span>
      <span
        class="font-numbers text-sm"
        style={{
          color: highlight ? 'var(--pw-accent-bright)' : 'var(--pw-text-secondary)',
          textTransform: capitalize ? 'capitalize' : undefined,
        }}
      >
        {value}
      </span>
    </div>
  );
}
