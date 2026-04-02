/**
 * Campaign System
 *
 * Manages mission state during gameplay and provides objective checking each frame.
 * DB persistence is handled by campaign-db.ts.
 */

import { query } from 'bitecs';
import { EntityTypeTag, FactionTag, Health, IsBuilding, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';
import { campaignChoiceOpen } from '@/ui/store';
import { saveMissionCompleted } from './campaign-db';
import { CAMPAIGN_MISSIONS, type MissionDef, type MissionObjective } from './missions';

export {
  loadBranchChoice,
  loadCampaignProgress,
  saveBranchChoice,
  saveMissionCompleted,
} from './campaign-db';

// ---------------------------------------------------------------------------
// Runtime campaign state (lives on the world during gameplay)
// ---------------------------------------------------------------------------

export interface CampaignState {
  /** The active mission definition, or null if playing freeplay. */
  mission: MissionDef | null;
  /** Per-objective completion status (objective ID -> completed). */
  objectiveStatus: Map<string, boolean>;
  /** Whether all objectives have been met (triggers celebration). */
  allObjectivesComplete: boolean;
  /** Frame at which all objectives were first completed. */
  completedAtFrame: number;
  /** Whether the completion celebration has been shown. */
  celebrationShown: boolean;
  /** Dialogue steps that have been shown (index). */
  shownDialogues: Set<number>;
  /** Count of trained units per EntityKind (for train objectives). */
  trainedCounts: Map<number, number>;
  /** Count of killed enemies per EntityKind (for kill objectives). */
  killedCounts: Map<number, number>;
  /** Campaign branch choice after Mission 3: 'A' | 'B' | null. */
  path: 'A' | 'B' | null;
}

export function createCampaignState(
  mission: MissionDef | null,
  path?: 'A' | 'B' | null,
): CampaignState {
  return {
    mission,
    objectiveStatus: new Map((mission?.objectives ?? []).map((o) => [o.id, false])),
    allObjectivesComplete: false,
    completedAtFrame: 0,
    celebrationShown: false,
    shownDialogues: new Set(),
    trainedCounts: new Map(),
    killedCounts: new Map(),
    path: path ?? null,
  };
}

// ---------------------------------------------------------------------------
// Objective evaluation helpers
// ---------------------------------------------------------------------------

function countPlayerBuildings(world: GameWorld, kind: number): number {
  const ents = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, IsBuilding]);
  let count = 0;
  for (let i = 0; i < ents.length; i++) {
    const eid = ents[i];
    if (
      FactionTag.faction[eid] === Faction.Player &&
      EntityTypeTag.kind[eid] === kind &&
      Health.current[eid] > 0
    ) {
      count++;
    }
  }
  return count;
}

function getExploredPercent(world: GameWorld): number {
  // Use the fog of war explored ratio if available
  // The explored canvas is WORLD_WIDTH/TILE_SIZE x WORLD_HEIGHT/TILE_SIZE
  // We approximate by checking the world's fog data
  // For simplicity, check how many spatial-hash cells have been visited
  // via the explored pixel data
  const vw = world.viewWidth;
  const vh = world.viewHeight;
  if (vw === 0 || vh === 0) return 0;

  // Approximate: use the spatial hash to check explored area
  // The explored canvas uses white pixels for explored tiles
  // We can estimate from the fog system, but the simplest approach
  // is to track this externally. For now, use a rough heuristic.
  // The fog system marks cells as explored; we count non-zero alpha pixels.
  // This is computed by the fog system and we'll read the signal from the world.
  // Fallback: return 0 until we have a way to read it.
  return world.exploredPercent;
}

function checkObjective(world: GameWorld, campaign: CampaignState, obj: MissionObjective): boolean {
  const objectiveKind = obj.entityKind;

  switch (obj.type) {
    case 'build':
      return (
        objectiveKind !== undefined &&
        countPlayerBuildings(world, objectiveKind) >= (obj.count ?? 1)
      );

    case 'buildCount':
      return (
        objectiveKind !== undefined &&
        countPlayerBuildings(world, objectiveKind) >= (obj.count ?? 1)
      );

    case 'train':
      return (
        objectiveKind !== undefined &&
        (campaign.trainedCounts.get(objectiveKind) ?? 0) >= (obj.count ?? 1)
      );

    case 'explore':
      return getExploredPercent(world) >= (obj.percent ?? 50);

    case 'destroyNest':
      // For campaigns, we track kills via killedCounts
      return (campaign.killedCounts.get(EntityKind.PredatorNest) ?? 0) >= (obj.count ?? 1);

    case 'survive':
      return world.enemyEvolution.tier >= (obj.tier ?? 3);

    case 'kill':
      return (
        objectiveKind !== undefined &&
        (campaign.killedCounts.get(objectiveKind) ?? 0) >= (obj.count ?? 1)
      );

    case 'research':
      return obj.techId != null && !!world.tech[obj.techId];

    default:
      return false;
  }
}

// ---------------------------------------------------------------------------
// Campaign system (called each frame from game loop)
// ---------------------------------------------------------------------------

/**
 * Run campaign objective checks and dialogue triggers.
 * Call after all other game systems in the frame update.
 */
export function campaignSystem(world: GameWorld): void {
  const campaign = (world as GameWorld & { campaign?: CampaignState }).campaign;
  if (!campaign?.mission) return;

  const mission = campaign.mission;

  // ---- Check objectives ----
  if (!campaign.allObjectivesComplete) {
    let allDone = true;
    for (const obj of mission.objectives) {
      if (campaign.objectiveStatus.get(obj.id)) continue;
      const done = checkObjective(world, campaign, obj);
      if (done) {
        campaign.objectiveStatus.set(obj.id, true);
        // Floating text celebration for completing an objective
        const cx = world.camX + world.viewWidth / 2;
        const cy = world.camY + 80;
        world.floatingTexts.push({
          x: cx,
          y: cy,
          text: `Objective Complete: ${obj.label}`,
          color: '#4ade80',
          life: 180,
        });
      } else {
        allDone = false;
      }
    }

    if (allDone) {
      campaign.allObjectivesComplete = true;
      campaign.completedAtFrame = world.frameCount;
    }
  }

  // ---- Show completion celebration (3 seconds after all done) ----
  if (
    campaign.allObjectivesComplete &&
    !campaign.celebrationShown &&
    world.frameCount >= campaign.completedAtFrame + 90
  ) {
    campaign.celebrationShown = true;
    world.state = 'win';

    // After Mission 3, show the branch choice screen
    if (mission.id === 'the-nest-must-fall') {
      campaignChoiceOpen.value = true;
    }

    // Persist completion
    saveMissionCompleted(mission.id, world.frameCount).catch(() => {
      /* best-effort */
    });
  }

  // ---- Trigger dialogues ----
  for (let i = 0; i < mission.dialogues.length; i++) {
    if (campaign.shownDialogues.has(i)) continue;
    const dlg = mission.dialogues[i];
    if (world.frameCount >= dlg.frame) {
      campaign.shownDialogues.add(i);

      // Find the Commander entity for position
      const units = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
      let cmdX = world.camX + world.viewWidth / 2;
      let cmdY = world.camY + 60;
      for (let j = 0; j < units.length; j++) {
        const eid = units[j];
        if (
          FactionTag.faction[eid] === Faction.Player &&
          EntityTypeTag.kind[eid] === EntityKind.Commander &&
          Health.current[eid] > 0
        ) {
          cmdX = Position.x[eid];
          cmdY = Position.y[eid] - 40;
          break;
        }
      }

      world.floatingTexts.push({
        x: cmdX,
        y: cmdY,
        text: dlg.text,
        color: '#fbbf24',
        life: dlg.duration,
      });
    }
  }
}

// ---------------------------------------------------------------------------
// Notification hooks: call these from game systems when events happen
// ---------------------------------------------------------------------------

/** Notify the campaign that a unit was trained by the player. */
export function campaignNotifyTrained(world: GameWorld, kind: number): void {
  const campaign = (world as GameWorld & { campaign?: CampaignState }).campaign;
  if (!campaign?.mission) return;
  campaign.trainedCounts.set(kind, (campaign.trainedCounts.get(kind) ?? 0) + 1);
}

/** Notify the campaign that an enemy entity was killed. */
export function campaignNotifyKilled(world: GameWorld, kind: number): void {
  const campaign = (world as GameWorld & { campaign?: CampaignState }).campaign;
  if (!campaign?.mission) return;
  campaign.killedCounts.set(kind, (campaign.killedCounts.get(kind) ?? 0) + 1);
}

/** Check whether enemy attacks should be suppressed for the current mission. */
export function campaignSuppressEnemyAttacks(world: GameWorld): boolean {
  const campaign = (world as GameWorld & { campaign?: CampaignState }).campaign;
  if (!campaign?.mission) return false;
  return (
    !!campaign.mission.worldOverrides?.disableEnemyAttacksUntilObjectivesDone &&
    !campaign.allObjectivesComplete
  );
}

/** Get the list of missions with their completion status for display. */
export function getMissionList(): {
  missions: MissionDef[];
  completed: Set<string>;
  loading: boolean;
} {
  return {
    missions: CAMPAIGN_MISSIONS,
    completed: new Set<string>(),
    loading: true,
  };
}
