/**
 * UnitCommands - Floating action buttons for unit commands.
 *
 * Attack-move, Stop, Patrol, and Stance buttons are always visible when
 * units are selected (all screen sizes including mobile/tablet).
 * Army select, idle Mudpaw, and save-group remain desktop-only.
 *
 * Buttons are positioned absolutely on the right side of the game screen,
 * styled as floating command buttons with backdrop blur.
 */

import { useState } from 'preact/hooks';
import { screenClass } from '@/platform';
import { cycleStance } from '../game-actions';
import {
  armyCount,
  attackMoveActive,
  hasPlayerUnits,
  idleGeneralistCount,
  patrolModeActive,
  selectionCount,
  selectionStance,
} from '../store';

const STANCE_TITLES = ['Aggressive', 'Defensive', 'Hold'] as const;

export interface UnitCommandsProps {
  onIdleGeneralistClick?: () => void;
  onArmyClick?: () => void;
  onAttackMoveClick?: () => void;
  onHaltClick?: () => void;
  onSaveCtrlGroup?: (group: number) => void;
}

/** Shared button styles for floating command buttons */
function CmdButton({
  id,
  label,
  shortcut,
  borderColor,
  textColor,
  active,
  onClick,
  title,
}: {
  id: string;
  label: string;
  shortcut?: string;
  borderColor: string;
  textColor: string;
  active?: boolean;
  onClick?: () => void;
  title: string;
}) {
  const mobile = screenClass.value === 'compact';
  return (
    <button
      type="button"
      id={id}
      class={`floating-cmd-btn cmd-btn border-2 px-3 md:px-4 py-2 rounded-full font-bold z-20 flex items-center gap-2 transition-colors shadow-lg cursor-pointer ${active ? 'ring-2 ring-offset-1' : ''}`}
      style={{
        borderColor,
        color: textColor,
        background: 'rgba(26, 18, 8, 0.75)',
      }}
      title={title}
      onClick={onClick}
    >
      <span class="font-heading text-xs md:text-sm">
        {label}
        {!mobile && shortcut ? ` (${shortcut})` : ''}
      </span>
    </button>
  );
}

export function UnitCommands(props: UnitCommandsProps) {
  const [saveGroupOpen, setSaveGroupOpen] = useState(false);

  const totalIdle = idleGeneralistCount.value;
  const mobile = screenClass.value === 'compact';
  const hasSelection = hasPlayerUnits.value && selectionCount.value > 0;

  return (
    <>
      {/* Idle Mudpaws button (desktop only) */}
      {!mobile && totalIdle > 0 && (
        <div class="absolute top-14 right-2 md:right-6 z-20 flex flex-wrap items-center gap-1">
          <button
            type="button"
            id="idle-generalist-btn"
            class="cmd-btn border-2 px-2 py-0.5 md:px-4 md:py-2 min-h-[32px] md:min-h-[36px] rounded-full font-bold flex items-center gap-1.5 md:gap-2 transition-colors shadow-lg cursor-pointer"
            style={{ borderColor: 'var(--pw-warning)', color: 'var(--pw-warning)' }}
            title="Select idle Mudpaw (.)"
            onClick={() => props.onIdleGeneralistClick?.()}
          >
            <span
              class="w-3 h-3 rounded-full animate-pulse"
              style={{ background: 'var(--pw-warning)' }}
            />
            <span class="font-heading text-xs md:text-sm">{totalIdle} Idle Mudpaws</span>
          </button>
        </div>
      )}

      {/* Army select button (desktop only) */}
      {!mobile && armyCount.value > 0 && (
        <button
          type="button"
          id="select-army-btn"
          class="absolute top-24 md:top-28 right-2 md:right-6 cmd-btn border-2 px-4 py-2 rounded-full font-bold z-20 flex items-center gap-2 transition-colors shadow-lg cursor-pointer"
          style={{ borderColor: 'var(--pw-enemy)', color: 'var(--pw-enemy-light)' }}
          title="Select all army (,)"
          onClick={props.onArmyClick}
        >
          <span class="font-heading text-xs md:text-sm">Army ({armyCount}) (,)</span>
        </button>
      )}

      {/* ── Floating action buttons — visible on ALL screen sizes ── */}
      {hasSelection && (
        <div
          class="absolute right-2 md:right-6 z-20 flex flex-col gap-2"
          style={{ top: mobile ? '60px' : '144px' }}
        >
          {/* Attack-move button */}
          {!attackMoveActive.value && (
            <CmdButton
              id="attack-move-btn"
              label="A-Move"
              shortcut="A"
              borderColor="var(--pw-twig)"
              textColor="var(--pw-otter)"
              onClick={props.onAttackMoveClick}
              title="Attack-Move (A)"
            />
          )}

          {/* Stop button */}
          <CmdButton
            id="halt-btn"
            label="Stop"
            shortcut="H"
            borderColor="var(--pw-border)"
            textColor="var(--pw-text-secondary)"
            onClick={props.onHaltClick}
            title="Stop/Halt (H)"
          />

          {/* Patrol button */}
          <CmdButton
            id="patrol-btn"
            label={patrolModeActive.value ? 'Patrolling...' : 'Patrol'}
            borderColor={
              patrolModeActive.value ? 'var(--pw-vine-highlight)' : 'var(--pw-vine-base)'
            }
            textColor={patrolModeActive.value ? 'var(--pw-vine-highlight)' : 'var(--pw-vine-base)'}
            active={patrolModeActive.value}
            onClick={() => {
              patrolModeActive.value = !patrolModeActive.value;
            }}
            title="Patrol: tap terrain to set waypoints"
          />

          {/* Stance cycle button */}
          {selectionStance.value >= 0 && (
            <CmdButton
              id="stance-btn"
              label={STANCE_TITLES[selectionStance.value] ?? 'Aggressive'}
              shortcut="V"
              borderColor="var(--pw-moss-bright)"
              textColor="var(--pw-moss-bright)"
              onClick={() => cycleStance()}
              title={`Stance: ${STANCE_TITLES[selectionStance.value] ?? 'Aggressive'} (V)`}
            />
          )}
        </div>
      )}

      {/* Save ctrl-group button (desktop only) */}
      {!mobile && selectionCount.value > 0 && hasPlayerUnits.value && (
        <div class="absolute top-[328px] md:top-[344px] right-2 md:right-6 z-20">
          {!saveGroupOpen ? (
            <button
              type="button"
              class="cmd-btn border-2 px-4 py-2 rounded-full font-bold flex items-center gap-2 transition-colors shadow-lg cursor-pointer"
              style={{ borderColor: 'var(--pw-recon-dark)', color: 'var(--pw-recon)' }}
              title="Save selection to a control group"
              onClick={(e) => {
                e.stopPropagation();
                setSaveGroupOpen(true);
              }}
            >
              <span class="font-heading text-sm">Save Group</span>
            </button>
          ) : (
            <div
              class="flex gap-1 items-center rounded-full px-2 py-1 shadow-lg"
              style={{
                background: 'var(--pw-overlay-heavy)',
                border: '1px solid var(--pw-recon-dark)',
              }}
            >
              {[1, 2, 3, 4, 5, 6, 7, 8, 9].map((n) => (
                <button
                  type="button"
                  key={`sg-${n}`}
                  class="w-7 h-7 rounded font-numbers font-bold text-xs cursor-pointer flex items-center justify-center transition-colors"
                  style={{
                    background: 'var(--pw-bg-surface)',
                    border: '1px solid var(--pw-recon-dark)',
                    color: 'var(--pw-recon)',
                  }}
                  title={`Save to group ${n}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    if (props.onSaveCtrlGroup) props.onSaveCtrlGroup(n);
                    setSaveGroupOpen(false);
                  }}
                >
                  {n}
                </button>
              ))}
              <button
                type="button"
                class="w-7 h-7 rounded font-bold text-xs cursor-pointer flex items-center justify-center transition-colors"
                style={{
                  background: 'var(--pw-bg-surface)',
                  border: '1px solid var(--pw-border)',
                  color: 'var(--pw-text-muted)',
                }}
                title="Cancel"
                onClick={(e) => {
                  e.stopPropagation();
                  setSaveGroupOpen(false);
                }}
              >
                X
              </button>
            </div>
          )}
        </div>
      )}
    </>
  );
}
