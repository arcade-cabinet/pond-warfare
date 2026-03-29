/**
 * Tutorial System
 *
 * Shows Commander dialogue as floating text at timed intervals during
 * the first game. Each step triggers once and is marked as shown.
 * The last step triggers relative to the peace timer ending.
 */

import { query } from 'bitecs';
import { EntityTypeTag, FactionTag, Health, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

interface TutorialStep {
  /** Absolute frame to trigger (mutually exclusive with frameBefore). */
  frame?: number;
  /** Trigger relative to peace timer end (mutually exclusive with frame). */
  frameBefore?: 'peace';
  /** Offset in frames before the peace event. */
  offset?: number;
  /** Dialogue text. */
  text: string;
  /** Duration in frames the text remains visible. */
  duration: number;
}

const TUTORIAL_STEPS: TutorialStep[] = [
  {
    frame: 60,
    text: "Welcome to the pond! Click me to select, then right-click to move.",
    duration: 180,
  },
  {
    frame: 300,
    text: "Send gatherers to those Clam deposits. We need resources!",
    duration: 180,
  },
  {
    frame: 600,
    text: "Send the Scout into the fog to explore!",
    duration: 150,
  },
  {
    frame: 1200,
    text: "Build an Armory so we can train fighters.",
    duration: 150,
  },
  {
    frame: 2400,
    text: "Train some Brawlers. They're tough in close combat.",
    duration: 150,
  },
  {
    frameBefore: 'peace',
    offset: 1800,
    text: "I sense danger approaching. Prepare for battle!",
    duration: 180,
  },
];

/**
 * Find the first living Commander entity belonging to the player.
 */
function findPlayerCommander(world: GameWorld): number {
  const units = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  for (let i = 0; i < units.length; i++) {
    const eid = units[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if ((EntityTypeTag.kind[eid] as EntityKind) === EntityKind.Commander) {
      return eid;
    }
  }
  return -1;
}

export function tutorialSystem(world: GameWorld): void {
  if (!world.isFirstGame) return;

  const commanderEid = findPlayerCommander(world);
  if (commanderEid === -1) return;

  for (let i = 0; i < TUTORIAL_STEPS.length; i++) {
    if (world.tutorialShownSteps.has(i)) continue;

    const step = TUTORIAL_STEPS[i];
    let triggerFrame: number;

    if (step.frame !== undefined) {
      triggerFrame = step.frame;
    } else if (step.frameBefore === 'peace' && step.offset !== undefined) {
      // peaceTimer counts down; trigger when peaceTimer reaches the offset
      triggerFrame = -1; // sentinel
      if (world.peaceTimer <= step.offset && world.peaceTimer > 0) {
        triggerFrame = world.frameCount; // trigger now
      }
    } else {
      continue;
    }

    if (world.frameCount >= triggerFrame && triggerFrame !== -1) {
      world.tutorialShownSteps.add(i);
      world.floatingTexts.push({
        x: Position.x[commanderEid],
        y: Position.y[commanderEid] - 40,
        text: step.text,
        color: '#fbbf24',
        life: step.duration,
      });
    }
  }
}
