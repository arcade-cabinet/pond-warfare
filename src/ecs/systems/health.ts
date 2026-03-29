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
  Building,
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
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { createCorpseId, EntityKind, Faction, SpriteId, UnitState } from '@/types';
import { spawnParticle } from '@/utils/particles';

/**
 * Apply damage to an entity. Exported as a utility for use by combat and projectile systems.
 * Direct port of Entity.takeDamage() (lines 1550-1571).
 */
export function takeDamage(
  world: GameWorld,
  targetEid: number,
  amount: number,
  attackerEid: number,
  multiplier: number = 1.0,
): void {
  if (!hasComponent(world.ecs, targetEid, Health)) return;
  if (Health.current[targetEid] <= 0) return;

  // Guard against negative damage (would heal the target)
  const effectiveAmount = Math.max(0, Math.round(amount * multiplier));
  if (effectiveAmount === 0) return;

  // Apply damage
  Health.current[targetEid] -= effectiveAmount;
  audio.hit();

  // Damage flash timer (original: this.flashTimer = 8)
  Health.flashTimer[targetEid] = 8;

  const tx = Position.x[targetEid];
  const ty = Position.y[targetEid];
  const isBuilding = hasComponent(world.ecs, targetEid, IsBuilding);

  // Damage particles (original: for(let i=0;i<5;i++) GAME.particles.push({...}))
  const dmgPColor = isBuilding ? PALETTE.mudLight : PALETTE.clamMeat;
  for (let p = 0; p < 5; p++) {
    spawnParticle(
      world,
      tx,
      ty - 10,
      (Math.random() - 0.5) * 2,
      Math.random() * 2,
      15,
      dmgPColor,
      3,
    );
  }

  // Floating damage text — color varies by counter multiplier
  const spriteH = hasComponent(world.ecs, targetEid, Sprite) ? Sprite.height[targetEid] : 32;
  const dmgColor = multiplier > 1.0 ? '#f97316' : multiplier < 1.0 ? '#9ca3af' : '#ef4444';
  world.floatingTexts.push({
    x: tx + (Math.random() * 10 - 5),
    y: ty - spriteH / 2 - 5,
    text: `-${effectiveAmount}`,
    color: dmgColor,
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
    if (targetFaction === Faction.Player && attackerFaction === Faction.Enemy) {
      world.minimapPings.push({
        x: tx,
        y: ty,
        life: 120,
        maxLife: 120,
      });
    }

    // Target retaliates if in non-combat idle-ish state
    if (
      !isBuilding &&
      hasComponent(world.ecs, targetEid, UnitStateMachine) &&
      hasComponent(world.ecs, targetEid, Combat) &&
      Combat.damage[targetEid] > 0
    ) {
      const targetState = UnitStateMachine.state[targetEid] as UnitState;
      const targetKind = hasComponent(world.ecs, targetEid, EntityTypeTag)
        ? (EntityTypeTag.kind[targetEid] as EntityKind)
        : -1;

      if (
        targetState === UnitState.Idle ||
        targetState === UnitState.Gathering ||
        targetState === UnitState.GatherMove ||
        targetState === UnitState.ReturnMove ||
        targetState === UnitState.Move
      ) {
        // Gatherers in gathering-related states flee briefly before retaliating
        const isGathering =
          targetKind === EntityKind.Gatherer &&
          (targetState === UnitState.Gathering ||
            targetState === UnitState.GatherMove ||
            targetState === UnitState.ReturnMove);

        if (isGathering && !world.yukaManager.isFleeing(targetEid)) {
          // Flee away from the attacker position
          const attackerX = Position.x[attackerEid];
          const attackerY = Position.y[attackerEid];

          // Register with Yuka if not already
          if (!world.yukaManager.has(targetEid)) {
            const speed = hasComponent(world.ecs, targetEid, Velocity)
              ? Velocity.speed[targetEid]
              : 2.0;
            world.yukaManager.addUnit(targetEid, tx, ty, speed, tx, ty);
          }

          world.yukaManager.setFlee(targetEid, attackerX, attackerY);

          // Set state to Move so the movement system processes the Yuka
          // steering; the flee timer in YukaManager will auto-expire and
          // the unit will idle, at which point auto-gather can re-engage.
          UnitStateMachine.state[targetEid] = UnitState.Move;
          UnitStateMachine.targetX[targetEid] = tx + (tx - attackerX) * 0.5;
          UnitStateMachine.targetY[targetEid] = ty + (ty - attackerY) * 0.5;
        } else if (!isGathering) {
          // Non-gatherers (or gatherers already done fleeing) retaliate
          // cmdAtk(attacker)
          UnitStateMachine.targetEntity[targetEid] = attackerEid;
          UnitStateMachine.targetX[targetEid] = Position.x[attackerEid];
          UnitStateMachine.targetY[targetEid] = Position.y[attackerEid];
          UnitStateMachine.state[targetEid] = UnitState.AttackMove;
        }
      }
    }

    // Ally assist: nearby allies in idle/move state attack the attacker
    // Original lines 1561-1568
    const hasSpatial = world.spatialHash !== undefined;
    const allyCandidates = hasSpatial
      ? world.spatialHash.query(tx, ty, ALLY_ASSIST_RADIUS)
      : query(world.ecs, [UnitStateMachine, Health, FactionTag, EntityTypeTag]);
    for (let j = 0; j < allyCandidates.length; j++) {
      const ally = allyCandidates[j];
      if (ally === targetEid) continue;
      if (!hasComponent(world.ecs, ally, FactionTag)) continue;
      if (FactionTag.faction[ally] !== targetFaction) continue;
      if (!hasComponent(world.ecs, ally, UnitStateMachine)) continue;
      if (hasComponent(world.ecs, ally, IsBuilding)) continue;
      if (!hasComponent(world.ecs, ally, Health) || Health.current[ally] <= 0) continue;
      if (!hasComponent(world.ecs, ally, Combat) || Combat.damage[ally] <= 0) continue;

      const allyState = UnitStateMachine.state[ally] as UnitState;
      if (allyState !== UnitState.Idle && allyState !== UnitState.Move) continue;

      const dx = Position.x[ally] - tx;
      const dy = Position.y[ally] - ty;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist < ALLY_ASSIST_RADIUS) {
        UnitStateMachine.targetEntity[ally] = attackerEid;
        UnitStateMachine.targetX[ally] = Position.x[attackerEid];
        UnitStateMachine.targetY[ally] = Position.y[attackerEid];
        UnitStateMachine.state[ally] = UnitState.AttackMove;
      }
    }
  }

  // Check for death
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
      spawnParticle(
        world,
        ex,
        ey,
        Math.cos(angle) * spread,
        Math.sin(angle) * spread + 2,
        30,
        PALETTE.mudLight,
        4,
      );
    }
  } else {
    for (let j = 0; j < 20; j++) {
      spawnParticle(
        world,
        ex,
        ey,
        (Math.random() - 0.5) * 4,
        (Math.random() - 0.5) * 4 + 2,
        30,
        PALETTE.clamMeat,
        4,
      );
    }
    // Splat variant particles for units
    if (!isResource) {
      for (let j = 0; j < 5; j++) {
        spawnParticle(
          world,
          ex + (Math.random() - 0.5) * 10,
          ey + (Math.random() - 0.5) * 10,
          (Math.random() - 0.5) * 2,
          Math.random() * 2 + 1,
          15,
          PALETTE.clamMeat,
          6,
        );
      }
    }
  }

  // Battlefield corpses/ruins (original lines 1828-1834)
  if (!isResource) {
    world.corpses.push({
      id: createCorpseId(),
      x: ex,
      y: ey,
      spriteId: isBuilding ? SpriteId.Rubble : SpriteId.Bones,
      life: 1800,
      maxLife: 1800,
    });
  }

  // Boss croc loot
  if (
    hasComponent(world.ecs, eid, EntityTypeTag) &&
    (EntityTypeTag.kind[eid] as EntityKind) === EntityKind.BossCroc
  ) {
    world.resources.clams += 100;
    world.floatingTexts.push({
      x: ex,
      y: ey - 30,
      text: '+100 Clams!',
      color: '#facc15',
      life: 60,
    });
  }

  // Credit kill to attacker (original lines 1836-1843)
  if (attackerEid !== undefined && hasComponent(world.ecs, attackerEid, Combat)) {
    Combat.kills[attackerEid]++;
  }

  // Kill streak tracking: player kills of enemy units (non-building, non-resource)
  if (
    !isBuilding &&
    !isResource &&
    attackerEid !== undefined &&
    hasComponent(world.ecs, attackerEid, FactionTag) &&
    FactionTag.faction[attackerEid] === Faction.Player &&
    hasComponent(world.ecs, eid, FactionTag) &&
    FactionTag.faction[eid] === Faction.Enemy
  ) {
    const STREAK_WINDOW = 300; // 5 seconds at 60fps
    if (world.frameCount - world.killStreak.lastKillFrame <= STREAK_WINDOW) {
      world.killStreak.count++;
    } else {
      world.killStreak.count = 1;
    }
    world.killStreak.lastKillFrame = world.frameCount;

    // Streak milestones
    if (world.killStreak.count === 3) {
      world.floatingTexts.push({
        x: ex,
        y: ey - 40,
        text: 'TRIPLE KILL',
        color: '#facc15',
        life: 100,
      });
      world.shakeTimer = Math.max(world.shakeTimer, 8);
    } else if (world.killStreak.count === 5) {
      world.floatingTexts.push({
        x: ex,
        y: ey - 40,
        text: 'RAMPAGE',
        color: '#ef4444',
        life: 120,
      });
      world.shakeTimer = Math.max(world.shakeTimer, 15);
    }
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
    if (Combat.attackCooldown[eid] > 0) {
      Combat.attackCooldown[eid]--;
    }
  }

  // Flash timer decay for all entities with health
  const allLiving = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  for (let i = 0; i < allLiving.length; i++) {
    const eid = allLiving[i];
    if (Health.flashTimer[eid] > 0) {
      Health.flashTimer[eid]--;
    }
  }

  // --- Passive healing (lines 1238-1246) ---
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
      if (
        state === UnitState.Idle ||
        state === UnitState.Move ||
        state === UnitState.Gathering ||
        state === UnitState.GatherMove ||
        state === UnitState.ReturnMove
      ) {
        const healAmount = world.tech.hardenedShells ? 5 : 1;
        Health.current[eid] = Math.min(Health.max[eid], Health.current[eid] + healAmount);

        // Visual feedback for healing
        if (world.tech.hardenedShells) {
          spawnParticle(
            world,
            Position.x[eid],
            Position.y[eid] - 8,
            (Math.random() - 0.5) * 0.8,
            -Math.random() * 1,
            15,
            '#86efac',
            2,
          );
        }
      }
    }
  }

  // --- Healer aura: healers heal nearest friendly within 80px every 60 frames ---
  if (world.frameCount % 60 === 0) {
    const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);

    // Build candidate and healer lists once to avoid O(n^2) inner filtering
    const healers: number[] = [];
    const candidates: number[] = [];
    for (let i = 0; i < allUnits.length; i++) {
      const eid = allUnits[i];
      if ((FactionTag.faction[eid] as Faction) !== Faction.Player) continue;
      if (Health.current[eid] <= 0) continue;
      if ((EntityTypeTag.kind[eid] as EntityKind) === EntityKind.Healer) {
        healers.push(eid);
      } else if (
        !hasComponent(world.ecs, eid, IsBuilding) &&
        !hasComponent(world.ecs, eid, IsResource) &&
        Health.current[eid] < Health.max[eid]
      ) {
        candidates.push(eid);
      }
    }

    for (let i = 0; i < healers.length; i++) {
      const hEid = healers[i];
      const hx = Position.x[hEid];
      const hy = Position.y[hEid];
      let bestEid = -1;
      let bestDistSq = 80 * 80;

      for (let j = 0; j < candidates.length; j++) {
        const tEid = candidates[j];
        const dx = Position.x[tEid] - hx;
        const dy = Position.y[tEid] - hy;
        const dSq = dx * dx + dy * dy;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestEid = tEid;
        }
      }

      if (bestEid !== -1) {
        Health.current[bestEid] = Math.min(Health.max[bestEid], Health.current[bestEid] + 2);
        spawnParticle(
          world,
          Position.x[bestEid],
          Position.y[bestEid] - 10,
          (Math.random() - 0.5) * 1,
          -Math.random() * 1.5,
          20,
          '#22c55e',
          3,
        );
      }
    }
  }

  // --- Herbalist Hut area heal: every 120 frames, heals all player units within 150px by 2 HP ---
  if (world.frameCount % 120 === 0) {
    const huts = query(world.ecs, [Position, Health, IsBuilding, EntityTypeTag, FactionTag]);
    for (let i = 0; i < huts.length; i++) {
      const hut = huts[i];
      if (EntityTypeTag.kind[hut] !== EntityKind.HerbalistHut) continue;
      if (FactionTag.faction[hut] !== Faction.Player) continue;
      if (Health.current[hut] <= 0) continue;
      if (!hasComponent(world.ecs, hut, Building) || Building.progress[hut] < 100) continue;
      // Heal nearby player units
      const hx = Position.x[hut];
      const hy = Position.y[hut];
      const nearby = world.spatialHash.query(hx, hy, 150);
      for (let j = 0; j < nearby.length; j++) {
        const uid = nearby[j];
        if (!hasComponent(world.ecs, uid, FactionTag)) continue;
        if (FactionTag.faction[uid] !== Faction.Player) continue;
        if (hasComponent(world.ecs, uid, IsBuilding)) continue;
        if (!hasComponent(world.ecs, uid, Health)) continue;
        if (Health.current[uid] <= 0 || Health.current[uid] >= Health.max[uid]) continue;
        Health.current[uid] = Math.min(Health.max[uid], Health.current[uid] + 2);
        // Green heal particle
        spawnParticle(
          world,
          Position.x[uid],
          Position.y[uid] - 8,
          (Math.random() - 0.5) * 0.8,
          -Math.random() * 1,
          15,
          '#86efac',
          2,
        );
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
