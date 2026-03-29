/**
 * Evolution System
 *
 * Tracks enemy faction evolution over time, unlocking progressively
 * stronger enemy unit types as the game progresses. Each tier introduces
 * a new threat that forces the player to adapt their strategy.
 *
 * Tier 0: Gator + Snake (base enemies)
 * Tier 1: Armored Gator (tanky melee)
 * Tier 2: Venom Snake (poison DoT)
 * Tier 3: Swamp Drake (fast flanker)
 * Tier 4: Siege Turtle (anti-building)
 * Tier 5: Alpha Predator (hero enemy with damage aura)
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { entityKindName } from '@/config/entity-defs';
import {
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';
import { spawnParticle } from '@/utils/particles';

/** Minutes after peace ends at which each evolution tier triggers. */
const THRESHOLDS = [5, 10, 15, 25, 40];

/** Order in which enemy unit types unlock, one per tier. */
const EVOLUTION_ORDER: EntityKind[] = [
  EntityKind.ArmoredGator, // Tier 1: tanky melee
  EntityKind.VenomSnake, // Tier 2: poison DoT
  EntityKind.SwampDrake, // Tier 3: fast flanker
  EntityKind.SiegeTurtle, // Tier 4: anti-building
  EntityKind.AlphaPredator, // Tier 5: hero enemy
];

/**
 * Checks for tier-up evolution and unlocks new enemy unit types.
 * Runs every 600 frames (10 seconds).
 */
export function evolutionSystem(world: GameWorld): void {
  // Check every 600 frames (10 seconds)
  if (world.frameCount % 600 !== 0) return;
  if (world.frameCount < world.peaceTimer) return; // No evolution during peace

  const evo = world.enemyEvolution;
  const currentTier = evo.tier;
  const gameMinutes = (world.frameCount - world.peaceTimer) / 3600; // minutes since peace ended

  if (currentTier < THRESHOLDS.length && gameMinutes >= THRESHOLDS[currentTier]) {
    // Evolve!
    evo.tier++;
    evo.lastEvolutionFrame = world.frameCount;

    const newUnit = EVOLUTION_ORDER[currentTier];
    evo.unlockedUnits.push(newUnit);

    // Announce evolution
    const name = entityKindName(newUnit);
    world.floatingTexts.push({
      x: world.camX + world.viewWidth / 2,
      y: world.camY + 60,
      text: `WARNING: ${name} spotted!`,
      color: '#ef4444',
      life: 180,
    });
    world.shakeTimer = Math.max(world.shakeTimer, 10);
    audio.alert();
  }

  // --- Poison tick: apply 2 damage per second (every 60 frames) ---
  if (world.frameCount % 60 === 0) {
    for (const [eid, remaining] of world.poisonTimers) {
      if (!hasComponent(world.ecs, eid, Health) || Health.current[eid] <= 0) {
        world.poisonTimers.delete(eid);
        continue;
      }

      Health.current[eid] -= 2;
      Health.flashTimer[eid] = 4;

      // Green poison particles
      if (hasComponent(world.ecs, eid, Position)) {
        for (let i = 0; i < 3; i++) {
          spawnParticle(
            world,
            Position.x[eid] + (Math.random() - 0.5) * 10,
            Position.y[eid] - 5,
            (Math.random() - 0.5) * 1,
            -Math.random() * 1.5,
            15,
            '#22c55e',
            2,
          );
        }
      }

      if (remaining <= 1) {
        world.poisonTimers.delete(eid);
      } else {
        world.poisonTimers.set(eid, remaining - 1);
      }
    }
  }

  // --- Alpha Predator damage aura: +20% damage to nearby enemies ---
  if (world.frameCount % 60 === 0) {
    const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, Combat]);

    // Find all living Alpha Predators
    for (let i = 0; i < allUnits.length; i++) {
      const eid = allUnits[i];
      if (FactionTag.faction[eid] !== Faction.Enemy) continue;
      if (Health.current[eid] <= 0) continue;
      if ((EntityTypeTag.kind[eid] as EntityKind) !== EntityKind.AlphaPredator) continue;
      if (hasComponent(world.ecs, eid, IsBuilding)) continue;
      if (hasComponent(world.ecs, eid, IsResource)) continue;

      const ax = Position.x[eid];
      const ay = Position.y[eid];
      const auraRadius = 200;

      // Buff all nearby enemy units
      const candidates = world.spatialHash
        ? world.spatialHash.query(ax, ay, auraRadius)
        : allUnits;
      for (let j = 0; j < candidates.length; j++) {
        const t = candidates[j];
        if (t === eid) continue;
        if (!hasComponent(world.ecs, t, FactionTag) || FactionTag.faction[t] !== Faction.Enemy)
          continue;
        if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;
        if (!hasComponent(world.ecs, t, Combat)) continue;
        if (hasComponent(world.ecs, t, IsBuilding)) continue;
        if (hasComponent(world.ecs, t, IsResource)) continue;

        const dx = Position.x[t] - ax;
        const dy = Position.y[t] - ay;
        if (Math.sqrt(dx * dx + dy * dy) <= auraRadius) {
          // Mark as buffed until next check (expires in 60 frames)
          world.alphaDamageBuff.set(t, world.frameCount + 60);
        }
      }
    }

    // Clean up expired buffs
    for (const [eid, expiry] of world.alphaDamageBuff) {
      if (world.frameCount > expiry) {
        world.alphaDamageBuff.delete(eid);
      }
    }
  }
}
