/**
 * Health System -- orchestrator
 *
 * Delegates to focused sub-modules:
 * - take-damage.ts: damage application, retaliation, ally assist
 * - death.ts: entity death processing, stats, corpses
 * - healing.ts: passive healing, healer aura, herbalist hut
 *
 * Win/lose conditions:
 * - Normal mode: LOSE if Lodge destroyed, WIN if all enemy nests destroyed
 * - Wave-survival mode (stage 1, no nests): LOSE if Lodge destroyed,
 *   WIN if player survived waveSurvivalTarget waves
 * - Co-op: both-survive rules via coop-rules module
 */

import { hasComponent, type QueryResult, query, removeEntity } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { Combat, EntityTypeTag, FactionTag, Health, IsResource, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { checkCoopWinLose } from '@/net/coop-rules';
import { EntityKind, Faction } from '@/types';
import { processDeath } from './health/death';
import {
  processHealerAura,
  processHerbalistHutHeal,
  processPassiveHealing,
  processRegeneration,
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

  // Regeneration tech (every 300 frames, all units)
  if (world.frameCount % 300 === 0 && world.tech.regeneration) processRegeneration(world);

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
    checkWinLoseConditions(world, allLiving);
  }
}

/** Check win/lose conditions based on game mode. */
function checkWinLoseConditions(world: GameWorld, allLiving: QueryResult): void {
  let playerLodgeAlive = false;
  let nestsRemaining = false;
  let lodgeX = 0;
  let lodgeY = 0;
  let lastNestX = 0;
  let lastNestY = 0;

  for (let i = 0; i < allLiving.length; i++) {
    const eid = allLiving[i];
    if (Health.current[eid] <= 0) continue;
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    const faction = FactionTag.faction[eid] as Faction;
    if (kind === EntityKind.Lodge && faction === Faction.Player) {
      playerLodgeAlive = true;
      lodgeX = Position.x[eid];
      lodgeY = Position.y[eid];
    }
    if (kind === EntityKind.PredatorNest) {
      nestsRemaining = true;
      lastNestX = Position.x[eid];
      lastNestY = Position.y[eid];
    }
  }

  // Co-op: use both-survive rules when coopMode is active
  if (world.coopMode) {
    const result = checkCoopWinLose(playerLodgeAlive, nestsRemaining, world.partnerLodgeDestroyed);
    if (result === 'lose') {
      triggerGameEnd(world, 'lose', lodgeX, lodgeY);
    } else if (result === 'win') {
      triggerGameEnd(world, 'win', lastNestX, lastNestY);
    }
    return;
  }

  // Solo mode: Lodge destruction is always a loss
  if (!playerLodgeAlive) {
    triggerGameEnd(world, 'lose', lodgeX, lodgeY);
    return;
  }

  // Wave-survival mode (stage 1, no enemy nests): win after surviving N waves
  if (world.waveSurvivalMode) {
    // Don't check for victory during peace timer
    if (world.frameCount < world.peaceTimer) return;
    // Victory once enough waves have been weathered
    if (world.waveNumber >= world.waveSurvivalTarget) {
      triggerGameEnd(world, 'win', lodgeX, lodgeY);
    }
    return;
  }

  // Normal mode: win when all enemy nests are destroyed
  if (!nestsRemaining) {
    triggerGameEnd(world, 'win', lastNestX, lastNestY);
  }
}

/** Trigger game end with spectacle animation. */
function triggerGameEnd(
  world: GameWorld,
  result: 'win' | 'lose',
  focusX: number,
  focusY: number,
): void {
  world.state = result;
  world.gameEndFrame = world.frameCount;
  world.gameEndFocusX = focusX;
  world.gameEndFocusY = focusY;
  world.gameEndPrevSpeed = world.gameSpeed;
  world.gameEndSpectacleActive = true;
  if (result === 'win') {
    audio.win();
  } else {
    audio.lose();
  }
}
