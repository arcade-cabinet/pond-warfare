/**
 * Positional Damage Bonuses
 *
 * Calculates flanking and elevation bonuses for combat:
 * - Flanking: +25% damage when attacking from behind (>120deg from target facing)
 * - Elevation: +10% damage attacking downhill, -10% attacking uphill
 *
 * Facing angle is derived from the target's Sprite.facingLeft direction.
 */

import { hasComponent } from 'bitecs';
import { Position, Sprite } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { TerrainType } from '@/terrain/terrain-grid';

/** Angle threshold (radians) for flanking: 120 degrees from facing = 2*PI/3 */
const FLANK_ANGLE_THRESHOLD = (2 * Math.PI) / 3;

/** Flanking damage multiplier: +25% */
const FLANK_BONUS = 0.25;

/** Elevation damage bonus: +15% attacking downhill */
const ELEVATION_BONUS = 0.15;

/** Elevation damage penalty: -10% attacking uphill */
const ELEVATION_PENALTY = 0.1;

export interface PositionalBonuses {
  /** Total positional damage multiplier (1.0 = no bonus) */
  multiplier: number;
  /** True if flanking bonus was applied */
  flanking: boolean;
  /** True if elevation bonus was applied */
  elevationUp: boolean;
  /** True if elevation penalty was applied */
  elevationDown: boolean;
}

/**
 * Calculate positional damage bonuses for an attack.
 *
 * @param world - Game world
 * @param attackerEid - Attacking entity
 * @param targetEid - Target entity
 * @returns Positional bonuses breakdown
 */
export function calculatePositionalBonuses(
  world: GameWorld,
  attackerEid: number,
  targetEid: number,
): PositionalBonuses {
  const result: PositionalBonuses = {
    multiplier: 1.0,
    flanking: false,
    elevationUp: false,
    elevationDown: false,
  };

  if (!hasComponent(world.ecs, attackerEid, Position)) return result;
  if (!hasComponent(world.ecs, targetEid, Position)) return result;

  const ax = Position.x[attackerEid];
  const ay = Position.y[attackerEid];
  const tx = Position.x[targetEid];
  const ty = Position.y[targetEid];

  // --- Flanking check ---
  if (hasComponent(world.ecs, targetEid, Sprite)) {
    const flanked = isFlanking(ax, ay, tx, ty, Sprite.facingLeft[targetEid]);
    if (flanked) {
      result.multiplier += FLANK_BONUS;
      result.flanking = true;
    }
  }

  // --- Elevation check ---
  const attackerTerrain = world.terrainGrid.getAt(ax, ay);
  const targetTerrain = world.terrainGrid.getAt(tx, ty);

  const attackerHigh = attackerTerrain === TerrainType.HighGround;
  const targetHigh = targetTerrain === TerrainType.HighGround;

  if (attackerHigh && !targetHigh) {
    // Attacking downhill: +10% damage
    result.multiplier += ELEVATION_BONUS;
    result.elevationUp = true;
  } else if (!attackerHigh && targetHigh) {
    // Attacking uphill: -10% damage
    result.multiplier -= ELEVATION_PENALTY;
    result.elevationDown = true;
  }

  return result;
}

/**
 * Determine if attacker is behind the target (flanking).
 *
 * Target facing is derived from Sprite.facingLeft:
 * - facingLeft=1 → facing angle = PI (facing left)
 * - facingLeft=0 → facing angle = 0 (facing right)
 *
 * Attack angle is the angle from target to attacker.
 * If the angle between target facing and attack direction
 * is greater than 120 degrees, the attack is a flank.
 */
function isFlanking(
  attackerX: number,
  attackerY: number,
  targetX: number,
  targetY: number,
  targetFacingLeft: number,
): boolean {
  // Direction from target to attacker
  const dx = attackerX - targetX;
  const dy = attackerY - targetY;
  const attackAngle = Math.atan2(dy, dx);

  // Target's facing angle
  const facingAngle = targetFacingLeft ? Math.PI : 0;

  // Angular difference between facing and attack direction
  let angleDiff = Math.abs(attackAngle - facingAngle);
  if (angleDiff > Math.PI) angleDiff = 2 * Math.PI - angleDiff;

  return angleDiff > FLANK_ANGLE_THRESHOLD;
}

/**
 * Emit floating text for positional bonuses.
 */
export function emitPositionalBonusText(
  world: GameWorld,
  targetEid: number,
  bonuses: PositionalBonuses,
): void {
  if (!hasComponent(world.ecs, targetEid, Position)) return;

  const tx = Position.x[targetEid];
  const ty = Position.y[targetEid];
  const spriteH = hasComponent(world.ecs, targetEid, Sprite) ? Sprite.height[targetEid] : 32;

  if (bonuses.flanking) {
    world.floatingTexts.push({
      x: tx + (world.gameRng.next() * 8 - 4),
      y: ty - spriteH / 2 - 15,
      text: 'FLANKED!',
      color: '#f59e0b',
      life: 50,
    });
  }

  if (bonuses.elevationUp) {
    world.floatingTexts.push({
      x: tx + (world.gameRng.next() * 8 - 4),
      y: ty - spriteH / 2 - 25,
      text: 'HIGH GROUND!',
      color: '#3b82f6',
      life: 50,
    });
  }
}
