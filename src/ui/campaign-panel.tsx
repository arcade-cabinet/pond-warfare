/**
 * Campaign Panel
 *
 * Mission select screen and mission briefing overlay.
 * Shows 5 missions with lock/unlock states and a briefing before launch.
 */

import { useCallback, useEffect, useState } from 'preact/hooks';
import { loadCampaignProgress, type MissionDef } from '@/campaign';
import { CAMPAIGN_MISSIONS } from '@/campaign/missions';
import { CampaignBriefing } from './campaign-briefing';
import { Frame9Slice } from './components/frame';
import { useScrollDrag } from './hooks/useScrollDrag';
import { campaignMissionId, campaignOpen, menuState } from './store';

export function CampaignPanel() {
  const [completed, setCompleted] = useState<Set<string>>(new Set());
  const [selectedMission, setSelectedMission] = useState<MissionDef | null>(null);
  const [showBriefing, setShowBriefing] = useState(false);
  // Mission list may need scroll on small screens.
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
      <CampaignBriefing mission={selectedMission} onBegin={handleLaunch} onBack={handleClose} />
    );
  }

  // ---- Mission select grid ----
  return (
    <div
      ref={missionScrollRef}
      class="absolute inset-0 z-50 overflow-y-auto modal-overlay"
      style={{ background: 'var(--pw-surface-campaign)' }}
    >
      <div class="min-h-full flex flex-col items-center justify-center py-8 px-4">
        <Frame9Slice title="CAMPAIGN">
          <div class="relative">
            {/* Close button */}
            <button
              type="button"
              class="absolute top-0 right-0 rts-btn text-xl leading-none cursor-pointer px-2 min-w-[44px] min-h-[44px] flex items-center justify-center"
              onClick={handleClose}
            >
              {'\u2715'}
            </button>

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
              class="rts-btn font-heading font-bold text-sm tracking-wider mt-8"
              style={{
                padding: '10px 28px',
                color: 'var(--pw-text-muted)',
              }}
              onClick={handleClose}
            >
              BACK TO MENU
            </button>
          </div>
        </Frame9Slice>
      </div>
    </div>
  );
}

// Re-export ObjectiveTracker from its dedicated module
export { ObjectiveTracker } from './objective-tracker';
