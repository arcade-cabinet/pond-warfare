/**
 * Rewards Screen (v3.0 -- US13)
 *
 * Post-match overlay showing match result, stat breakdown, Clam rewards,
 * and options to rank up, visit upgrades, or play again.
 *
 * Design bible: Frame9Slice wrapper, font-heading headers,
 * rts-btn buttons, design token colors.
 */

import { useMemo } from 'preact/hooks';
import {
  generateRewardStatLines,
  getResultTitle,
  type RewardBreakdown,
} from '@/game/match-rewards';
import { BuildStampFooter } from '@/ui/components/BuildStampFooter';
import { Frame9Slice } from '@/ui/components/frame';
import { COLORS } from '@/ui/design-tokens';

export interface RewardsScreenProps {
  breakdown: RewardBreakdown;
  kills: number;
  eventsCompleted: number;
  resourcesGathered: number;
  durationSeconds: number;
  canRankUp: boolean;
  prestigeRank: number;
  onRankUp: () => void;
  onUpgrades: () => void;
  onPlayAgain: () => void;
}

export function RewardsScreen({
  breakdown,
  kills,
  eventsCompleted,
  resourcesGathered,
  durationSeconds,
  canRankUp,
  prestigeRank,
  onRankUp,
  onUpgrades,
  onPlayAgain,
}: RewardsScreenProps) {
  const result = breakdown.isWin ? 'win' : 'loss';
  const { title, subtitle, color } = useMemo(() => getResultTitle(result), [result]);

  const statLines = useMemo(
    () =>
      generateRewardStatLines(
        {
          result,
          durationSeconds,
          kills,
          resourcesGathered,
          eventsCompleted,
          prestigeRank,
        },
        breakdown,
      ),
    [result, durationSeconds, kills, resourcesGathered, eventsCompleted, prestigeRank, breakdown],
  );

  return (
    <div
      class="absolute inset-0 flex items-center justify-center z-40"
      style={{
        background:
          'radial-gradient(ellipse at 50% 40%, rgba(197,160,89,0.08), rgba(0,0,0,0.9) 60%)',
      }}
    >
      <div class="w-[380px] max-w-[92vw]">
        <Frame9Slice>
          <div class="px-5 py-4 flex flex-col items-center gap-3">
            {/* Result title */}
            <h2
              class="font-heading text-3xl tracking-widest uppercase"
              style={{ color, textShadow: `0 0 20px ${color}40` }}
            >
              {title}
            </h2>
            <span class="font-game text-sm" style={{ color: COLORS.weatheredSteel }}>
              {subtitle}
            </span>

            {/* Stat lines */}
            <div class="w-full mt-1">
              {statLines.map((line, i) => {
                if (line === '---') {
                  return (
                    <div
                      key={`sep-${i}`}
                      class="my-1.5"
                      style={{ borderTop: '1px solid rgba(197,160,89,0.15)' }}
                    />
                  );
                }
                const isTotalLine = line.startsWith('Total Clams');
                return (
                  <div key={`line-${i}`} class="flex justify-between py-0.5 px-1">
                    <span
                      class={`font-game text-xs ${isTotalLine ? 'font-bold' : ''}`}
                      style={{
                        color: isTotalLine ? COLORS.grittyGold : COLORS.weatheredSteel,
                      }}
                    >
                      {line.split(':')[0]}
                    </span>
                    {line.includes(':') && (
                      <span
                        class={`font-numbers text-xs ${isTotalLine ? 'font-bold' : ''}`}
                        style={{
                          color: isTotalLine ? COLORS.grittyGold : COLORS.sepiaText,
                        }}
                      >
                        {line.split(':').slice(1).join(':').trim()}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Total Clams highlight */}
            <div
              class="w-full text-center py-2 rounded"
              style={{ background: 'rgba(197,160,89,0.1)' }}
            >
              <span class="font-heading text-xs" style={{ color: COLORS.weatheredSteel }}>
                Clams Earned
              </span>
              <div class="font-numbers text-2xl font-bold" style={{ color: COLORS.grittyGold }}>
                +{breakdown.totalClams}
              </div>
            </div>

            {/* Buttons */}
            <div class="flex flex-col gap-2 w-full mt-1">
              {canRankUp && (
                <button
                  type="button"
                  class="rts-btn w-full py-2 font-heading text-sm animate-rank-up-pulse"
                  style={{
                    color: COLORS.grittyGold,
                    borderColor: COLORS.grittyGold,
                    textShadow: '0 0 8px rgba(197,160,89,0.3)',
                    minHeight: '44px',
                  }}
                  onClick={onRankUp}
                >
                  RANK UP
                </button>
              )}

              <div class="flex gap-2">
                <button
                  type="button"
                  class="rts-btn flex-1 py-2 font-heading text-sm"
                  style={{
                    color: COLORS.sepiaText,
                    minHeight: '44px',
                    fontSize: '0.85rem',
                  }}
                  onClick={onUpgrades}
                >
                  Upgrades
                </button>
                <button
                  type="button"
                  class="rts-btn flex-1 py-2 font-heading text-sm"
                  style={{
                    color: COLORS.mossGreen,
                    borderColor: COLORS.mossGreen,
                    minHeight: '44px',
                    fontSize: '0.85rem',
                  }}
                  onClick={onPlayAgain}
                >
                  Play Again
                </button>
              </div>
            </div>

            <BuildStampFooter />
          </div>
        </Frame9Slice>
      </div>
    </div>
  );
}
