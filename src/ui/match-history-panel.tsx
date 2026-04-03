/**
 * Match History Panel
 *
 * Full-screen modal overlay showing recent match results with stats.
 * Accessible from the main menu alongside Leaderboard/Achievements.
 */

import { useEffect, useState } from 'preact/hooks';
import { getMatchHistory, type MatchRecord } from '@/storage/match-history';
import { formatDuration } from '@/systems/leaderboard';
import { Frame9Slice } from './components/frame';
import { useScrollDrag } from './hooks/useScrollDrag';
import { dailyChallengeHistory, dailyChallengeStreak, matchHistoryOpen } from './store';

export function MatchHistoryPanel() {
  const [records, setRecords] = useState<MatchRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const scrollRef = useScrollDrag<HTMLDivElement>();

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getMatchHistory()
      .then((data) => {
        if (!cancelled) {
          setRecords(data);
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
    matchHistoryOpen.value = false;
  };

  return (
    <div
      class="absolute inset-0 z-[60] flex items-center justify-center modal-overlay"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleClose();
      }}
    >
      <div class="absolute inset-0" style={{ background: 'var(--pw-overlay-dark)' }} />

      <div
        ref={scrollRef}
        class="relative w-[480px] max-w-[95vw] max-h-[85dvh] modal-scroll font-game text-sm z-10"
        style={{ color: 'var(--pw-text-primary)' }}
      >
        <Frame9Slice title="MATCH HISTORY">
          <div class="relative">
            {/* Close button */}
            <button
              type="button"
              class="absolute top-0 right-0 rts-btn text-xl leading-none cursor-pointer px-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={handleClose}
              title="Close"
            >
              {'\u2715'}
            </button>

            {/* Daily Challenges section */}
            <ChallengeHistorySection />

            {loading ? (
              <div
                class="text-center py-8 font-game text-sm"
                style={{ color: 'var(--pw-text-muted)' }}
              >
                Loading...
              </div>
            ) : records.length === 0 ? (
              <div
                class="text-center py-8 font-game text-sm"
                style={{ color: 'var(--pw-text-muted)' }}
              >
                No matches played yet. Start a game!
              </div>
            ) : (
              <div class="space-y-2">
                {records.map((r) => (
                  <MatchRow key={r.id} record={r} />
                ))}
              </div>
            )}
          </div>
        </Frame9Slice>
      </div>
    </div>
  );
}

function ChallengeHistorySection() {
  const history = dailyChallengeHistory.value;
  const streak = dailyChallengeStreak.value;

  if (history.length === 0) return null;

  return (
    <div class="mb-4">
      <div class="flex items-center justify-between mb-2">
        <span
          class="font-heading text-xs tracking-wider uppercase"
          style={{ color: 'var(--pw-gold)' }}
        >
          Daily Challenges
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
      <div class="grid grid-cols-7 gap-1">
        {history.map((entry) => (
          <ChallengeDay key={entry.date} entry={entry} />
        ))}
      </div>
    </div>
  );
}

function ChallengeDay({
  entry,
}: {
  entry: { date: string; challengeTitle: string; completed: boolean };
}) {
  const dayLabel = new Date(`${entry.date}T00:00:00Z`).toLocaleDateString('en', {
    weekday: 'narrow',
  });

  return (
    <div
      class="flex flex-col items-center py-1 rounded"
      style={{
        background: entry.completed ? 'var(--pw-victory-glow-06)' : 'var(--pw-white-04)',
        border: entry.completed
          ? '1px solid var(--pw-victory-glow-15)'
          : '1px solid var(--pw-white-08)',
      }}
      title={`${entry.date}: ${entry.challengeTitle}`}
    >
      <span class="font-game text-[9px]" style={{ color: 'var(--pw-text-muted)' }}>
        {dayLabel}
      </span>
      <span
        class="text-sm leading-none mt-0.5"
        style={{
          color: entry.completed ? 'var(--pw-clam)' : 'var(--pw-text-muted)',
        }}
      >
        {entry.completed ? '\u2713' : '\u2013'}
      </span>
    </div>
  );
}

function MatchRow({ record }: { record: MatchRecord }) {
  const isWin = record.result === 'win';
  const dateStr = formatMatchDate(record.date);

  return (
    <div
      class="rounded px-3 py-2"
      style={{
        background: isWin ? 'var(--pw-victory-glow-06)' : 'var(--pw-defeat-glow-06)',
        border: `1px solid ${isWin ? 'var(--pw-victory-glow-15)' : 'var(--pw-defeat-glow-15)'}`,
      }}
    >
      <div class="flex items-center justify-between mb-1">
        <span
          class="font-heading text-xs font-bold uppercase tracking-wider"
          style={{ color: isWin ? 'var(--pw-clam)' : 'var(--pw-enemy-light)' }}
        >
          {isWin ? 'Victory' : 'Defeat'}
        </span>
        <span class="font-numbers text-[10px]" style={{ color: 'var(--pw-text-muted)' }}>
          {dateStr}
        </span>
      </div>

      <div
        class="flex items-center gap-3 text-[11px]"
        style={{ color: 'var(--pw-text-secondary)' }}
      >
        <span class="capitalize">{record.difficulty}</span>
        <span>{'\u00B7'}</span>
        <span class="capitalize">{record.scenario}</span>
        <span>{'\u00B7'}</span>
        <span class="capitalize">{record.commander}</span>
        <span>{'\u00B7'}</span>
        <span>{formatDuration(record.duration)}</span>
      </div>

      <div
        class="flex items-center gap-4 mt-1 text-[10px]"
        style={{ color: 'var(--pw-text-muted)' }}
      >
        <span>Kills: {record.kills}</span>
        <span>Techs: {record.techsResearched}</span>
        <span>Buildings: {record.buildingsBuilt}</span>
        <span class="font-numbers" style={{ color: 'var(--pw-accent)' }}>
          +{record.xpEarned} XP
        </span>
      </div>
    </div>
  );
}

function formatMatchDate(iso: string): string {
  try {
    const d = new Date(iso);
    const month = d.toLocaleString('en', { month: 'short' });
    const day = d.getDate();
    const hours = d.getHours().toString().padStart(2, '0');
    const mins = d.getMinutes().toString().padStart(2, '0');
    return `${month} ${day}, ${hours}:${mins}`;
  } catch {
    return iso;
  }
}
