/**
 * Under-Attack Alert System
 *
 * Fires audio/visual alerts when player buildings or units near the
 * Lodge take damage from enemies. Alerts are cooldown-gated to avoid
 * spamming the player.
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { EntityTypeTag, FactionTag, Health, IsBuilding, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

/** Minimum frames between consecutive attack alerts (~10 seconds at 60fps). */
const ALERT_COOLDOWN = 600;

/** Proximity radius to Lodge for "units under attack near base" alert. */
const LODGE_PROXIMITY = 300;

let lastAlertFrame = -Infinity;

/** Reset alert state (call on new game). */
export function resetAttackAlerts(): void {
  lastAlertFrame = -Infinity;
}

/**
 * Check whether a player entity being damaged warrants an alert.
 * Call this from takeDamage() for player-faction targets.
 */
export function checkAttackAlert(world: GameWorld, targetEid: number): void {
  if (world.frameCount - lastAlertFrame < ALERT_COOLDOWN) return;

  // Only alert for player entities
  if (!hasComponent(world.ecs, targetEid, FactionTag)) return;
  if (FactionTag.faction[targetEid] !== Faction.Player) return;

  const tx = Position.x[targetEid];
  const ty = Position.y[targetEid];
  const isBuilding = hasComponent(world.ecs, targetEid, IsBuilding);

  if (isBuilding) {
    // Major alert: building under attack
    audio.alert();
    world.floatingTexts.push({
      x: tx,
      y: ty - 40,
      text: 'BASE UNDER ATTACK!',
      color: '#ef4444',
      life: 90,
    });
    world.minimapPings.push({ x: tx, y: ty, life: 120, maxLife: 120 });
    lastAlertFrame = world.frameCount;
    return;
  }

  // Minor alert: unit under attack near Lodge
  if (isNearLodge(world, tx, ty)) {
    audio.alert();
    world.floatingTexts.push({
      x: tx,
      y: ty - 30,
      text: 'Units under attack!',
      color: '#f97316',
      life: 70,
    });
    world.minimapPings.push({ x: tx, y: ty, life: 90, maxLife: 90 });
    lastAlertFrame = world.frameCount;
  }
}

/** Check if coordinates are within LODGE_PROXIMITY of any player Lodge. */
function isNearLodge(world: GameWorld, x: number, y: number): boolean {
  const buildings = query(world.ecs, [Health, IsBuilding, FactionTag, EntityTypeTag, Position]);
  for (let i = 0; i < buildings.length; i++) {
    const eid = buildings[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if ((EntityTypeTag.kind[eid] as EntityKind) !== EntityKind.Lodge) continue;
    if (Health.current[eid] <= 0) continue;
    const dx = Position.x[eid] - x;
    const dy = Position.y[eid] - y;
    if (dx * dx + dy * dy < LODGE_PROXIMITY * LODGE_PROXIMITY) return true;
  }
  return false;
}
