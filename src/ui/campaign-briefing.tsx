/**
 * CampaignBriefing — Inter-mission briefing screen
 *
 * Shows mission name, objective summary, recommended tech branch,
 * and a "Begin Mission" button. Rendered between campaign missions
 * with a pond watercolor background and mission-specific tint.
 */

import type { MissionDef } from '@/campaign/mission-types';
import type { TechBranch } from '@/config/tech-tree';
import { MenuButton } from './menu-button';

/** Background tint per mission number. */
const MISSION_TINTS: Record<number, string> = {
  1: 'rgba(40, 80, 60, 0.25)',
  2: 'rgba(30, 50, 80, 0.30)',
  3: 'rgba(80, 40, 30, 0.25)',
  4: 'rgba(50, 20, 60, 0.30)',
  5: 'rgba(80, 20, 20, 0.35)',
};

const BRANCH_LABELS: Record<TechBranch, { label: string; color: string }> = {
  lodge: { label: 'Lodge (Economy)', color: '#a0d2db' },
  nature: { label: 'Nature (Healing)', color: '#7bc47f' },
  warfare: { label: 'Warfare (Offense)', color: '#e07050' },
  fortifications: { label: 'Fortifications (Defense)', color: '#c0a060' },
  shadow: { label: 'Shadow (Subterfuge)', color: '#9070c0' },
};

interface Props {
  mission: MissionDef;
  onBegin: () => void;
  onBack: () => void;
}

export function CampaignBriefing({ mission, onBegin, onBack }: Props) {
  const tint = MISSION_TINTS[mission.number] ?? 'rgba(20, 40, 50, 0.25)';
  const branch = mission.recommendedBranch ? BRANCH_LABELS[mission.recommendedBranch] : null;

  return (
    <div
      class="absolute inset-0 z-50 flex items-center justify-center"
      style={{ background: `linear-gradient(${tint}, rgba(6,14,18,0.95))` }}
      data-testid="campaign-briefing"
    >
      <div
        class="flex flex-col items-center gap-5 max-w-md w-full px-8 py-10 rounded-lg"
        style={{
          background: 'rgba(19, 40, 48, 0.92)',
          border: '1px solid var(--pw-border)',
        }}
      >
        {/* Header */}
        <div class="text-center">
          <span
            class="font-numbers text-xs tracking-wider"
            style={{ color: 'var(--pw-text-muted)' }}
          >
            MISSION {mission.number}
          </span>
          <h2 class="font-heading text-2xl font-bold mt-1" style={{ color: 'var(--pw-accent)' }}>
            {mission.title}
          </h2>
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
    </div>
  );
}
