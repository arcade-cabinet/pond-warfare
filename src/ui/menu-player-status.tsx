/**
 * Menu Player Status
 *
 * Displays rank badge, player level, XP progress bar, and daily challenge
 * on the main menu. Extracted from MainMenu for file size compliance.
 */

import { useEffect, useState } from 'preact/hooks';
import { getPlayerProfile, getSetting } from '@/storage';
import { dailyChallengeKey, getDailyChallenge } from '@/systems/daily-challenges';
import { getRank, type RankInfo } from '@/systems/leaderboard';
import { getLevel, levelProgress } from '@/systems/player-xp';

interface PlayerStatus {
  rank: RankInfo | null;
  level: number;
  xpProgress: number;
  dailyTitle: string;
  dailyDesc: string;
  dailyDone: boolean;
}

export function MenuPlayerStatus({ compact }: { compact: boolean }) {
  const [status, setStatus] = useState<PlayerStatus>({
    rank: null,
    level: 0,
    xpProgress: 0,
    dailyTitle: '',
    dailyDesc: '',
    dailyDone: false,
  });

  useEffect(() => {
    const challenge = getDailyChallenge();
    const next: Partial<PlayerStatus> = {
      dailyTitle: challenge.title,
      dailyDesc: challenge.description,
    };

    Promise.all([getPlayerProfile(), getSetting(dailyChallengeKey())])
      .then(([profile, challengeVal]) => {
        setStatus({
          rank: getRank(profile.total_wins),
          level: getLevel(profile.total_xp),
          xpProgress: levelProgress(profile.total_xp),
          dailyTitle: next.dailyTitle!,
          dailyDesc: next.dailyDesc!,
          dailyDone: challengeVal === 'completed',
        });
      })
      .catch(() => {});
  }, []);

  const { rank, level, xpProgress, dailyTitle, dailyDesc, dailyDone } = status;

  return (
    <>
      <p
        class="font-heading text-xs md:text-sm mt-1 tracking-wider text-center"
        style={{ color: 'rgba(180,220,210,0.8)' }}
      >
        Defend the Pond. Conquer the Wild.
        {rank && (
          <span class="ml-2" title={rank.label} style={{ color: rank.color }}>
            {rank.icon} {rank.label}
          </span>
        )}
        {level > 0 && (
          <span class="ml-2 font-numbers" style={{ color: 'var(--pw-accent)' }}>
            Lv.{level}
          </span>
        )}
      </p>

      {/* XP progress bar */}
      <div
        class="mt-1 mx-auto rounded-full overflow-hidden"
        style={{
          width: compact ? '120px' : '160px',
          height: '4px',
          background: 'rgba(64, 200, 208, 0.15)',
        }}
      >
        <div
          class="h-full rounded-full"
          style={{
            width: `${Math.round(xpProgress * 100)}%`,
            background: 'var(--pw-accent)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Daily challenge */}
      <div
        class="mt-1 text-center"
        style={{
          color: dailyDone ? 'var(--pw-accent)' : 'rgba(180,220,210,0.6)',
          fontSize: '10px',
        }}
      >
        {dailyDone ? '\u2713 ' : ''}Daily: {dailyTitle}
        {!dailyDone && (
          <span style={{ color: 'rgba(180,220,210,0.4)' }}>
            {' '}
            {'\u2014'} {dailyDesc}
          </span>
        )}
      </div>
    </>
  );
}
