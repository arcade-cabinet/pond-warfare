/**
 * Commander Passives System
 *
 * Handles periodic commander passive abilities that don't fit
 * neatly into existing systems. Currently: Stormcaller lightning.
 */

import { hasComponent, query } from 'bitecs';
import { EntityTypeTag, FactionTag, Health, IsBuilding, Position } from '@/ecs/components';
import { takeDamage } from '@/ecs/systems/health';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

/** Interval in frames between lightning strikes (~15 seconds at 60fps). */
const LIGHTNING_INTERVAL = 900;

/** Number of enemy targets per lightning strike. */
const LIGHTNING_TARGETS = 3;

/**
 * Stormcaller passive: strike up to 3 random visible enemy units for moderate damage.
 * Fires every ~15 seconds when the commander has passiveLightningDamage > 0.
 */
function stormcallerLightning(world: GameWorld): void {
  const dmg = world.commanderModifiers.passiveLightningDamage;
  if (dmg <= 0) return;
  if (world.frameCount % LIGHTNING_INTERVAL !== 0) return;

  // Find living enemy units
  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  const enemies: number[] = [];
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    if (Health.current[eid] <= 0) continue;
    enemies.push(eid);
  }

  if (enemies.length === 0) return;

  // Pick up to LIGHTNING_TARGETS random enemies (no duplicates)
  const targetCount = Math.min(LIGHTNING_TARGETS, enemies.length);
  const targets: number[] = [];
  const available = [...enemies];
  for (let t = 0; t < targetCount; t++) {
    const idx = Math.floor(world.gameRng.next() * available.length);
    targets.push(available[idx]);
    available.splice(idx, 1);
  }

  for (const target of targets) {
    const tx = Position.x[target];
    const ty = Position.y[target];

    // Deal lightning damage (8-12 range centered on configured damage)
    const actualDmg = dmg + Math.round((world.gameRng.next() - 0.5) * 4);
    takeDamage(world, target, Math.max(1, actualDmg), -1);

    // Visual: white flash particles
    for (let j = 0; j < 6; j++) {
      world.particles.push({
        x: tx,
        y: ty - 10,
        vx: (world.gameRng.next() - 0.5) * 4,
        vy: -world.gameRng.next() * 3,
        life: 15,
        color: '#ffffff',
        size: 4,
      });
    }

    // Floating text
    world.floatingTexts.push({
      x: tx,
      y: ty - 25,
      text: 'ZAP!',
      color: '#facc15',
      life: 45,
    });
  }
}

/** Run all periodic commander passive effects. */
export function commanderPassivesSystem(world: GameWorld): void {
  syncCommanderAbilityState(world);
  stormcallerLightning(world);
}

function syncCommanderAbilityState(world: GameWorld): void {
  world.commanderAbilityTargets ??= new Set();
  world.stealthEntities ??= new Set();
  if (world.commanderId === 'marshal' && world.frameCount >= world.commanderAbilityActiveUntil) {
    world.commanderAbilityTargets.clear();
  }

  if (world.commanderId !== 'shadowfang') return;

  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  const vanishActive = world.frameCount < world.commanderAbilityActiveUntil;

  for (const eid of allUnits) {
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if (hasComponent(world.ecs, eid, IsBuilding)) continue;

    if (vanishActive) {
      world.stealthEntities.add(eid);
    } else if ((EntityTypeTag.kind[eid] as EntityKind) !== EntityKind.Diver) {
      world.stealthEntities.delete(eid);
    }
  }
}
