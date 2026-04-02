/**
 * Campaign Branch Choice Screen
 *
 * Shown after Mission 3 completes. Player picks between two Mission 4
 * paths: "Predator's Lair" (assault) or "Siege of the Lodge" (defense).
 */

import { BRANCH_MISSIONS, saveBranchChoice } from '@/campaign';
import * as store from './store';

function PathCard({
  path,
  mission,
  onChoose,
}: {
  path: 'A' | 'B';
  mission: { title: string; subtitle: string; briefing: string };
  onChoose: () => void;
}) {
  return (
    <button
      type="button"
      class="flex-1 flex flex-col gap-2 p-4 rounded-lg cursor-pointer transition-all min-h-[200px] text-left"
      style={{
        background: 'rgba(13, 33, 40, 0.85)',
        border: '2px solid rgba(64, 200, 208, 0.3)',
      }}
      onClick={onChoose}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'var(--pw-accent)';
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(64, 200, 208, 0.3)';
      }}
    >
      <span
        class="font-heading text-sm uppercase tracking-wider"
        style={{ color: 'var(--pw-accent)' }}
      >
        Path {path}
      </span>
      <span class="font-heading text-lg font-bold" style={{ color: 'var(--pw-text-primary)' }}>
        {mission.title}
      </span>
      <span class="font-game text-xs italic" style={{ color: 'var(--pw-text-secondary)' }}>
        {mission.subtitle}
      </span>
      <p
        class="font-game text-xs leading-relaxed mt-1 whitespace-pre-line"
        style={{ color: 'var(--pw-text-muted)' }}
      >
        {mission.briefing}
      </p>
      <span
        class="mt-auto font-heading text-xs uppercase tracking-wider self-center py-2 px-4 rounded"
        style={{ background: 'rgba(64, 200, 208, 0.15)', color: 'var(--pw-accent)' }}
      >
        Choose This Path
      </span>
    </button>
  );
}

export function CampaignChoiceOverlay() {
  if (!store.campaignChoiceOpen.value) return null;

  const choose = (path: 'A' | 'B') => {
    store.campaignBranchPath.value = path;
    store.campaignChoiceOpen.value = false;
    saveBranchChoice(path).catch(() => {});
  };

  return (
    <div
      class="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0, 0, 0, 0.8)' }}
    >
      <div class="flex flex-col gap-4 max-w-2xl w-full">
        <h2
          class="font-heading text-xl text-center uppercase tracking-widest"
          style={{ color: 'var(--pw-accent)' }}
        >
          Choose Your Path
        </h2>
        <p class="font-game text-sm text-center" style={{ color: 'var(--pw-text-secondary)' }}>
          Mission 3 complete. Two paths lie ahead -- choose wisely.
        </p>
        <div class="flex gap-4 flex-col sm:flex-row">
          <PathCard path="A" mission={BRANCH_MISSIONS.A} onChoose={() => choose('A')} />
          <PathCard path="B" mission={BRANCH_MISSIONS.B} onChoose={() => choose('B')} />
        </div>
      </div>
    </div>
  );
}
