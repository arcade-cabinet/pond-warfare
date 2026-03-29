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
} from '@/ecs/components';
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
  // Original: if (this.type === 'tower' && this.progress >= 100 && this.atkCD <= 0)
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

    // Original: let targets = GAME.entities.filter(e => e.faction !== this.faction && e.hp > 0 && !e.isResource);
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
      // Original: GAME.projectiles.push(new Projectile(this.x, this.y-20, closest.x, closest.y, closest, this.dmg, this));
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

    // --- Idle auto-aggro (lines 1598-1603) ---
    // Original: if (this.state === 'idle' && this.dmg && !this.isBuilding && GAME.frameCount % 30 === 0)
    if (state === UnitState.Idle && dmg > 0 && world.frameCount % 30 === 0) {
      const aggroRad = faction === Faction.Enemy ? AGGRO_RADIUS_ENEMY : AGGRO_RADIUS_PLAYER;

      for (let j = 0; j < allTargetable.length; j++) {
        const t = allTargetable[j];
        if (FactionTag.faction[t] === faction) continue;
        if (FactionTag.faction[t] === Faction.Neutral) continue;
        if (Health.current[t] <= 0) continue;
        if (hasComponent(world.ecs, t, IsResource)) continue;

        const dx = Position.x[t] - ex;
        const dy = Position.y[t] - ey;
        if (Math.sqrt(dx * dx + dy * dy) < aggroRad) {
          // cmdAtk(closeTarget) -> set a_move to target
          UnitStateMachine.targetEntity[eid] = t;
          UnitStateMachine.targetX[eid] = Position.x[t];
          UnitStateMachine.targetY[eid] = Position.y[t];
          UnitStateMachine.state[eid] = UnitState.AttackMove;
          break;
        }
      }
      continue; // Skip further processing this frame since we just changed state
    }

    // --- Attack-move scanning (lines 1606-1618) ---
    // Original: if (this.state === 'atk_move' && this.tPos && GAME.frameCount % 15 === 0)
    if (state === UnitState.AttackMovePatrol && world.frameCount % 15 === 0) {
      // Original: let scanRad = this.atkRange > 60 ? this.atkRange : 150;
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
        // Original: this.attackMoveTarget = this.tPos; this.cmdAtk(closeTarget);
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
    // Original: if (this.state === 'idle' && this.attackMoveTarget)
    if (state === UnitState.Idle && UnitStateMachine.hasAttackMoveTarget[eid]) {
      // Resume attack-move patrol to saved destination
      // Original: this.cmdAttackMove(tp.x, tp.y)
      UnitStateMachine.targetX[eid] = UnitStateMachine.attackMoveTargetX[eid];
      UnitStateMachine.targetY[eid] = UnitStateMachine.attackMoveTargetY[eid];
      UnitStateMachine.hasAttackMoveTarget[eid] = 0;
      UnitStateMachine.state[eid] = UnitState.AttackMovePatrol;
      UnitStateMachine.targetEntity[eid] = 0;
      continue;
    }

    // --- Attack state (lines 1711-1725) ---
    // Original: if (this.state === 'atk')
    if (state === UnitState.Attacking) {
      const tEnt = UnitStateMachine.targetEntity[eid];

      // Original: if (!this.tEnt || this.tEnt.hp <= 0) { this.state = 'idle'; return; }
      if (!tEnt || !hasComponent(world.ecs, tEnt, Health) || Health.current[tEnt] <= 0) {
        UnitStateMachine.state[eid] = UnitState.Idle;
        continue;
      }

      const dx = Position.x[tEnt] - ex;
      const dy = Position.y[tEnt] - ey;
      // Original: this.facingLeft = dx < 0;
      Sprite.facingLeft[eid] = dx < 0 ? 1 : 0;

      const dist = Math.sqrt(dx * dx + dy * dy);
      const atkRange = Combat.attackRange[eid];

      if (dist <= atkRange) {
        // In range - attack if cooldown ready
        if (Combat.attackCooldown[eid] <= 0) {
          if (kind === EntityKind.Sniper) {
            // Original: AudioSys.sfx.shoot(); GAME.projectiles.push(new Projectile(...));
            audio.shoot();
            spawnProjectile(world, ex, ey - 10, Position.x[tEnt], Position.y[tEnt], tEnt, dmg, eid);
          } else {
            // Melee: direct damage
            // Original: this.tEnt.takeDamage(this.dmg, this);
            takeDamage(world, tEnt, dmg, eid);
          }
          Combat.attackCooldown[eid] = ATTACK_COOLDOWN;
        }
      } else {
        // Out of range - chase target
        // Original: this.tPos={x:this.tEnt.x,y:this.tEnt.y}; this.state='a_move';
        UnitStateMachine.targetX[eid] = Position.x[tEnt];
        UnitStateMachine.targetY[eid] = Position.y[tEnt];
        UnitStateMachine.state[eid] = UnitState.AttackMove;
      }
    }
  }
}
