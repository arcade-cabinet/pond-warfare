/**
 * Campaign Panel
 *
 * Mission select screen and mission briefing overlay.
 * Shows 5 missions with lock/unlock states and a briefing before launch.
 */

import { useCallback, useEffect, useState } from 'preact/hooks';
import { loadCampaignProgress, type MissionDef } from '@/campaign';
import { CAMPAIGN_MISSIONS } from '@/campaign/missions';
import { useScrollDrag } from './hooks/useScrollDrag';
import { campaignMissionId, campaignOpen, menuState } from './store';

export function CampaignPanel() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [selectedMission, setSelectedMission] = useState<MissionDef | null>(null);
  const [showBriefing, setShowBriefing] = useState(false);
  // Both views may need scroll on small screens — hooks must be at the top.
  const briefingScrollRef = useScrollDrag<HTMLDivElement>();
  const missionScrollRef = useScrollDrag<HTMLDivElement>();

  // Load progress on mount
  useEffect(() => {
    loadCampaignProgress()
      .then(setCompleted)
      .catch(() => {
        /* best-effort */
      });
  }, []);

  const isMissionUnlocked = useCallback(
    (mission: MissionDef): boolean => {
      if (mission.number === 1) return true;
      // Unlocked if the previous mission is completed
      const prev = CAMPAIGN_MISSIONS.find((m) => m.number === mission.number - 1);
      return prev ? completed.has(prev.id) : false;
    },
    [completed],
  );

  const handleMissionClick = useCallback(
    (mission: MissionDef) => {
      if (!isMissionUnlocked(mission)) return;
      setSelectedMission(mission);
      setShowBriefing(true);
    },
    [isMissionUnlocked],
  );

  const handleLaunch = useCallback(() => {
    if (!selectedMission) return;
    campaignMissionId.value = selectedMission.id;
    campaignOpen.value = false;
    menuState.value = 'playing';
  }, [selectedMission]);

  const handleClose = useCallback(() => {
    if (showBriefing) {
      setShowBriefing(false);
      setSelectedMission(null);
    } else {
      campaignOpen.value = false;
    }
  }, [showBriefing]);

  // ---- Briefing overlay ----
  if (showBriefing && selectedMission) {
    return (
      <div
        ref={briefingScrollRef}
        class="absolute inset-0 z-50 overflow-y-auto modal-overlay"
        style={{ background: 'rgba(6, 14, 18, 0.95)' }}
      >
        <div class="min-h-full flex items-center justify-center p-4">
          <div
            class="flex flex-col items-center gap-6 max-w-lg w-full px-8 py-10 rounded-lg"
            style={{
              background: 'rgba(19, 40, 48, 0.9)',
              border: '1px solid var(--pw-border)',
            }}
          >
            <div class="text-center">
              <span
                class="font-numbers text-xs tracking-wider"
                style={{ color: 'var(--pw-text-muted)' }}
              >
                MISSION {selectedMission.number}
              </span>
              <h2
                class="font-heading text-2xl md:text-3xl font-bold mt-1"
                style={{ color: 'var(--pw-accent)' }}
              >
                {selectedMission.title}
              </h2>
              <p class="font-game text-sm mt-1" style={{ color: 'var(--pw-text-secondary)' }}>
                {selectedMission.subtitle}
              </p>
            </div>

            {/* Briefing text */}
            <div
              class="font-game text-xs md:text-sm leading-relaxed whitespace-pre-line text-center"
              style={{ color: 'var(--pw-text-muted)' }}
            >
              {selectedMission.briefing}
            </div>

            {/* Objectives */}
            <div class="w-full">
              <h3
                class="font-heading text-xs font-bold tracking-wider mb-2"
                style={{ color: 'var(--pw-text-secondary)' }}
              >
                OBJECTIVES
              </h3>
              <ul class="flex flex-col gap-1">
                {selectedMission.objectives.map((obj) => (
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

            {/* Buttons */}
            <div class="flex gap-4 mt-2">
              <button
                type="button"
                class="action-btn font-heading font-bold text-sm tracking-wider"
                style={{
                  padding: '10px 28px',
                  color: 'var(--pw-text-muted)',
                }}
                onClick={handleClose}
              >
                BACK
              </button>
              <button
                type="button"
                class="action-btn font-heading font-bold text-sm tracking-wider"
                style={{
                  padding: '10px 28px',
                  color: 'var(--pw-accent)',
                }}
                onClick={handleLaunch}
              >
                LAUNCH MISSION
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ---- Mission select grid ----
  return (
    <div
      ref={missionScrollRef}
      class="absolute inset-0 z-50 overflow-y-auto modal-overlay"
      style={{ background: 'rgba(6, 14, 18, 0.95)' }}
    >
      <div class="min-h-full flex flex-col items-center justify-center py-8 px-4">
        <h2
          class="font-heading text-2xl md:text-3xl font-bold mb-2 tracking-widest"
          style={{ color: 'var(--pw-accent)' }}
        >
          CAMPAIGN
        </h2>
        <p class="font-game text-sm mb-8" style={{ color: 'var(--pw-text-muted)' }}>
          Complete missions in order to unlock the next
        </p>

        <div class="flex flex-col gap-3 w-full max-w-md px-4">
          {CAMPAIGN_MISSIONS.map((mission) => {
            const unlocked = isMissionUnlocked(mission);
            const done = completed.has(mission.id);

            return (
              <button
                key={mission.id}
                type="button"
                class="action-btn flex items-center gap-4 text-left w-full"
                disabled={!unlocked}
                style={{
                  padding: '12px 16px',
                  opacity: unlocked ? 1 : 0.4,
                  cursor: unlocked ? 'pointer' : 'not-allowed',
                  border: done ? '1px solid var(--pw-success)' : undefined,
                }}
                onClick={() => handleMissionClick(mission)}
              >
                <span
                  class="font-numbers text-lg font-bold w-8 text-center"
                  style={{
                    color: done
                      ? 'var(--pw-success)'
                      : unlocked
                        ? 'var(--pw-accent)'
                        : 'var(--pw-text-muted)',
                  }}
                >
                  {done ? '\u2713' : mission.number}
                </span>
                <div class="flex-1">
                  <div
                    class="font-heading font-bold text-sm"
                    style={{
                      color: unlocked ? 'var(--pw-text-primary)' : 'var(--pw-text-muted)',
                    }}
                  >
                    {mission.title}
                  </div>
                  <div class="font-game text-xs" style={{ color: 'var(--pw-text-muted)' }}>
                    {unlocked ? mission.subtitle : 'Locked'}
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <button
          type="button"
          class="action-btn font-heading font-bold text-sm tracking-wider mt-8"
          style={{
            padding: '10px 28px',
            color: 'var(--pw-text-muted)',
          }}
          onClick={handleClose}
        >
          BACK TO MENU
        </button>
      </div>
    </div>
  );
}

/**
 * Objective Tracker HUD
 *
 * Renders the active campaign objectives in the top-center area,
 * similar to the nest objective bar but showing all mission objectives.
 */
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

// Import at bottom to avoid circular reference issues with the store
import { campaignObjectiveStatuses } from './store';
