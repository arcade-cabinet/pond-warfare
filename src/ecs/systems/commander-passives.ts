/**
 * Commander Passives System
 *
 * Handles periodic commander passive abilities that don't fit
 * neatly into existing systems. Currently: Stormcaller lightning.
 */

import { query } from 'bitecs';
import { EntityTypeTag, FactionTag, Health, Position } from '@/ecs/components';
import { takeDamage } from '@/ecs/systems/health';
import type { GameWorld } from '@/ecs/world';
import { Faction } from '@/types';

/** Interval in frames between lightning strikes (~10 seconds at 60fps). */
const LIGHTNING_INTERVAL = 600;

/**
 * Stormcaller passive: strike a random visible enemy unit for moderate damage.
 * Fires every ~10 seconds when the commander has passiveLightningDamage > 0.
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

  // Pick a random enemy
  const target = enemies[Math.floor(Math.random() * enemies.length)];
  const tx = Position.x[target];
  const ty = Position.y[target];

  // Deal lightning damage (8-12 range centered on configured damage)
  const actualDmg = dmg + Math.round((Math.random() - 0.5) * 4);
  takeDamage(world, target, Math.max(1, actualDmg), -1);

  // Visual: white flash particles
  for (let j = 0; j < 6; j++) {
    world.particles.push({
      x: tx,
      y: ty - 10,
      vx: (Math.random() - 0.5) * 4,
      vy: -Math.random() * 3,
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

/** Run all periodic commander passive effects. */
export function commanderPassivesSystem(world: GameWorld): void {
  stormcallerLightning(world);
}
