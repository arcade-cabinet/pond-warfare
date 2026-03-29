/**
 * Health System
 *
 * Ported from Entity.takeDamage() (lines 1550-1571), Entity.die() (lines 1809-1844),
 * healing (lines 1238-1246), flash timer decay (line 1576), and attack cooldown
 * decay (line 1575) of the original HTML game.
 *
 * Responsibilities:
 * - takeDamage utility: apply damage, flash timer, particles, floating text, retaliation,
 *   ally assist within 300 range, trigger death if HP <= 0
 * - Death processing: remove entity, stats tracking, corpse creation, screen shake for
 *   buildings, particle burst on death, kill credit to attacker
 * - Passive healing: every 300 frames, player non-building units heal +1 HP when idle/non-combat
 * - Flash timer decay every frame
 * - Attack cooldown decay every frame
 */

import { hasComponent, query, removeEntity } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { ALLY_ASSIST_RADIUS, PALETTE } from '@/constants';
import {
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Sprite,
  trainingQueueSlots,
  UnitStateMachine,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, SpriteId, UnitState } from '@/types';

/**
 * Apply damage to an entity. Exported as a utility for use by combat and projectile systems.
 * Direct port of Entity.takeDamage() (lines 1550-1571).
 */
export function takeDamage(
  world: GameWorld,
  targetEid: number,
  amount: number,
  attackerEid: number,
): void {
  if (!hasComponent(world.ecs, targetEid, Health)) return;
  if (Health.current[targetEid] <= 0) return;

  // Apply damage
  Health.current[targetEid] -= amount;
  audio.hit();

  // Damage flash timer (original: this.flashTimer = 8)
  Health.flashTimer[targetEid] = 8;

  const tx = Position.x[targetEid];
  const ty = Position.y[targetEid];
  const isBuilding = hasComponent(world.ecs, targetEid, IsBuilding);

  // Damage particles (original: for(let i=0;i<5;i++) GAME.particles.push({...}))
  for (let p = 0; p < 5; p++) {
    world.particles.push({
      x: tx,
      y: ty - 10,
      vx: (Math.random() - 0.5) * 2,
      vy: Math.random() * 2,
      life: 15,
      color: isBuilding ? PALETTE.mudLight : PALETTE.clamMeat,
      size: 3,
    });
  }

  // Floating damage text
  // Original: GAME.floatingTexts.push({x: this.x + (Math.random()*10-5), y: this.y - this.height/2 - 5, t: `-${amount}`, c: '#ef4444', life: 40});
  const spriteH = hasComponent(world.ecs, targetEid, Sprite) ? Sprite.height[targetEid] : 32;
  world.floatingTexts.push({
    x: tx + (Math.random() * 10 - 5),
    y: ty - spriteH / 2 - 5,
    text: `-${amount}`,
    color: '#ef4444',
    life: 40,
  });

  // Retaliation and ally assist (only if target is still alive and has an attacker)
  if (Health.current[targetEid] > 0 && attackerEid !== undefined) {
    const targetFaction = hasComponent(world.ecs, targetEid, FactionTag)
      ? (FactionTag.faction[targetEid] as Faction)
      : Faction.Neutral;
    const attackerFaction = hasComponent(world.ecs, attackerEid, FactionTag)
      ? (FactionTag.faction[attackerEid] as Faction)
      : Faction.Neutral;

    // Minimap ping for player units attacked by enemies
    // Original: if (this.faction === 'player' && attacker.faction === 'enemy') GAME.addPing(this.x, this.y);
    if (targetFaction === Faction.Player && attackerFaction === Faction.Enemy) {
      world.minimapPings.push({
        x: tx,
        y: ty,
        life: 120,
        maxLife: 120,
      });
    }

    // Target retaliates if in non-combat idle-ish state
    // Original: if (!this.isBuilding && ['idle', 'gath', 'g_move', 'r_move', 'move'].includes(this.state) && this.dmg)
    if (
      !isBuilding &&
      hasComponent(world.ecs, targetEid, UnitStateMachine) &&
      hasComponent(world.ecs, targetEid, Combat) &&
      Combat.damage[targetEid] > 0
    ) {
      const targetState = UnitStateMachine.state[targetEid] as UnitState;
      if (
        targetState === UnitState.Idle ||
        targetState === UnitState.Gathering ||
        targetState === UnitState.GatherMove ||
        targetState === UnitState.ReturnMove ||
        targetState === UnitState.Move
      ) {
        // cmdAtk(attacker)
        UnitStateMachine.targetEntity[targetEid] = attackerEid;
        UnitStateMachine.targetX[targetEid] = Position.x[attackerEid];
        UnitStateMachine.targetY[targetEid] = Position.y[attackerEid];
        UnitStateMachine.state[targetEid] = UnitState.AttackMove;
      }
    }

    // Ally assist: nearby allies in idle/move state attack the attacker
    // Original lines 1561-1568
    const allies = query(world.ecs, [UnitStateMachine, Health, FactionTag, EntityTypeTag]);
    for (let j = 0; j < allies.length; j++) {
      const ally = allies[j];
      if (ally === targetEid) continue;
      if (!hasComponent(world.ecs, ally, FactionTag)) continue;
      if (FactionTag.faction[ally] !== targetFaction) continue;
      if (hasComponent(world.ecs, ally, IsBuilding)) continue;
      if (Health.current[ally] <= 0) continue;
      if (!hasComponent(world.ecs, ally, Combat) || Combat.damage[ally] <= 0) continue;

      const allyState = UnitStateMachine.state[ally] as UnitState;
      if (allyState !== UnitState.Idle && allyState !== UnitState.Move) continue;

      const dx = Position.x[ally] - tx;
      const dy = Position.y[ally] - ty;
      const dist = Math.sqrt(dx * dx + dy * dy);

      // Original: if (dist < 300) e.cmdAtk(attacker);
      if (dist < ALLY_ASSIST_RADIUS) {
        UnitStateMachine.targetEntity[ally] = attackerEid;
        UnitStateMachine.targetX[ally] = Position.x[attackerEid];
        UnitStateMachine.targetY[ally] = Position.y[attackerEid];
        UnitStateMachine.state[ally] = UnitState.AttackMove;
      }
    }
  }

  // Check for death
  // Original: if (this.hp <= 0) this.die();
  if (Health.current[targetEid] <= 0) {
    processDeath(world, targetEid, attackerEid);
  }
}

/**
 * Process entity death. Direct port of Entity.die() (lines 1809-1844).
 */
function processDeath(world: GameWorld, eid: number, attackerEid?: number): void {
  // Prevent double-die: guard against re-entry during the same frame.
  // We use HP === -1 as a sentinel since the entity is about to be removed.
  if (Health.current[eid] === -1) return;
  Health.current[eid] = -1;

  const isBuilding = hasComponent(world.ecs, eid, IsBuilding);
  const isResource = hasComponent(world.ecs, eid, IsResource);
  const ex = Position.x[eid];
  const ey = Position.y[eid];

  // Stats tracking (original lines 1818-1820)
  if (hasComponent(world.ecs, eid, FactionTag)) {
    const faction = FactionTag.faction[eid] as Faction;
    if (faction === Faction.Player && !isBuilding && !isResource) {
      world.stats.unitsLost++;
    }
    if (faction === Faction.Enemy && !isBuilding) {
      world.stats.unitsKilled++;
    }
  }

  // Screen shake for building destruction (original: if (this.isBuilding) GAME.triggerShake())
  if (isBuilding) {
    world.shakeTimer = 20;
    audio.deathBuilding();
  } else if (!isResource) {
    audio.deathUnit();
  }

  // Death particle burst
  if (isBuilding) {
    // Ring pattern for buildings
    for (let j = 0; j < 35; j++) {
      const angle = (j / 35) * Math.PI * 2;
      const spread = 2 + Math.random() * 3;
      world.particles.push({
        x: ex,
        y: ey,
        vx: Math.cos(angle) * spread,
        vy: Math.sin(angle) * spread + 2,
        life: 30,
        color: PALETTE.mudLight,
        size: 4,
      });
    }
  } else {
    for (let j = 0; j < 20; j++) {
      world.particles.push({
        x: ex,
        y: ey,
        vx: (Math.random() - 0.5) * 4,
        vy: (Math.random() - 0.5) * 4 + 2,
        life: 30,
        color: PALETTE.clamMeat,
        size: 4,
      });
    }
    // Splat variant particles for units
    if (!isResource) {
      for (let j = 0; j < 5; j++) {
        world.particles.push({
          x: ex + (Math.random() - 0.5) * 10,
          y: ey + (Math.random() - 0.5) * 10,
          vx: (Math.random() - 0.5) * 2,
          vy: Math.random() * 2 + 1,
          life: 15,
          color: PALETTE.clamMeat,
          size: 6,
        });
      }
    }
  }

  // Battlefield corpses/ruins (original lines 1828-1834)
  if (!isResource) {
    world.corpses.push({
      x: ex,
      y: ey,
      spriteId: isBuilding ? SpriteId.Rubble : SpriteId.Bones,
      life: 1800,
      maxLife: 1800,
    });
  }

  // Credit kill to attacker (original lines 1836-1843)
  if (attackerEid !== undefined && hasComponent(world.ecs, attackerEid, Combat)) {
    Combat.kills[attackerEid]++;
  }

  // Clean up Yuka vehicle for enemy entities
  world.yukaManager.removeEnemy(eid);

  // Clean up training queue slots
  trainingQueueSlots.delete(eid);

  // Remove from selection array if selected
  const selIdx = world.selection.indexOf(eid);
  if (selIdx > -1) {
    world.selection.splice(selIdx, 1);
  }

  // Remove entity from ECS
  removeEntity(world.ecs, eid);
}

/**
 * Main health system tick - handles cooldowns, flash timers, passive healing, and death checks.
 */
export function healthSystem(world: GameWorld): void {
  // --- Attack cooldown decay and flash timer decay (lines 1575-1576) ---
  const combatants = query(world.ecs, [Health, Combat]);
  for (let i = 0; i < combatants.length; i++) {
    const eid = combatants[i];
    // Original: if (this.atkCD > 0) this.atkCD--;
    if (Combat.attackCooldown[eid] > 0) {
      Combat.attackCooldown[eid]--;
    }
  }

  // Flash timer decay for all entities with health
  const allLiving = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  for (let i = 0; i < allLiving.length; i++) {
    const eid = allLiving[i];
    // Original: if (this.flashTimer > 0) this.flashTimer--;
    if (Health.flashTimer[eid] > 0) {
      Health.flashTimer[eid]--;
    }
  }

  // --- Passive healing (lines 1238-1246) ---
  // Original: if (this.frameCount % 300 === 0) { player non-building units heal +1 HP when in non-combat states }
  if (world.frameCount % 300 === 0) {
    const units = query(world.ecs, [UnitStateMachine, Health, FactionTag, EntityTypeTag]);
    for (let i = 0; i < units.length; i++) {
      const eid = units[i];
      if (FactionTag.faction[eid] !== Faction.Player) continue;
      if (hasComponent(world.ecs, eid, IsBuilding)) continue;
      if (hasComponent(world.ecs, eid, IsResource)) continue;
      if (Health.current[eid] <= 0) continue;
      if (Health.current[eid] >= Health.max[eid]) continue;

      const state = UnitStateMachine.state[eid] as UnitState;
      // Original: if (ent.state === 'idle' || ent.state === 'move' || ent.state === 'gath' || ent.state === 'g_move' || ent.state === 'r_move')
      if (
        state === UnitState.Idle ||
        state === UnitState.Move ||
        state === UnitState.Gathering ||
        state === UnitState.GatherMove ||
        state === UnitState.ReturnMove
      ) {
        Health.current[eid] = Math.min(Health.max[eid], Health.current[eid] + 1);
      }
    }
  }

  // --- Death check for entities that reached 0 HP outside of takeDamage ---
  // This handles resources depleted by gathering, etc.
  for (let i = allLiving.length - 1; i >= 0; i--) {
    const eid = allLiving[i];
    if (Health.current[eid] <= 0 && Health.current[eid] !== -1) {
      // Resources die silently (no particles/corpse beyond what isResource handles)
      if (hasComponent(world.ecs, eid, IsResource)) {
        // Remove from selection
        const selIdx = world.selection.indexOf(eid);
        if (selIdx > -1) world.selection.splice(selIdx, 1);
        removeEntity(world.ecs, eid);
      } else {
        processDeath(world, eid);
      }
    }
  }

  // --- Screen shake decay (original: if (this.shakeTimer > 0) this.shakeTimer--) ---
  if (world.shakeTimer > 0) {
    world.shakeTimer--;
  }

  // --- Win/lose condition check (lines 1248-1252) ---
  // Original: if (this.frameCount % 60 === 0) { check lodge alive, nests remaining }
  if (world.frameCount % 60 === 0 && world.state === 'playing') {
    let playerLodgeAlive = false;
    let nestsRemaining = false;

    for (let i = 0; i < allLiving.length; i++) {
      const eid = allLiving[i];
      if (Health.current[eid] <= 0) continue;
      const kind = EntityTypeTag.kind[eid] as EntityKind;
      const faction = FactionTag.faction[eid] as Faction;

      if (kind === EntityKind.Lodge && faction === Faction.Player) {
        playerLodgeAlive = true;
      }
      if (kind === EntityKind.PredatorNest) {
        nestsRemaining = true;
      }
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
