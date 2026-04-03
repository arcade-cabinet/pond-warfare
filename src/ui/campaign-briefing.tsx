/**
 * CampaignBriefing — Inter-mission briefing screen
 *
 * Shows mission name, objective summary, recommended tech branch,
 * and a "Begin Mission" button. Rendered between campaign missions
 * with a pond watercolor background and mission-specific tint.
 */

import type { MissionDef } from '@/campaign/mission-types';
import type { TechBranch } from '@/config/tech-tree';
import { Frame9Slice } from './components/frame';
import { MenuButton } from './menu-button';

/** Background tint per mission number. */
const MISSION_TINTS: Record<number, string> = {
  1: 'var(--pw-mission-1-tint)',
  2: 'var(--pw-mission-2-tint)',
  3: 'var(--pw-mission-3-tint)',
  4: 'var(--pw-mission-4-tint)',
  5: 'var(--pw-mission-5-tint)',
};

const BRANCH_LABELS: Record<TechBranch, { label: string; color: string }> = {
  lodge: { label: 'Lodge (Economy)', color: 'var(--pw-branch-lodge)' },
  nature: { label: 'Nature (Healing)', color: 'var(--pw-branch-nature)' },
  warfare: { label: 'Warfare (Offense)', color: 'var(--pw-branch-warfare)' },
  fortifications: { label: 'Fortifications (Defense)', color: 'var(--pw-branch-fortifications)' },
  shadow: { label: 'Shadow (Subterfuge)', color: 'var(--pw-branch-shadow)' },
};

interface Props {
  mission: MissionDef;
  onBegin: () => void;
  onBack: () => void;
}

export function CampaignBriefing({ mission, onBegin, onBack }: Props) {
  const tint = MISSION_TINTS[mission.number] ?? 'var(--pw-mission-default-tint)';
  const branch = mission.recommendedBranch ? BRANCH_LABELS[mission.recommendedBranch] : null;

  return (
    <div
      class="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: `linear-gradient(${tint}, var(--pw-surface-campaign))` }}
      data-testid="campaign-briefing"
    >
      <Frame9Slice title={`MISSION ${mission.number}`}>
        <div class="flex flex-col items-center gap-5">
          {/* Header */}
          <div class="text-center">
            <span class="font-heading text-2xl font-bold" style={{ color: 'var(--pw-accent)' }}>
              {mission.title}
            </span>
            <p class="font-game text-sm mt-1" style={{ color: 'var(--pw-text-secondary)' }}>
              {mission.subtitle}
            </p>
          </div>

          {/* Objectives summary */}
          <div class="w-full">
            <h3
              class="font-heading text-xs font-bold tracking-wider mb-2"
              style={{ color: 'var(--pw-text-secondary)' }}
            >
              OBJECTIVES
            </h3>
            <ul class="flex flex-col gap-1">
              {mission.objectives.map((obj) => (
                <li
                  key={obj.id}
                  class="font-game text-xs flex items-center gap-2"
                  style={{ color: 'var(--pw-text-primary)' }}
                >
                  <span style={{ color: 'var(--pw-accent)' }}>&#9679;</span>
                  {obj.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Recommended branch */}
          {branch && (
            <div
              class="w-full text-center font-game text-xs"
              style={{ color: branch.color }}
              data-testid="recommended-branch"
            >
              Recommended: {branch.label}
            </div>
          )}

          {/* Actions */}
          <div class="flex gap-4 mt-2">
            <MenuButton label="Back" onClick={onBack} />
            <MenuButton label="Begin Mission" wide onClick={onBegin} />
          </div>
        </div>
      </Frame9Slice>
    </div>
  );
}
