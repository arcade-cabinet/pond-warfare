/**
 * Combat System
 *
 * Ported from Entity.update() lines 1587-1625 and 1711-1725 of the original HTML game.
 *
 * Responsibilities:
 * - Tower auto-attack: towers scan for enemies and fire projectiles (lines 1587-1596)
 * - Idle auto-aggro: idle combat units aggro nearby enemies every 30 frames (lines 1598-1603)
 * - Attack-move scanning: units in atk_move state scan for enemies every 15 frames (lines 1606-1618)
 * - Attack-move resume: idle units with saved attack-move target resume moving (lines 1621-1625)
 * - Attack state: melee deals direct damage, snipers create projectiles (lines 1711-1725)
 * - Attack cooldown management
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import {
  AGGRO_RADIUS_ENEMY,
  AGGRO_RADIUS_PLAYER,
  ATTACK_COOLDOWN,
  TOWER_ATTACK_COOLDOWN,
} from '@/constants';
import {
  Building,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsResource,
  Position,
  Sprite,
  TowerAI,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { getDamageMultiplier } from '@/config/entity-defs';
import { takeDamage } from '@/ecs/systems/health';
import { spawnProjectile } from '@/ecs/systems/projectile';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

export function combatSystem(world: GameWorld): void {
  const units = query(world.ecs, [
    Position,
    Combat,
    UnitStateMachine,
    Health,
    FactionTag,
    EntityTypeTag,
  ]);
  const towers = query(world.ecs, [Position, Combat, TowerAI, Health, FactionTag, Building]);
  const allTargetable = query(world.ecs, [Position, Health, FactionTag]);

  // --- Tower auto-attack (lines 1587-1596) ---
  for (let i = 0; i < towers.length; i++) {
    const eid = towers[i];
    if (Health.current[eid] <= 0) continue;
    if (Building.progress[eid] < 100) continue;
    if (Combat.attackCooldown[eid] > 0) continue;

    const faction = FactionTag.faction[eid] as Faction;
    const range = Combat.attackRange[eid];
    const ex = Position.x[eid];
    const ey = Position.y[eid];

    let closest = -1;
    let minDist = range;
    for (let j = 0; j < allTargetable.length; j++) {
      const t = allTargetable[j];
      if (FactionTag.faction[t] === faction) continue;
      if (Health.current[t] <= 0) continue;
      if (hasComponent(world.ecs, t, IsResource)) continue;

      const dx = Position.x[t] - ex;
      const dy = Position.y[t] - ey;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) {
        minDist = d;
        closest = t;
      }
    }

    if (closest !== -1) {
      audio.shoot();
      spawnProjectile(
        world,
        ex,
        ey - 20,
        Position.x[closest],
        Position.y[closest],
        closest,
        Combat.damage[eid],
        eid,
      );
      Combat.attackCooldown[eid] = TOWER_ATTACK_COOLDOWN;
    }
  }

  // --- Unit combat behaviors ---
  for (let i = 0; i < units.length; i++) {
    const eid = units[i];
    if (Health.current[eid] <= 0) continue;

    const state = UnitStateMachine.state[eid] as UnitState;
    const faction = FactionTag.faction[eid] as Faction;
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    const ex = Position.x[eid];
    const ey = Position.y[eid];
    const dmg = Combat.damage[eid];

    // --- Healer auto-follow: idle healers seek nearest wounded ally within 150px ---
    if (kind === EntityKind.Healer && state === UnitState.Idle && world.frameCount % 30 === 0) {
      let bestAlly = -1;
      let bestDistSq = 150 * 150;

      for (let j = 0; j < allTargetable.length; j++) {
        const t = allTargetable[j];
        if (t === eid) continue;
        if (FactionTag.faction[t] !== faction) continue;
        if (hasComponent(world.ecs, t, IsResource)) continue;
        if (Health.current[t] <= 0) continue;
        if (Health.current[t] >= Health.max[t]) continue;

        const dx = Position.x[t] - ex;
        const dy = Position.y[t] - ey;
        const dSq = dx * dx + dy * dy;
        if (dSq < bestDistSq) {
          bestDistSq = dSq;
          bestAlly = t;
        }
      }

      if (bestAlly !== -1) {
        UnitStateMachine.targetEntity[eid] = bestAlly;
        UnitStateMachine.targetX[eid] = Position.x[bestAlly];
        UnitStateMachine.targetY[eid] = Position.y[bestAlly];
        UnitStateMachine.state[eid] = UnitState.Move;
      }
      continue;
    }

    // --- Idle auto-aggro (lines 1598-1603) ---
    if (state === UnitState.Idle && dmg > 0 && world.frameCount % 30 === 0) {
      const aggroRad = faction === Faction.Enemy ? AGGRO_RADIUS_ENEMY : AGGRO_RADIUS_PLAYER;

      let closestAggro = -1;
      let closestAggroDist = aggroRad;

      for (let j = 0; j < allTargetable.length; j++) {
        const t = allTargetable[j];
        if (FactionTag.faction[t] === faction) continue;
        if (FactionTag.faction[t] === Faction.Neutral) continue;
        if (Health.current[t] <= 0) continue;
        if (hasComponent(world.ecs, t, IsResource)) continue;

        const dx = Position.x[t] - ex;
        const dy = Position.y[t] - ey;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < closestAggroDist) {
          closestAggroDist = d;
          closestAggro = t;
        }
      }

      if (closestAggro !== -1) {
        // cmdAtk(closeTarget) -> set a_move to closest target
        UnitStateMachine.targetEntity[eid] = closestAggro;
        UnitStateMachine.targetX[eid] = Position.x[closestAggro];
        UnitStateMachine.targetY[eid] = Position.y[closestAggro];
        UnitStateMachine.state[eid] = UnitState.AttackMove;
      }
      continue; // Skip further processing this frame since we just changed state
    }

    // --- Attack-move scanning (lines 1606-1618) ---
    if (state === UnitState.AttackMovePatrol && world.frameCount % 15 === 0) {
      const atkRange = Combat.attackRange[eid];
      const scanRad = atkRange > 60 ? atkRange : 150;

      let closeTarget = -1;
      let minDist = scanRad;

      for (let j = 0; j < allTargetable.length; j++) {
        const t = allTargetable[j];
        if (FactionTag.faction[t] === faction) continue;
        if (FactionTag.faction[t] === Faction.Neutral) continue;
        if (Health.current[t] <= 0) continue;
        if (hasComponent(world.ecs, t, IsResource)) continue;

        const dx = Position.x[t] - ex;
        const dy = Position.y[t] - ey;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minDist) {
          minDist = d;
          closeTarget = t;
        }
      }

      if (closeTarget !== -1) {
        // Save current attack-move destination so we can resume later
        UnitStateMachine.attackMoveTargetX[eid] = UnitStateMachine.targetX[eid];
        UnitStateMachine.attackMoveTargetY[eid] = UnitStateMachine.targetY[eid];
        UnitStateMachine.hasAttackMoveTarget[eid] = 1;

        // cmdAtk
        UnitStateMachine.targetEntity[eid] = closeTarget;
        UnitStateMachine.targetX[eid] = Position.x[closeTarget];
        UnitStateMachine.targetY[eid] = Position.y[closeTarget];
        UnitStateMachine.state[eid] = UnitState.AttackMove;
      }
      continue;
    }

    // --- Attack-move resume (lines 1621-1625) ---
    if (state === UnitState.Idle && UnitStateMachine.hasAttackMoveTarget[eid]) {
      // Resume attack-move patrol to saved destination
      UnitStateMachine.targetX[eid] = UnitStateMachine.attackMoveTargetX[eid];
      UnitStateMachine.targetY[eid] = UnitStateMachine.attackMoveTargetY[eid];
      UnitStateMachine.hasAttackMoveTarget[eid] = 0;
      UnitStateMachine.state[eid] = UnitState.AttackMovePatrol;
      UnitStateMachine.targetEntity[eid] = -1;
      continue;
    }

    // --- Attack state (lines 1711-1725) ---
    if (state === UnitState.Attacking) {
      const tEnt = UnitStateMachine.targetEntity[eid];
      if (tEnt === -1 || !hasComponent(world.ecs, tEnt, Health) || Health.current[tEnt] <= 0) {
        UnitStateMachine.state[eid] = UnitState.Idle;
        continue;
      }

      const dx = Position.x[tEnt] - ex;
      const dy = Position.y[tEnt] - ey;
      Sprite.facingLeft[eid] = dx < 0 ? 1 : 0;

      const dist = Math.sqrt(dx * dx + dy * dy);
      const atkRange = Combat.attackRange[eid];

      if (dist <= atkRange) {
        // In range - attack if cooldown ready
        if (Combat.attackCooldown[eid] <= 0) {
          if (kind === EntityKind.Sniper) {
            const targetKind = EntityTypeTag.kind[tEnt] as EntityKind;
            const mult = getDamageMultiplier(kind, targetKind);
            const sniperDmg = Math.round(dmg * mult);
            audio.shoot();
            spawnProjectile(
              world,
              ex,
              ey - 10,
              Position.x[tEnt],
              Position.y[tEnt],
              tEnt,
              sniperDmg,
              eid,
              mult,
            );
          } else if (kind === EntityKind.BossCroc) {
            // Boss Croc: enrage below 30% HP doubles damage, AoE stomp hits all nearby
            const enraged = Health.current[eid] < Health.max[eid] * 0.3 && Health.max[eid] > 0;
            const bossDmg = enraged ? dmg * 2 : dmg;

            // AoE stomp: damage all enemies within attack range
            for (let j = 0; j < allTargetable.length; j++) {
              const t = allTargetable[j];
              if (FactionTag.faction[t] === faction) continue;
              if (Health.current[t] <= 0) continue;
              if (hasComponent(world.ecs, t, IsResource)) continue;
              const adx = Position.x[t] - ex;
              const ady = Position.y[t] - ey;
              if (Math.sqrt(adx * adx + ady * ady) <= atkRange + 20) {
                takeDamage(world, t, bossDmg, eid);
              }
            }

            // Screen shake on boss stomp
            world.shakeTimer = Math.max(world.shakeTimer, enraged ? 8 : 4);

            // Enrage speed boost (applied once when crossing threshold)
            if (enraged && Velocity.speed[eid] < 2.0) {
              Velocity.speed[eid] = 2.0;
              world.floatingTexts.push({
                x: ex,
                y: ey - 30,
                text: 'ENRAGED!',
                color: '#ef4444',
                life: 90,
              });
            }
          } else {
            // Melee: direct damage with counter multiplier
            const targetKind = EntityTypeTag.kind[tEnt] as EntityKind;
            const mult = getDamageMultiplier(kind, targetKind);
            const meleeDmg = Math.round(dmg * mult);
            takeDamage(world, tEnt, meleeDmg, eid, mult);
          }
          Combat.attackCooldown[eid] = ATTACK_COOLDOWN;
        }
      } else {
        // Out of range - chase target
        UnitStateMachine.targetX[eid] = Position.x[tEnt];
        UnitStateMachine.targetY[eid] = Position.y[tEnt];
        UnitStateMachine.state[eid] = UnitState.AttackMove;
      }
    }
  }
}
