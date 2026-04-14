/**
 * Commander Active Abilities
 *
 * Each commander has one powerful active ability with a cooldown.
 * Abilities are activated via the HUD button (Q key) and produce
 * distinct visual + audio effects.
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { COMMANDER_ABILITIES } from '@/config/commanders';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  Velocity,
} from '@/ecs/components';
import { takeDamage } from '@/ecs/systems/health/take-damage';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

/** Check if the commander ability is off cooldown and can be used. */
export function canUseCommanderAbility(world: GameWorld): boolean {
  const ability = COMMANDER_ABILITIES[world.commanderId];
  if (!ability) return false;
  if (world.frameCount < world.commanderAbilityCooldownUntil) return false;
  if (world.commanderAbilityActiveUntil > world.frameCount) return false;
  return true;
}

/** Get remaining cooldown in seconds (for UI display). */
export function getAbilityCooldownSeconds(world: GameWorld): number {
  const remaining = world.commanderAbilityCooldownUntil - world.frameCount;
  if (remaining <= 0) return 0;
  return Math.ceil(remaining / 60);
}

/** Activate the commander's active ability. Returns true on success. */
export function useCommanderAbility(world: GameWorld): boolean {
  if (!canUseCommanderAbility(world)) return false;

  const ability = COMMANDER_ABILITIES[world.commanderId];
  if (!ability) return false;

  // Execute ability-specific logic
  const activated = (() => {
    switch (world.commanderId) {
      case 'marshal':
        return activateCharge(world);
      case 'sage':
        return activateEureka(world);
      case 'warden':
        return activateFortify(world);
      case 'tidekeeper':
        return activateTidalWave(world);
      case 'shadowfang':
        return activateVanish(world);
      case 'ironpaw':
        return activateIronWill(world);
      case 'stormcaller':
        return activateThunderStrike(world);
      default:
        return false;
    }
  })();

  if (!activated) return false;

  world.commanderAbilityCooldownUntil = world.frameCount + ability.cooldownFrames;
  world.commanderAbilityActiveUntil =
    ability.durationFrames > 0 ? world.frameCount + ability.durationFrames : 0;
  return true;
}

/** Marshal: "Charge!" — selected units 2x speed for 5s */
function activateCharge(world: GameWorld): boolean {
  world.commanderAbilityTargets.clear();
  for (const eid of world.selection) {
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    world.commanderAbilityTargets.add(eid);
  }
  if (world.commanderAbilityTargets.size === 0) return false;

  audio.upgrade();
  world.floatingTexts.push({
    x: world.camX + world.viewWidth / 2,
    y: world.camY + 60,
    text: 'CHARGE! +2x Speed!',
    color: '#3b82f6',
    life: 120,
  });
  return true;
}

/** Sage: "Eureka!" — instantly grant a resource spike for the current run */
function activateEureka(world: GameWorld): boolean {
  world.resources.fish += 60;
  world.resources.logs += 20;
  world.resources.rocks += 10;

  audio.upgrade();
  world.floatingTexts.push({
    x: world.camX + world.viewWidth / 2,
    y: world.camY + 60,
    text: 'EUREKA! +60F +20L +10R',
    color: '#22c55e',
    life: 120,
  });
  return true;
}

/** Warden: "Fortify!" — all buildings invulnerable 10s (handled by health system) */
function activateFortify(world: GameWorld): boolean {
  audio.upgrade();
  world.floatingTexts.push({
    x: world.camX + world.viewWidth / 2,
    y: world.camY + 60,
    text: 'FORTIFY! Buildings invulnerable!',
    color: '#f59e0b',
    life: 120,
  });
  return true;
}

/** Tidekeeper: "Tidal Wave" — push enemies away from Lodge */
function activateTidalWave(world: GameWorld): boolean {
  // Find player Lodge
  const buildings = query(world.ecs, [Position, Health, IsBuilding, FactionTag, EntityTypeTag]);
  let lodgeX = 0;
  let lodgeY = 0;
  let found = false;
  for (const eid of buildings) {
    if (
      EntityTypeTag.kind[eid] === EntityKind.Lodge &&
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0
    ) {
      lodgeX = Position.x[eid];
      lodgeY = Position.y[eid];
      found = true;
      break;
    }
  }
  if (!found) return false;

  // Push all enemies within 400px radius, deal 30 damage
  const pushRadius = 400;
  const allUnits = query(world.ecs, [Position, Health, FactionTag, Velocity]);
  for (const eid of allUnits) {
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (Health.current[eid] <= 0) continue;
    const dx = Position.x[eid] - lodgeX;
    const dy = Position.y[eid] - lodgeY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > pushRadius || dist < 1) continue;

    // Push away
    const pushDist = 200;
    const nx = dx / dist;
    const ny = dy / dist;
    Position.x[eid] += nx * pushDist;
    Position.y[eid] += ny * pushDist;

    // Deal damage
    takeDamage(world, eid, 30, -1);

    // Water particle
    world.particles.push({
      x: Position.x[eid],
      y: Position.y[eid],
      vx: nx * 3,
      vy: ny * 3 - 1,
      life: 25,
      color: '#38bdf8',
      size: 4,
    });
  }

  world.shakeTimer = Math.max(world.shakeTimer, 15);
  audio.alert();
  world.floatingTexts.push({
    x: world.camX + world.viewWidth / 2,
    y: world.camY + 60,
    text: 'TIDAL WAVE!',
    color: '#38bdf8',
    life: 120,
  });
  return true;
}

/** Shadowfang: "Vanish" — all units invisible 8s (handled by fog system) */
function activateVanish(world: GameWorld): boolean {
  const allUnits = query(world.ecs, [Position, Health, FactionTag]);
  let affected = 0;
  for (const eid of allUnits) {
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;
    affected++;
  }
  if (affected === 0) return false;

  audio.upgrade();
  world.floatingTexts.push({
    x: world.camX + world.viewWidth / 2,
    y: world.camY + 60,
    text: 'VANISH! Units invisible!',
    color: '#a855f7',
    life: 120,
  });
  return true;
}

/** Ironpaw: "Iron Will" — all units immune to damage 5s (handled by health system) */
function activateIronWill(world: GameWorld): boolean {
  audio.upgrade();
  world.floatingTexts.push({
    x: world.camX + world.viewWidth / 2,
    y: world.camY + 60,
    text: 'IRON WILL! Damage immunity!',
    color: '#ef4444',
    life: 120,
  });
  return true;
}

/** Stormcaller: "Thunder Strike" — massive AoE at camera center */
function activateThunderStrike(world: GameWorld): boolean {
  const centerX = world.camX + world.viewWidth / 2;
  const centerY = world.camY + world.viewHeight / 2;
  const aoeRadius = 200;
  const damage = 80;

  const allUnits = query(world.ecs, [Position, Health, FactionTag]);
  for (const eid of allUnits) {
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (Health.current[eid] <= 0) continue;
    const dx = Position.x[eid] - centerX;
    const dy = Position.y[eid] - centerY;
    if (dx * dx + dy * dy > aoeRadius * aoeRadius) continue;

    takeDamage(world, eid, damage, -1);
    world.particles.push({
      x: Position.x[eid],
      y: Position.y[eid] - 10,
      vx: (world.gameRng.next() - 0.5) * 4,
      vy: -world.gameRng.next() * 4,
      life: 20,
      color: '#fbbf24',
      size: 5,
    });
  }

  // Lightning particles at impact zone
  for (let i = 0; i < 30; i++) {
    const angle = (i / 30) * Math.PI * 2;
    const r = world.gameRng.next() * aoeRadius;
    world.particles.push({
      x: centerX + Math.cos(angle) * r,
      y: centerY + Math.sin(angle) * r,
      vx: (world.gameRng.next() - 0.5) * 2,
      vy: -world.gameRng.next() * 3 - 1,
      life: 30,
      color: '#fbbf24',
      size: 3,
    });
  }

  world.shakeTimer = Math.max(world.shakeTimer, 20);
  audio.alert();
  world.floatingTexts.push({
    x: centerX,
    y: centerY - 40,
    text: 'THUNDER STRIKE!',
    color: '#fbbf24',
    life: 120,
  });
  return true;
}
