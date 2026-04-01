/**
 * Health System – orchestrator
 *
 * Delegates to focused sub-modules:
 * - take-damage.ts: damage application, retaliation, ally assist
 * - death.ts: entity death processing, stats, corpses
 * - healing.ts: passive healing, healer aura, herbalist hut
 */

import { hasComponent, query, removeEntity } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { Combat, EntityTypeTag, FactionTag, Health, IsResource, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';
import { processDeath } from './health/death';
import {
  processHealerAura,
  processHerbalistHutHeal,
  processPassiveHealing,
} from './health/healing';

// Re-export takeDamage for external consumers
export { takeDamage } from './health/take-damage';

/**
 * Main health system tick - handles cooldowns, flash timers,
 * passive healing, death checks, and win/lose conditions.
 */
export function healthSystem(world: GameWorld): void {
  // Attack cooldown decay
  const combatants = query(world.ecs, [Health, Combat]);
  for (let i = 0; i < combatants.length; i++) {
    const eid = combatants[i];
    if (Combat.attackCooldown[eid] > 0) Combat.attackCooldown[eid]--;
  }

  // Flash timer decay
  const allLiving = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  for (let i = 0; i < allLiving.length; i++) {
    const eid = allLiving[i];
    if (Health.flashTimer[eid] > 0) Health.flashTimer[eid]--;
  }

  // Passive healing (every 300 frames)
  if (world.frameCount % 300 === 0) processPassiveHealing(world);

  // Healer aura (every 60 frames)
  if (world.frameCount % 60 === 0) processHealerAura(world);

  // Herbalist hut heal (every 120 frames)
  if (world.frameCount % 120 === 0) processHerbalistHutHeal(world);

  // Death check for entities that reached 0 HP outside of takeDamage
  for (let i = allLiving.length - 1; i >= 0; i--) {
    const eid = allLiving[i];
    if (Health.current[eid] <= 0 && Health.current[eid] !== -1) {
      if (hasComponent(world.ecs, eid, IsResource)) {
        const selIdx = world.selection.indexOf(eid);
        if (selIdx > -1) world.selection.splice(selIdx, 1);
        removeEntity(world.ecs, eid);
      } else {
        processDeath(world, eid);
      }
    }
  }

  // Screen shake decay
  if (world.shakeTimer > 0) world.shakeTimer--;

  // Win/lose condition check (every 60 frames)
  if (world.frameCount % 60 === 0 && world.state === 'playing') {
    let playerLodgeAlive = false;
    let nestsRemaining = false;
    for (let i = 0; i < allLiving.length; i++) {
      const eid = allLiving[i];
      if (Health.current[eid] <= 0) continue;
      const kind = EntityTypeTag.kind[eid] as EntityKind;
      const faction = FactionTag.faction[eid] as Faction;
      if (kind === EntityKind.Lodge && faction === Faction.Player) playerLodgeAlive = true;
      if (kind === EntityKind.PredatorNest) nestsRemaining = true;
    }
    if (!playerLodgeAlive) {
      world.state = 'lose';
      audio.lose();
    } else if (!nestsRemaining) {
      world.state = 'win';
      audio.win();
    }
  }
}
