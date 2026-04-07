/**
 * Specialist Auto-Deploy System (v3.0 — US11)
 *
 * Legacy diagnostic helper used by simulation/test harnesses that still
 * want an immediate specialist snapshot from prestige state. The live
 * player-facing runtime now uses blueprint caps plus in-match specialist
 * training from the Lodge.
 */

import { getUnitDef } from '@/config/config-loader';
import type { PrestigeState } from '@/config/prestige-logic';
import { type AutoDeploySpec, getAutoDeployUnits } from '@/config/prestige-logic';
import type { SpecialistDef } from '@/config/v3-types';

// ── Types ─────────────────────────────────────────────────────────

/** A specialist unit to spawn at match start. */
export interface SpecialistSpawnRequest {
  /** Specialist unit ID from units.json (e.g. "fisher"). */
  unitId: string;
  /** Number to spawn. */
  count: number;
  /** Auto-target type from config (e.g. "fish_node"). */
  autoTarget: string;
  /** Role from config (e.g. "auto_gather_fish"). */
  role: string;
  /** Base stats from config. */
  hp: number;
  damage: number;
  speed: number;
}

/** Result of computing all specialist spawns. */
export interface SpecialistDeployPlan {
  /** All specialist units to spawn. */
  spawns: SpecialistSpawnRequest[];
  /** Total specialist count. */
  totalCount: number;
  /** Summary of what will be deployed. */
  summary: string[];
}

// ── Core Logic ────────────────────────────────────────────────────

/**
 * Compute the full specialist deploy plan from prestige state.
 * Call this once at match start to determine what to spawn.
 */
export function computeSpecialistDeployPlan(prestigeState: PrestigeState): SpecialistDeployPlan {
  const autoDeploySpecs = getAutoDeployUnits(prestigeState);

  if (autoDeploySpecs.length === 0) {
    return { spawns: [], totalCount: 0, summary: [] };
  }

  const spawns: SpecialistSpawnRequest[] = [];
  const summary: string[] = [];

  for (const spec of autoDeploySpecs) {
    const request = resolveSpecialistSpawn(spec);
    if (request) {
      spawns.push(request);
      summary.push(`${request.count}x ${request.unitId}`);
    }
  }

  const totalCount = spawns.reduce((sum, s) => sum + s.count, 0);

  return { spawns, totalCount, summary };
}

/**
 * Resolve a single auto-deploy spec into a spawn request.
 * Returns null if the specialist isn't found in config.
 */
function resolveSpecialistSpawn(spec: AutoDeploySpec): SpecialistSpawnRequest | null {
  try {
    const def = getUnitDef(spec.unitId);
    // Specialists are in the specialists section, which has autoTarget
    if (!('autoTarget' in def)) return null;

    const specDef = def as SpecialistDef;
    return {
      unitId: spec.unitId,
      count: spec.count,
      autoTarget: specDef.autoTarget,
      role: specDef.role,
      hp: specDef.hp,
      damage: specDef.damage,
      speed: specDef.speed,
    };
  } catch {
    return null;
  }
}

/**
 * Check if a unit ID is a specialist (auto-controlled, not manually
 * redirectable).
 */
export function isSpecialistUnit(unitId: string): boolean {
  try {
    const def = getUnitDef(unitId);
    return 'autoTarget' in def;
  } catch {
    return false;
  }
}

/**
 * Get spawn positions for specialists near the Lodge.
 * Specialists spawn in a semicircle behind (below) the Lodge.
 */
export function getSpecialistSpawnPositions(
  lodgeX: number,
  lodgeY: number,
  count: number,
): { x: number; y: number }[] {
  const positions: { x: number; y: number }[] = [];
  const radius = 60;
  const startAngle = Math.PI * 0.3; // slightly right of directly below
  const endAngle = Math.PI * 0.7; // slightly left of directly below

  for (let i = 0; i < count; i++) {
    const angle =
      count === 1 ? Math.PI / 2 : startAngle + ((endAngle - startAngle) * i) / (count - 1);
    positions.push({
      x: lodgeX + Math.cos(angle) * radius,
      y: lodgeY + Math.sin(angle) * radius,
    });
  }

  return positions;
}

/**
 * Validate that generalists have strictly better stats than their
 * specialist counterparts (flexibility premium from spec).
 */
export function validateGeneralistSuperior(
  generalistId: string,
  specialistId: string,
): {
  valid: boolean;
  comparison: { stat: string; generalist: number; specialist: number }[];
} {
  try {
    const gen = getUnitDef(generalistId);
    const spec = getUnitDef(specialistId);

    const comparison: { stat: string; generalist: number; specialist: number }[] = [
      { stat: 'hp', generalist: gen.hp, specialist: spec.hp },
      { stat: 'speed', generalist: gen.speed, specialist: spec.speed },
    ];

    // For combat units, compare damage too
    if (gen.damage > 0 || spec.damage > 0) {
      comparison.push({ stat: 'damage', generalist: gen.damage, specialist: spec.damage });
    }

    // At least HP should be better for generalists
    const valid = gen.hp >= spec.hp;

    return { valid, comparison };
  } catch {
    return { valid: false, comparison: [] };
  }
}

/**
 * Get the area-autonomy description for a specialist.
 * Used in UI tooltips.
 */
export function getSpecialistBehaviorDesc(unitId: string): string {
  const BEHAVIOR_DESCRIPTIONS: Record<string, string> = {
    fisher: 'Autonomously harvests fish inside its assigned operating radius',
    digger: 'Autonomously harvests rocks inside its assigned operating radius',
    logger: 'Autonomously harvests logs inside its assigned operating radius',
    guard: 'Autonomously holds and fights inside its assigned operating radius',
    ranger: 'Autonomously patrols from its anchor zone into its engagement radius',
    shaman: 'Autonomously heals wounded allies inside its assigned operating radius',
    lookout: 'Autonomously patrols and maintains vision inside its assigned operating radius',
    bombardier: 'Autonomously projects siege pressure from its anchor zone into its engagement radius',
  };

  return BEHAVIOR_DESCRIPTIONS[unitId] ?? 'Unknown specialist behavior';
}
