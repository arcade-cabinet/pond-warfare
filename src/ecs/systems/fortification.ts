/**
 * Fortification Slot System (v3.0 — US7)
 *
 * Manages fort slots around the Lodge: placement, construction,
 * HP tracking, and combat behavior for towers. Reads from
 * configs/fortifications.json and configs/lodge.json.
 */

import { hasComponent } from 'bitecs';
import { getFortDef } from '@/config/config-loader';
import type { FortDef } from '@/config/v3-types';
import { FactionTag, Health, Position } from '@/ecs/components';
import { takeDamage } from '@/ecs/systems/health/take-damage';
import type { GameWorld } from '@/ecs/world';
import { generateFortSlotPositions, getFortSlotCount } from '@/rendering/lodge-renderer';
import { Faction } from '@/types';

// ── Types ─────────────────────────────────────────────────────────

/** Possible states for a fortification slot. */
export type FortSlotStatus = 'empty' | 'building' | 'active' | 'destroyed';

/** A single fortification slot around the Lodge. */
export interface FortSlot {
  /** Slot index (0-based). */
  index: number;
  /** World position (absolute, Lodge center + offset). */
  worldX: number;
  worldY: number;
  /** Ring (0 = inner, 1 = outer). */
  ring: number;
  /** Current status. */
  status: FortSlotStatus;
  /** Fortification type placed in this slot (null if empty). */
  fortType: string | null;
  /** Current HP (0 if empty or destroyed). */
  currentHp: number;
  /** Maximum HP (from fortifications.json). */
  maxHp: number;
  /** Damage per attack cycle (towers only, 0 for walls). */
  damage: number;
  /** Attack range in pixels (towers only, 0 for walls). */
  range: number;
  /** Frame of last attack (for attack cooldown). */
  lastAttackFrame: number;
}

/** Result of attempting to place a fortification. */
export interface PlacementResult {
  success: boolean;
  reason?: string;
  slot?: FortSlot;
  rockCost?: number;
}

/** Full state of the fortification system for a match. */
export interface FortificationState {
  /** All fort slots (empty and occupied). */
  slots: FortSlot[];
  /** Total rock cost spent on fortifications this match. */
  totalRockCost: number;
}

// ── Constants ────────────────────────────────────────────────────

/** Attack cooldown for towers (in frames, 60fps). */
const TOWER_ATTACK_COOLDOWN = 90; // 1.5 seconds

/** Build time in frames (60fps). */
const _BUILD_TIME_FRAMES = 180; // 3 seconds

// ── State Management ─────────────────────────────────────────────

/**
 * Initialize fortification state for a match.
 * Creates empty slots based on progression level and Lodge position.
 */
export function initFortificationState(
  progressionLevel: number,
  lodgeX: number,
  lodgeY: number,
): FortificationState {
  const slotCount = getFortSlotCount(progressionLevel);
  const offsets = generateFortSlotPositions(slotCount);

  const slots: FortSlot[] = offsets.map((offset, index) => ({
    index,
    worldX: lodgeX + offset.x,
    worldY: lodgeY + offset.y,
    ring: offset.ring,
    status: 'empty',
    fortType: null,
    currentHp: 0,
    maxHp: 0,
    damage: 0,
    range: 0,
    lastAttackFrame: 0,
  }));

  return { slots, totalRockCost: 0 };
}

/**
 * Attempt to place a fortification in a slot.
 * Validates the slot is empty and the player has enough Rocks.
 */
export function placeFortification(
  state: FortificationState,
  slotIndex: number,
  fortType: string,
  availableRocks: number,
): PlacementResult {
  // Validate slot index
  if (slotIndex < 0 || slotIndex >= state.slots.length) {
    return { success: false, reason: 'Invalid slot index' };
  }

  const slot = state.slots[slotIndex];

  // Validate slot is empty
  if (slot.status !== 'empty') {
    return { success: false, reason: `Slot is ${slot.status}` };
  }

  // Get fort definition
  let def: FortDef;
  try {
    def = getFortDef(fortType);
  } catch {
    return { success: false, reason: `Unknown fortification type: ${fortType}` };
  }

  // Check cost
  const rockCost = def.cost.rocks ?? 0;
  if (availableRocks < rockCost) {
    return {
      success: false,
      reason: `Need ${rockCost} Rocks (have ${availableRocks})`,
      rockCost,
    };
  }

  // Place the fortification
  slot.status = 'active';
  slot.fortType = fortType;
  slot.currentHp = def.hp;
  slot.maxHp = def.hp;
  slot.damage = def.damage ?? 0;
  slot.range = def.range ?? 0;
  slot.lastAttackFrame = 0;
  state.totalRockCost += rockCost;

  return { success: true, slot, rockCost };
}

/**
 * Apply damage to a fortification slot.
 * Returns the actual damage applied (may be less if fort is destroyed).
 */
export function damageFortification(
  state: FortificationState,
  slotIndex: number,
  damage: number,
): number {
  if (slotIndex < 0 || slotIndex >= state.slots.length) return 0;

  const slot = state.slots[slotIndex];
  if (slot.status !== 'active') return 0;

  const actual = Math.min(damage, slot.currentHp);
  slot.currentHp -= actual;

  if (slot.currentHp <= 0) {
    slot.status = 'destroyed';
    slot.currentHp = 0;
  }

  return actual;
}

/**
 * Check if a tower can attack this frame (cooldown expired).
 */
export function canTowerAttack(slot: FortSlot, currentFrame: number): boolean {
  if (slot.status !== 'active') return false;
  if (slot.damage <= 0) return false; // walls don't attack
  return currentFrame - slot.lastAttackFrame >= TOWER_ATTACK_COOLDOWN;
}

/**
 * Record that a tower has attacked.
 */
export function recordTowerAttack(slot: FortSlot, currentFrame: number): void {
  slot.lastAttackFrame = currentFrame;
}

/**
 * Get all active forts that block movement (walls).
 */
export function getBlockingForts(state: FortificationState): FortSlot[] {
  return state.slots.filter((s) => {
    if (s.status !== 'active' || !s.fortType) return false;
    try {
      const def = getFortDef(s.fortType);
      return def.blocks_movement === true;
    } catch {
      return false;
    }
  });
}

/**
 * Get all active towers (forts with damage > 0).
 */
export function getActiveTowers(state: FortificationState): FortSlot[] {
  return state.slots.filter((s) => s.status === 'active' && s.damage > 0);
}

/**
 * Get empty slots available for placement.
 */
export function getEmptySlots(state: FortificationState): FortSlot[] {
  return state.slots.filter((s) => s.status === 'empty');
}

/**
 * Count active fortifications by type.
 */
export function countActiveForts(state: FortificationState): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const slot of state.slots) {
    if (slot.status === 'active' && slot.fortType) {
      counts[slot.fortType] = (counts[slot.fortType] ?? 0) + 1;
    }
  }
  return counts;
}

/**
 * Find the closest fort slot to a world position.
 * Optionally filter by status.
 */
export function findClosestSlot(
  state: FortificationState,
  worldX: number,
  worldY: number,
  statusFilter?: FortSlotStatus,
): FortSlot | null {
  let closest: FortSlot | null = null;
  let minDist = Infinity;

  for (const slot of state.slots) {
    if (statusFilter && slot.status !== statusFilter) continue;
    const dx = slot.worldX - worldX;
    const dy = slot.worldY - worldY;
    const dist = dx * dx + dy * dy;
    if (dist < minDist) {
      minDist = dist;
      closest = slot;
    }
  }

  return closest;
}

/**
 * Per-frame tick: active towers find the nearest enemy in range and attack.
 * Called from systems-runner after combatSystem.
 */
export function fortificationTickSystem(world: GameWorld): void {
  if (!world.fortifications) return;
  const towers = getActiveTowers(world.fortifications);
  for (const tower of towers) {
    if (!canTowerAttack(tower, world.frameCount)) continue;
    // Find nearest enemy in range using spatialHash
    const candidates = world.spatialHash.query(tower.worldX, tower.worldY, tower.range);
    let bestEid = -1;
    let bestDist = tower.range * tower.range;
    for (const eid of candidates) {
      if (!hasComponent(world.ecs, eid, FactionTag)) continue;
      if (FactionTag.faction[eid] !== Faction.Enemy) continue;
      if (!hasComponent(world.ecs, eid, Health) || Health.current[eid] <= 0) continue;
      const dx = Position.x[eid] - tower.worldX;
      const dy = Position.y[eid] - tower.worldY;
      const d = dx * dx + dy * dy;
      if (d < bestDist) {
        bestDist = d;
        bestEid = eid;
      }
    }
    if (bestEid !== -1) {
      takeDamage(world, bestEid, tower.damage, -1);
      recordTowerAttack(tower, world.frameCount);
    }
  }
}
