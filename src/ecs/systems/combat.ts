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
import { showBark } from '@/config/barks';
import { getDamageMultiplier, SIEGE_BUILDING_MULTIPLIER } from '@/config/entity-defs';
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
  IsBuilding,
  IsResource,
  Position,
  Sprite,
  TowerAI,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { takeDamage } from '@/ecs/systems/health';
import { spawnProjectile } from '@/ecs/systems/projectile';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

/**
 * Commander aura: every 60 frames, find player Commander entities and
 * buff all player combat units within 150px with +10% damage.
 */
function commanderAura(world: GameWorld): void {
  if (world.frameCount % 60 !== 0) return;

  // Clear previous buff sets; we rebuild each tick
  world.commanderDamageBuff.clear();
  world.commanderSpeedBuff.clear();

  const mods = world.commanderModifiers;
  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, Combat]);

  // Find living player Commanders
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if ((EntityTypeTag.kind[eid] as EntityKind) !== EntityKind.Commander) continue;

    const cx = Position.x[eid];
    const cy = Position.y[eid];
    const auraRadius = 150;

    // Query all nearby entities for both unit and building buffs
    const candidates = world.spatialHash ? world.spatialHash.query(cx, cy, auraRadius) : allUnits;
    for (let j = 0; j < candidates.length; j++) {
      const t = candidates[j];
      if (t === eid) continue;
      if (!hasComponent(world.ecs, t, FactionTag) || FactionTag.faction[t] !== Faction.Player)
        continue;
      if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;

      const dx = Position.x[t] - cx;
      const dy = Position.y[t] - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      if (dist > auraRadius) continue;

      const isBuil = hasComponent(world.ecs, t, IsBuilding);
      const isRes = hasComponent(world.ecs, t, IsResource);

      // Building HP bonus: apply once per building entering the aura
      if (isBuil && mods.auraHpBonus > 0 && !world.commanderHpBuffApplied.has(t)) {
        Health.max[t] += mods.auraHpBonus;
        Health.current[t] += mods.auraHpBonus;
        world.commanderHpBuffApplied.add(t);
      }

      // Unit buffs (non-building, non-resource)
      if (!isBuil && !isRes && hasComponent(world.ecs, t, Combat)) {
        world.commanderDamageBuff.add(t);

        // Speed buff: mark for movement system
        if (mods.auraSpeedBonus > 0) {
          world.commanderSpeedBuff.add(t);
        }
      }
    }
  }
}

/**
 * War Drums aura: every 60 frames, find player Armory buildings and
 * buff all player combat units within 200px with +15% damage.
 */
function warDrumsAura(world: GameWorld): void {
  if (!world.tech.warDrums) return;
  if (world.frameCount % 60 !== 0) return;

  world.warDrumsBuff.clear();

  const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, Combat]);

  // Find living player Armories
  for (let i = 0; i < allUnits.length; i++) {
    const eid = allUnits[i];
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (Health.current[eid] <= 0) continue;
    if ((EntityTypeTag.kind[eid] as EntityKind) !== EntityKind.Armory) continue;
    if (!hasComponent(world.ecs, eid, Building) || Building.progress[eid] < 100) continue;

    const ax = Position.x[eid];
    const ay = Position.y[eid];
    const auraRadius = 200;

    const candidates = world.spatialHash ? world.spatialHash.query(ax, ay, auraRadius) : allUnits;
    for (let j = 0; j < candidates.length; j++) {
      const t = candidates[j];
      if (t === eid) continue;
      if (!hasComponent(world.ecs, t, FactionTag) || FactionTag.faction[t] !== Faction.Player)
        continue;
      if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;
      if (!hasComponent(world.ecs, t, Combat)) continue;
      if (hasComponent(world.ecs, t, IsBuilding) || hasComponent(world.ecs, t, IsResource))
        continue;

      const dx = Position.x[t] - ax;
      const dy = Position.y[t] - ay;
      if (Math.sqrt(dx * dx + dy * dy) <= auraRadius) {
        world.warDrumsBuff.add(t);
      }
    }
  }
}

export function combatSystem(world: GameWorld): void {
  // Process Commander aura
  commanderAura(world);
  // Process War Drums aura
  warDrumsAura(world);
  const units = query(world.ecs, [
    Position,
    Combat,
    UnitStateMachine,
    Health,
    FactionTag,
    EntityTypeTag,
  ]);
  const towers = query(world.ecs, [Position, Combat, TowerAI, Health, FactionTag, Building]);
  const hasSpatial = world.spatialHash !== undefined;
  // Fallback: only build full list when spatial hash is unavailable
  const allTargetable = hasSpatial ? [] : query(world.ecs, [Position, Health, FactionTag]);

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
    const candidates = hasSpatial ? world.spatialHash.query(ex, ey, range) : allTargetable;
    for (let j = 0; j < candidates.length; j++) {
      const t = candidates[j];
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
      // Commander passive: towers attack faster
      const towerSpeedBonus =
        faction === Faction.Player ? world.commanderModifiers.passiveTowerAttackSpeed : 0;
      Combat.attackCooldown[eid] =
        towerSpeedBonus > 0
          ? Math.round(TOWER_ATTACK_COOLDOWN * (1 - towerSpeedBonus))
          : TOWER_ATTACK_COOLDOWN;
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

      const healCandidates = hasSpatial ? world.spatialHash.query(ex, ey, 150) : allTargetable;
      for (let j = 0; j < healCandidates.length; j++) {
        const t = healCandidates[j];
        if (t === eid) continue;
        if (!hasComponent(world.ecs, t, FactionTag) || FactionTag.faction[t] !== faction) continue;
        if (hasComponent(world.ecs, t, IsResource)) continue;
        if (hasComponent(world.ecs, t, IsBuilding)) continue;
        if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;
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
      let aggroRad = faction === Faction.Enemy ? AGGRO_RADIUS_ENEMY : AGGRO_RADIUS_PLAYER;
      // Camouflage: enemies detect player units 33% less far
      if (faction === Faction.Enemy && world.tech.camouflage) {
        aggroRad = Math.round(aggroRad * 0.67);
      }

      let closestAggro = -1;
      let closestAggroDist = aggroRad;

      const aggroCandidates = hasSpatial
        ? world.spatialHash.query(ex, ey, aggroRad)
        : allTargetable;
      for (let j = 0; j < aggroCandidates.length; j++) {
        const t = aggroCandidates[j];
        if (!hasComponent(world.ecs, t, FactionTag)) continue;
        if (FactionTag.faction[t] === faction) continue;
        if (FactionTag.faction[t] === Faction.Neutral) continue;
        if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;
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

      const scanCandidates = hasSpatial ? world.spatialHash.query(ex, ey, scanRad) : allTargetable;
      for (let j = 0; j < scanCandidates.length; j++) {
        const t = scanCandidates[j];
        if (!hasComponent(world.ecs, t, FactionTag)) continue;
        if (FactionTag.faction[t] === faction) continue;
        if (FactionTag.faction[t] === Faction.Neutral) continue;
        if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;
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
            let mult = getDamageMultiplier(kind, targetKind);
            // Piercing Shot: snipers ignore 50% of damage reduction (counter multiplier lifted halfway to 1.0)
            if (world.tech.piercingShot && mult < 1.0) {
              mult = mult + (1.0 - mult) * 0.5;
            }
            let sniperDmg = Math.round(dmg * mult);
            // War Drums aura: +15% damage
            if (world.warDrumsBuff.has(eid)) {
              sniperDmg = Math.round(sniperDmg * 1.15);
            }
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
          } else if (kind === EntityKind.Catapult) {
            // Catapult: ranged AoE projectile
            audio.shoot();
            spawnProjectile(world, ex, ey - 10, Position.x[tEnt], Position.y[tEnt], tEnt, dmg, eid);
            // AoE: also damage enemies near the target
            const tx = Position.x[tEnt];
            const ty = Position.y[tEnt];
            const aoeRadius = 60;
            const aoeCandidates = hasSpatial
              ? world.spatialHash.query(tx, ty, aoeRadius)
              : allTargetable;
            for (let j = 0; j < aoeCandidates.length; j++) {
              const t = aoeCandidates[j];
              if (t === tEnt) continue;
              if (!hasComponent(world.ecs, t, FactionTag) || FactionTag.faction[t] === faction)
                continue;
              if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;
              if (hasComponent(world.ecs, t, IsResource)) continue;
              const adx = Position.x[t] - tx;
              const ady = Position.y[t] - ty;
              if (Math.sqrt(adx * adx + ady * ady) <= aoeRadius) {
                takeDamage(world, t, Math.round(dmg * 0.5), eid);
              }
            }
            world.shakeTimer = Math.max(world.shakeTimer, 3);
          } else if (kind === EntityKind.BossCroc) {
            // Boss Croc: enrage below 30% HP doubles damage, AoE stomp hits all nearby
            const enraged = Health.current[eid] < Health.max[eid] * 0.3 && Health.max[eid] > 0;
            const bossDmg = enraged ? dmg * 2 : dmg;

            // AoE stomp: damage all enemies within attack range
            const stompRadius = atkRange + 20;
            const stompCandidates = hasSpatial
              ? world.spatialHash.query(ex, ey, stompRadius)
              : allTargetable;
            for (let j = 0; j < stompCandidates.length; j++) {
              const t = stompCandidates[j];
              if (!hasComponent(world.ecs, t, FactionTag) || FactionTag.faction[t] === faction)
                continue;
              if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;
              if (hasComponent(world.ecs, t, IsResource)) continue;
              const adx = Position.x[t] - ex;
              const ady = Position.y[t] - ey;
              if (Math.sqrt(adx * adx + ady * ady) <= stompRadius) {
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
          } else if (kind === EntityKind.SiegeTurtle) {
            // Siege Turtle: 3x damage to buildings, normal to units
            const targetKind = EntityTypeTag.kind[tEnt] as EntityKind;
            const mult = getDamageMultiplier(kind, targetKind);
            const isTargetBuilding = hasComponent(world.ecs, tEnt, IsBuilding);
            const siegeMult = isTargetBuilding ? SIEGE_BUILDING_MULTIPLIER : 1.0;
            const siegeDmg = Math.round(dmg * mult * siegeMult);
            takeDamage(world, tEnt, siegeDmg, eid, mult * siegeMult);
            if (isTargetBuilding) {
              world.shakeTimer = Math.max(world.shakeTimer, 3);
            }
          } else if (kind === EntityKind.Trapper) {
            // Trapper: apply speed debuff (50% slow for 180 frames) instead of damage
            if (hasComponent(world.ecs, tEnt, Velocity)) {
              Velocity.speedDebuffTimer[tEnt] = 180;
            }
            // Visual feedback
            world.floatingTexts.push({
              x: Position.x[tEnt],
              y: Position.y[tEnt] - 20,
              text: 'TRAPPED!',
              color: '#f59e0b',
              life: 60,
            });
          } else {
            // Melee: direct damage with counter multiplier
            const targetKind = EntityTypeTag.kind[tEnt] as EntityKind;
            const mult = getDamageMultiplier(kind, targetKind);
            let meleeDmg = Math.round(dmg * mult);

            // Alpha Predator aura: +20% damage if buffed
            if (world.alphaDamageBuff.has(eid)) {
              meleeDmg = Math.round(meleeDmg * 1.2);
            }

            // Commander aura: damage bonus for player units near Commander
            if (
              world.commanderDamageBuff.has(eid) &&
              world.commanderModifiers.auraDamageBonus > 0
            ) {
              meleeDmg = Math.round(meleeDmg * (1 + world.commanderModifiers.auraDamageBonus));
            }

            // War Drums aura: +15% damage for melee
            if (world.warDrumsBuff.has(eid)) {
              meleeDmg = Math.round(meleeDmg * 1.15);
            }

            takeDamage(world, tEnt, meleeDmg, eid, mult);

            // Venom Snake: apply poison (2 damage/sec for 5 seconds = 5 ticks)
            if (kind === EntityKind.VenomSnake) {
              world.poisonTimers.set(tEnt, 5);
            }

            // Venom Coating tech: all player melee attacks apply 1 dmg/sec poison for 3 seconds
            if (
              faction === Faction.Player &&
              world.tech.venomCoating &&
              kind !== EntityKind.VenomSnake
            ) {
              // Only apply if not already poisoned by VenomSnake (which is stronger)
              if (!world.poisonTimers.has(tEnt)) {
                world.venomCoatingTimers.set(tEnt, 3);
              }
            }
          }
          // Attack cooldown: base modified by battleRoar and siegeEngineering
          let cooldown = ATTACK_COOLDOWN;
          if (faction === Faction.Player && world.tech.battleRoar) {
            cooldown = Math.round(cooldown * 0.9);
          }
          // Siege Engineering: catapults fire 25% faster
          if (kind === EntityKind.Catapult && world.tech.siegeEngineering) {
            cooldown = Math.round(cooldown * 0.75);
          }
          Combat.attackCooldown[eid] = cooldown;

          // Combat bark: ~10% chance on attack (don't spam)
          if (faction === Faction.Player && Math.random() < 0.1) {
            showBark(world, eid, ex, ey, kind, 'combat', { color: '#ef4444' });
          }
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
