/**
 * Active Abilities
 *
 * v3.0 note: In-game research was removed, but these abilities remain
 * valid. They gate on world.tech flags (swiftPaws, pondBlessing,
 * tidalSurge) which are set at game start based on the chosen commander,
 * not through in-game research. All functions accept the GameWorld and
 * return boolean success.
 */

import { query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { FactionTag, Health, Position } from '@/ecs/components';
import { takeDamage } from '@/ecs/systems/health';
import type { GameWorld } from '@/ecs/world';
import { Faction } from '@/types';

/** Activate Shadow Sprint: +40% speed to all units for 8s. Cooldown 60s. */
export function useShadowSprint(world: GameWorld): boolean {
  if (!world.tech.swiftPaws) return false;
  if (world.frameCount < world.rallyCryCooldownUntil) return false;
  if (world.rallyCryExpiry > 0 && world.frameCount < world.rallyCryExpiry) return false;

  world.rallyCryExpiry = world.frameCount + 480; // 8s at 60fps
  world.rallyCryCooldownUntil = world.frameCount + 3600; // 60s cooldown

  audio.upgrade();
  world.floatingTexts.push({
    x: world.camX + world.viewWidth / 2,
    y: world.camY + 60,
    text: 'SHADOW SPRINT! +40% Speed',
    color: '#a78bfa',
    life: 120,
  });
  return true;
}

/** Activate Pond Blessing: heal all player units 20% HP. 120s cooldown. */
export function usePondBlessing(world: GameWorld): boolean {
  if (!world.tech.pondBlessing) return false;
  if (world.frameCount < world.pondBlessingCooldownUntil) return false;

  const allUnits = query(world.ecs, [Position, Health, FactionTag]);
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    const healAmt = Math.round(Health.max[eid] * 0.2);
    Health.current[eid] = Math.min(Health.max[eid], Health.current[eid] + healAmt);
    world.particles.push({
      x: Position.x[eid],
      y: Position.y[eid] - 10,
      vx: 0,
      vy: -1,
      life: 20,
      color: '#4ade80',
      size: 3,
    });
  }

  world.pondBlessingCooldownUntil = world.frameCount + 7200; // 120s at 60fps
  audio.heal();
  world.floatingTexts.push({
    x: world.camX + world.viewWidth / 2,
    y: world.camY + 60,
    text: 'POND BLESSING! All units +20% HP!',
    color: '#4ade80',
    life: 120,
  });
  return true;
}

/** Activate Tidal Surge: deal 50 damage to all enemies on the map (one-time). */
export function useTidalSurge(world: GameWorld): boolean {
  if (!world.tech.tidalSurge || world.tidalSurgeUsed) return false;

  const allEnts = query(world.ecs, [Position, Health, FactionTag]);
  for (let i = 0; i < allEnts.length; i++) {
    const eid = allEnts[i];
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (Health.current[eid] <= 0) continue;
    takeDamage(world, eid, 50, -1);
    world.particles.push({
      x: Position.x[eid],
      y: Position.y[eid],
      vx: (world.gameRng.next() - 0.5) * 2,
      vy: -world.gameRng.next() * 2,
      life: 25,
      color: '#38bdf8',
      size: 4,
    });
  }

  world.tidalSurgeUsed = true;
  world.shakeTimer = Math.max(world.shakeTimer, 10);
  audio.alert();
  world.floatingTexts.push({
    x: world.camX + world.viewWidth / 2,
    y: world.camY + 60,
    text: 'TIDAL SURGE! 50 damage to all enemies!',
    color: '#38bdf8',
    life: 120,
  });
  return true;
}
