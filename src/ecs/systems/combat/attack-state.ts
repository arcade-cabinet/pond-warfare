/**
 * Attack State Processing
 *
 * Handles the Attacking state for all unit types: melee direct damage,
 * sniper projectiles, catapult AoE, boss croc stomp, siege turtle,
 * trapper slow, plus damage modifiers from auras and tech.
 */

import { hasComponent } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { showBark } from '@/config/barks';
import { getDamageMultiplier, SIEGE_BUILDING_MULTIPLIER } from '@/config/entity-defs';
import { ATTACK_COOLDOWN } from '@/constants';
import {
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Sprite,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { takeDamage } from '@/ecs/systems/health';
import { spawnProjectile } from '@/ecs/systems/projectile';
import type { GameWorld } from '@/ecs/world';
import { TerrainType } from '@/terrain/terrain-grid';
import { EntityKind, Faction, UnitState } from '@/types';
import { executeBossCrocAttack, executeMeleeAttack } from './melee-attacks';

/**
 * Process one unit in the Attacking state. Returns true if the unit was
 * handled (so the caller can `continue` the outer loop).
 */
export function processAttackState(
  world: GameWorld,
  eid: number,
  ex: number,
  ey: number,
  dmg: number,
  kind: EntityKind,
  faction: Faction,
  hasSpatial: boolean,
  allTargetable: ArrayLike<number>,
): boolean {
  const tEnt = UnitStateMachine.targetEntity[eid];
  if (tEnt === -1 || !hasComponent(world.ecs, tEnt, Health) || Health.current[tEnt] <= 0) {
    UnitStateMachine.state[eid] = UnitState.Idle;
    return true;
  }

  const dx = Position.x[tEnt] - ex;
  const dy = Position.y[tEnt] - ey;
  Sprite.facingLeft[eid] = dx < 0 ? 1 : 0;

  const dist = Math.sqrt(dx * dx + dy * dy);
  let atkRange = Combat.attackRange[eid];

  // High ground bonus: +25% range for ranged units (attackRange > 50)
  if (atkRange > 50) {
    const terrain = world.terrainGrid.getAt(ex, ey);
    if (terrain === TerrainType.HighGround) {
      atkRange = Math.round(atkRange * 1.25);
    }
  }

  if (dist <= atkRange) {
    if (Combat.attackCooldown[eid] <= 0) {
      executeAttack(world, eid, tEnt, ex, ey, dmg, kind, faction, hasSpatial, allTargetable);
    }
  } else {
    // Out of range - chase target
    UnitStateMachine.targetX[eid] = Position.x[tEnt];
    UnitStateMachine.targetY[eid] = Position.y[tEnt];
    UnitStateMachine.state[eid] = UnitState.AttackMove;
  }

  return true;
}

function executeAttack(
  world: GameWorld,
  eid: number,
  tEnt: number,
  ex: number,
  ey: number,
  dmg: number,
  kind: EntityKind,
  faction: Faction,
  hasSpatial: boolean,
  allTargetable: ArrayLike<number>,
): void {
  if (kind === EntityKind.Sniper) {
    executeSniperAttack(world, eid, tEnt, ex, ey, dmg, kind);
  } else if (kind === EntityKind.Catapult) {
    executeCatapultAttack(world, eid, tEnt, ex, ey, dmg, faction, hasSpatial, allTargetable);
  } else if (kind === EntityKind.BossCroc) {
    executeBossCrocAttack(world, eid, ex, ey, dmg, faction, hasSpatial, allTargetable);
  } else if (kind === EntityKind.SiegeTurtle) {
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
    if (hasComponent(world.ecs, tEnt, Velocity)) {
      const baseDuration = 180;
      const trapMult =
        faction === Faction.Player ? world.commanderModifiers.passiveTrapDurationMult : 1;
      Velocity.speedDebuffTimer[tEnt] = Math.round(baseDuration * trapMult);
    }
    world.floatingTexts.push({
      x: Position.x[tEnt],
      y: Position.y[tEnt] - 20,
      text: 'TRAPPED!',
      color: '#f59e0b',
      life: 60,
    });
  } else {
    executeMeleeAttack(world, eid, tEnt, dmg, kind, faction);
  }

  // Attack cooldown
  let cooldown = ATTACK_COOLDOWN;
  if (faction === Faction.Player && world.tech.battleRoar) {
    cooldown = Math.round(cooldown * 0.9);
  }
  if (kind === EntityKind.Catapult && world.tech.siegeWorks) {
    cooldown = Math.round(cooldown * 0.75);
  }
  Combat.attackCooldown[eid] = cooldown;

  // Combat bark
  if (faction === Faction.Player && Math.random() < 0.1) {
    showBark(world, eid, ex, ey, kind, 'combat', { color: '#ef4444' });
  }
}

function executeSniperAttack(
  world: GameWorld,
  eid: number,
  tEnt: number,
  ex: number,
  ey: number,
  dmg: number,
  kind: EntityKind,
): void {
  const targetKind = EntityTypeTag.kind[tEnt] as EntityKind;
  let mult = getDamageMultiplier(kind, targetKind);
  if (world.tech.piercingShot && mult < 1.0) {
    mult = mult + (1.0 - mult) * 0.5;
  }
  let sniperDmg = Math.round(dmg * mult);
  if (world.commanderEnemyDebuff.has(eid)) {
    sniperDmg = Math.round(sniperDmg * (1 - world.commanderModifiers.auraEnemyDamageReduction));
  }
  if (world.warDrumsBuff.has(eid)) {
    sniperDmg = Math.round(sniperDmg * 1.15);
  }
  audio.sniperShoot(ex);
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
    EntityKind.Sniper,
  );
}

function executeCatapultAttack(
  world: GameWorld,
  eid: number,
  tEnt: number,
  ex: number,
  ey: number,
  dmg: number,
  faction: Faction,
  hasSpatial: boolean,
  allTargetable: ArrayLike<number>,
): void {
  audio.catapultShoot(ex);
  spawnProjectile(
    world,
    ex,
    ey - 10,
    Position.x[tEnt],
    Position.y[tEnt],
    tEnt,
    dmg,
    eid,
    1.0,
    EntityKind.Catapult,
  );
  const tx = Position.x[tEnt];
  const ty = Position.y[tEnt];
  const aoeRadius = 60;
  const aoeCandidates = hasSpatial ? world.spatialHash.query(tx, ty, aoeRadius) : allTargetable;
  for (let j = 0; j < aoeCandidates.length; j++) {
    const t = aoeCandidates[j];
    if (t === tEnt) continue;
    if (!hasComponent(world.ecs, t, FactionTag) || FactionTag.faction[t] === faction) continue;
    if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;
    if (hasComponent(world.ecs, t, IsResource)) continue;
    const adx = Position.x[t] - tx;
    const ady = Position.y[t] - ty;
    if (Math.sqrt(adx * adx + ady * ady) <= aoeRadius) {
      takeDamage(world, t, Math.round(dmg * 0.5), eid);
    }
  }
  world.shakeTimer = Math.max(world.shakeTimer, 3);
}
