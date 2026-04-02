/**
 * Match History Panel
 *
 * Full-screen modal overlay showing recent match results with stats.
 * Accessible from the main menu alongside Leaderboard/Achievements.
 */

import { useEffect, useState } from 'preact/hooks';
import { getMatchHistory, type MatchRecord } from '@/storage/match-history';
import { formatDuration } from '@/systems/leaderboard';
import { useScrollDrag } from './hooks/useScrollDrag';
import { matchHistoryOpen } from './store';

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
      <div class="absolute inset-0" style={{ background: 'rgba(12, 26, 31, 0.85)' }} />

      <div
        ref={scrollRef}
        class="relative rounded-lg shadow-2xl w-[480px] max-w-[95vw] max-h-[85dvh] modal-scroll p-5 md:p-6 font-game text-sm z-10 parchment-panel pond-panel-bg"
        style={{ color: 'var(--pw-text-primary)' }}
      >
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-title text-xl tracking-wide" style={{ color: 'var(--pw-accent)' }}>
            Match History
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

        {loading ? (
          <div class="text-center py-8 font-game text-sm" style={{ color: 'var(--pw-text-muted)' }}>
            Loading...
          </div>
        ) : records.length === 0 ? (
          <div class="text-center py-8 font-game text-sm" style={{ color: 'var(--pw-text-muted)' }}>
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
        background: isWin ? 'rgba(240, 208, 96, 0.06)' : 'rgba(192, 48, 48, 0.06)',
        border: `1px solid ${isWin ? 'rgba(240, 208, 96, 0.15)' : 'rgba(192, 48, 48, 0.15)'}`,
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
