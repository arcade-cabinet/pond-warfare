/**
 * Health System -- orchestrator
 *
 * Delegates to focused sub-modules:
 * - take-damage.ts: damage application, retaliation, ally assist
 * - death.ts: entity death processing, stats, corpses
 * - healing.ts: passive healing, healer aura, herbalist hut
 *
 * Win/lose conditions (priority order):
 * 1. Commander death: enemy Commander killed → WIN, player Commander killed → LOSE
 * 2. Lodge + extermination: Lodge destroyed + no units → LOSE (Commander mode)
 * 3. Legacy (no Commanders): Lodge destroyed → LOSE, all nests destroyed → WIN
 * 4. Wave-survival (stage 1): survive N waves → WIN
 * 5. Co-op: both-survive rules via coop-rules module
 */

import { hasComponent, type QueryResult, query, removeEntity } from 'bitecs';
import { audio } from '@/audio/audio-system';
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
  // --- Commander death checks (highest priority) ---
  const playerCmdDead = checkCommanderDead(world.commanderEntityId);
  const enemyCmdDead = checkCommanderDead(world.enemyCommanderEntityId);

  // Both die same frame → player wins tiebreak
  if (playerCmdDead && enemyCmdDead) {
    const ex = world.enemyCommanderEntityId >= 0 ? Position.x[world.enemyCommanderEntityId] : 0;
    const ey = world.enemyCommanderEntityId >= 0 ? Position.y[world.enemyCommanderEntityId] : 0;
    world.gameOverReason = 'commander-kill';
    triggerGameEnd(world, 'win', ex, ey);
    return;
  }

  // Enemy Commander dead → instant win
  if (enemyCmdDead) {
    const ex = world.enemyCommanderEntityId >= 0 ? Position.x[world.enemyCommanderEntityId] : 0;
    const ey = world.enemyCommanderEntityId >= 0 ? Position.y[world.enemyCommanderEntityId] : 0;
    world.gameOverReason = 'commander-kill';
    // Enemy Commander death visual (player Commander visual is in death.ts)
    world.floatingTexts.push({
      x: ex,
      y: ey - 50,
      text: 'ENEMY COMMANDER DEFEATED!',
      color: '#C5A059', // grittyGold
      life: 300,
    });
    world.shakeTimer = Math.max(world.shakeTimer, 30);
    triggerGameEnd(world, 'win', ex, ey);
    return;
  }

  // Player Commander dead → instant loss (visual already added by death.ts)
  if (playerCmdDead) {
    const px = world.commanderEntityId >= 0 ? Position.x[world.commanderEntityId] : 0;
    const py = world.commanderEntityId >= 0 ? Position.y[world.commanderEntityId] : 0;
    world.gameOverReason = 'commander-death';
    triggerGameEnd(world, 'lose', px, py);
    return;
  }

  // --- Scan living entities for Lodge/nest status ---
  let playerLodgeAlive = false;
  let nestsRemaining = false;
  let lodgeX = 0;
  let lodgeY = 0;
  let lastNestX = 0;
  let lastNestY = 0;
  let playerUnitsAlive = false;
  let enemyUnitsAlive = false;

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
    // Track living non-building units per faction (for extermination check)
    if (faction === Faction.Player && !hasComponent(world.ecs, eid, IsBuilding)) {
      playerUnitsAlive = true;
    }
    if (faction === Faction.Enemy && !hasComponent(world.ecs, eid, IsBuilding)) {
      enemyUnitsAlive = true;
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

  // --- Non-Commander win/lose (Lodge + extermination fallback) ---
  // When Commanders are in play, Lodge destruction only cuts off training;
  // game continues as long as Commander is alive.
  const hasCommanders = world.commanderEntityId >= 0 || world.enemyCommanderEntityId >= 0;

  if (!hasCommanders) {
    // No Commanders (stage 1 / legacy): Lodge destruction = loss
    if (!playerLodgeAlive) {
      triggerGameEnd(world, 'lose', lodgeX, lodgeY);
      return;
    }
  } else {
    // Commanders present: Lodge destroyed + all units dead = loss
    if (!playerLodgeAlive && !playerUnitsAlive) {
      world.gameOverReason = 'extermination';
      triggerGameEnd(world, 'lose', lodgeX, lodgeY);
      return;
    }
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

  // Normal mode: win when all enemy nests destroyed + all enemies dead
  if (!nestsRemaining && !enemyUnitsAlive) {
    world.gameOverReason = 'extermination';
    triggerGameEnd(world, 'win', lastNestX, lastNestY);
  }
}

/** Check if a Commander entity is dead (HP <= 0, including already-processed). */
function checkCommanderDead(cmdEid: number): boolean {
  if (cmdEid < 0) return false;
  // HP <= 0 covers both fresh death (0) and already-processed (-1 from processDeath)
  return Health.current[cmdEid] <= 0;
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
