/**
 * AdvisorSettings -- Per-advisor toggle controls for the Settings panel.
 *
 * Self-contained: loads/saves advisor enabled state via Preferences,
 * and syncs to game.world.advisorState when a game is active.
 */

import { useEffect, useState } from 'preact/hooks';
import { loadAdvisorSettings, saveAdvisorSettings } from '@/advisors/advisor-state';
import type { AdvisorRole } from '@/advisors/types';
import { ADVISOR_PERSONAS } from '@/config/advisor-config';
import { game } from '@/game';
import { menuState } from '../store';

const ROLES: AdvisorRole[] = ['economy', 'war', 'builder'];

function ToggleSwitch({ active, onClick }: { active: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      class={`w-12 h-7 rounded-full relative cursor-pointer ${active ? 'toggle-track-active' : 'toggle-track'}`}
      onClick={onClick}
    >
      <span
        class={`toggle-thumb absolute top-0.5 w-6 h-6 rounded-full ${active ? 'translate-x-5' : 'translate-x-0.5'}`}
      />
    </button>
  );
}

export function AdvisorSettings() {
  const [enabled, setEnabled] = useState<Record<AdvisorRole, boolean>>({
    economy: true,
    war: true,
    builder: true,
  });

  useEffect(() => {
    loadAdvisorSettings().then(setEnabled);
  }, []);

  const apply = (next: Record<AdvisorRole, boolean>) => {
    setEnabled(next);
    if (menuState.value === 'playing') {
      game.world.advisorState.enabled = { ...next };
    }
    saveAdvisorSettings(next);
  };

  const toggle = (role: AdvisorRole) => apply({ ...enabled, [role]: !enabled[role] });

  const allDisabled = ROLES.every((r) => !enabled[r]);
  const toggleAll = () => {
    const val = allDisabled; // re-enable if all off
    apply({ economy: val, war: val, builder: val });
  };

  return (
    <div class="space-y-2">
      {ROLES.map((role) => {
        const p = ADVISOR_PERSONAS[role];
        const roleLabel = role.charAt(0).toUpperCase() + role.slice(1);
        return (
          <div key={role} class="flex items-center justify-between min-h-[44px]">
            <div class="flex items-center gap-2">
              <span
                class="advisor-icon w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold"
                style={{ background: p.color, color: 'var(--pw-advisor-text)' }}
              >
                {p.initial}
              </span>
              <span class="font-game text-xs" style={{ color: 'var(--pw-text-secondary)' }}>
                {p.name} <span style={{ color: 'var(--pw-text-muted)' }}>({roleLabel})</span>
              </span>
            </div>
            <ToggleSwitch active={enabled[role]} onClick={() => toggle(role)} />
          </div>
        );
      })}

      <div class="border-t my-2" style={{ borderColor: 'var(--pw-border)' }} />

      <div class="flex items-center justify-between min-h-[44px]">
        <span class="font-game text-xs" style={{ color: 'var(--pw-text-secondary)' }}>
          Disable All Advisors
        </span>
        <ToggleSwitch active={allDisabled} onClick={toggleAll} />
      </div>
    </div>
  );
}
