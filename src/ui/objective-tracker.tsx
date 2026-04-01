/**
 * Objective Tracker HUD
 *
 * Renders the active campaign objectives in the top-center area,
 * similar to the nest objective bar but showing all mission objectives.
 */

import { CAMPAIGN_MISSIONS } from '@/campaign/missions';
import { campaignMissionId, campaignObjectiveStatuses } from './store';

export function ObjectiveTracker() {
  const missionId = campaignMissionId.value;
  if (!missionId) return null;

  const mission = CAMPAIGN_MISSIONS.find((m) => m.id === missionId);
  if (!mission) return null;

  // Read objective status from store signals
  const statuses = campaignObjectiveStatuses.value;

  return (
    <div
      class="absolute top-10 md:top-11 left-1/2 -translate-x-1/2 z-15 flex flex-col items-center gap-1 rounded px-3 py-2"
      style={{
        background: 'rgba(12, 26, 31, 0.8)',
        border: '1px solid var(--pw-border)',
        minWidth: '200px',
      }}
    >
      <span
        class="font-heading font-bold text-[10px] tracking-wider"
        style={{ color: 'var(--pw-accent)' }}
      >
        {mission.title.toUpperCase()}
      </span>
      {mission.objectives.map((obj) => {
        const done = statuses[obj.id] ?? false;
        return (
          <div key={obj.id} class="flex items-center gap-2 text-[10px] md:text-xs font-game">
            <span
              style={{
                color: done ? 'var(--pw-success)' : 'var(--pw-text-muted)',
              }}
            >
              {done ? '\u2713' : '\u25CB'}
            </span>
            <span
              style={{
                color: done ? 'var(--pw-success)' : 'var(--pw-text-primary)',
                textDecoration: done ? 'line-through' : 'none',
              }}
            >
              {obj.label}
            </span>
          </div>
        );
      })}
    </div>
  );
}
