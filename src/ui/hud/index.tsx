/**
 * HUD - Main HUD component that composes all sub-components.
 *
 * Re-exports HUD, HUDProps, and formatting helpers so existing imports
 * from '@/ui/hud' or './hud' continue to work.
 */

import { CtrlGroups } from './ctrl-groups';
import { Overlays } from './overlays';
import { ProductionQueue } from './production-queue';
import { TopBar } from './top-bar';
import { UnitCommands } from './unit-commands';

/** Format time-of-day (in minutes) to HH:MM string. */
export function formatTime(timeOfDay: number): string {
  const hrs = Math.floor(timeOfDay / 60);
  const mins = Math.floor(timeOfDay % 60);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}`;
}

/** Calculate day number from frame count. */
export function frameToDay(frameCount: number, dayFrames: number): number {
  return Math.floor(frameCount / dayFrames) + 1;
}

/** Format resource rate as +N or -N. */
export function formatRate(r: number): string {
  return r >= 0 ? `+${r}` : `${r}`;
}

export interface HUDProps {
  onSpeedClick?: () => void;
  onMuteClick?: () => void;
  onColorBlindToggle?: () => void;
  onIdleWorkerClick?: () => void;
  onArmyClick?: () => void;
  onPauseClick?: () => void;
  onAttackMoveClick?: () => void;
  onHaltClick?: () => void;
  onCtrlGroupClick?: (group: number) => void;
  onSaveCtrlGroup?: (group: number) => void;
  onSaveClick?: () => void;
  onLoadClick?: () => void;
  onSettingsClick?: () => void;
}

export function HUD(props: HUDProps) {
  return (
    <>
      <TopBar
        onSpeedClick={props.onSpeedClick}
        onMuteClick={props.onMuteClick}
        onColorBlindToggle={props.onColorBlindToggle}
        onPauseClick={props.onPauseClick}
        onSaveClick={props.onSaveClick}
        onLoadClick={props.onLoadClick}
        onSettingsClick={props.onSettingsClick}
      />
      <ProductionQueue />
      <Overlays />
      <CtrlGroups onCtrlGroupClick={props.onCtrlGroupClick} />
      <UnitCommands
        onIdleWorkerClick={props.onIdleWorkerClick}
        onArmyClick={props.onArmyClick}
        onAttackMoveClick={props.onAttackMoveClick}
        onHaltClick={props.onHaltClick}
        onSaveCtrlGroup={props.onSaveCtrlGroup}
      />
    </>
  );
}
