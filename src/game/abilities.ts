/**
 * Active Abilities & Airdrop – tech tree abilities and supply drops.
 *
 * All functions accept the GameWorld and return boolean success.
 */

import { query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { spawnEntity } from '@/ecs/archetypes';
import { EntityTypeTag, FactionTag, Health, IsBuilding, Position } from '@/ecs/components';
import { takeDamage } from '@/ecs/systems/health';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';
import * as store from '@/ui/store';

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

/** Use an airdrop: spawn resources and units at the Lodge position. */
export function useAirdrop(world: GameWorld): boolean {
  if (world.airdropsRemaining <= 0) return false;
  if (world.frameCount < world.airdropCooldownUntil) return false;

  const buildings = query(world.ecs, [Position, Health, IsBuilding, FactionTag, EntityTypeTag]);
  let lodgeX = 0;
  let lodgeY = 0;
  let foundLodge = false;
  for (let i = 0; i < buildings.length; i++) {
    const eid = buildings[i];
    if (
      EntityTypeTag.kind[eid] === EntityKind.Lodge &&
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0
    ) {
      lodgeX = Position.x[eid];
      lodgeY = Position.y[eid];
      foundLodge = true;
      break;
    }
  }
  if (!foundLodge) return false;

  // Grant resources
  world.resources.clams += 200;
  world.resources.twigs += 100;

  // Spawn units near Lodge
  const offsets = [
    { x: -40, y: 60 },
    { x: 40, y: 60 },
    { x: 0, y: 80 },
  ];
  spawnEntity(
    world,
    EntityKind.Brawler,
    lodgeX + offsets[0].x,
    lodgeY + offsets[0].y,
    Faction.Player,
  );
  spawnEntity(
    world,
    EntityKind.Brawler,
    lodgeX + offsets[1].x,
    lodgeY + offsets[1].y,
    Faction.Player,
  );
  spawnEntity(
    world,
    EntityKind.Healer,
    lodgeX + offsets[2].x,
    lodgeY + offsets[2].y,
    Faction.Player,
  );

  // Decrement and set cooldown
  world.airdropsRemaining--;
  world.airdropCooldownUntil = world.frameCount + 600;
  store.airdropsRemaining.value = world.airdropsRemaining;
  store.airdropCooldown.value = 10;

  // Visual feedback
  world.floatingTexts.push({
    x: lodgeX,
    y: lodgeY - 40,
    text: 'SUPPLIES INCOMING!',
    color: '#facc15',
    life: 120,
  });

  for (let p = 0; p < 20; p++) {
    world.particles.push({
      x: lodgeX + (world.gameRng.next() - 0.5) * 60,
      y: lodgeY + (world.gameRng.next() - 0.5) * 60,
      vx: (world.gameRng.next() - 0.5) * 3,
      vy: -world.gameRng.next() * 3 - 1,
      life: 40,
      color: '#facc15',
      size: 4,
    });
  }

  return true;
}
