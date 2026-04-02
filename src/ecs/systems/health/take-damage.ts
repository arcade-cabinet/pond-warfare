/**
 * Take Damage Utility
 *
 * Apply damage to an entity with flash timer, particles, floating text,
 * retaliation, ally assist, and low-HP bark.
 * Direct port of Entity.takeDamage() (lines 1550-1571).
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { shouldLowHpBark, showBark } from '@/config/barks';
import { ALLY_ASSIST_RADIUS, PALETTE } from '@/constants';
import {
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  Sprite,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { triggerHitRecoil } from '@/rendering/animations';
import { checkAttackAlert } from '@/systems/attack-alerts';
import { EntityKind, Faction, UnitState } from '@/types';
import { reduceVisualNoise } from '@/ui/store';
import { spawnParticle } from '@/utils/particles';
import { processDeath } from './death';

export function takeDamage(
  world: GameWorld,
  targetEid: number,
  amount: number,
  attackerEid: number,
  multiplier: number = 1.0,
): void {
  if (!hasComponent(world.ecs, targetEid, Health)) return;
  if (Health.current[targetEid] <= 0) return;

  const effectiveAmount = Math.max(0, Math.round(amount * multiplier));
  if (effectiveAmount === 0) return;

  Health.current[targetEid] -= effectiveAmount;
  audio.hit();

  Health.flashTimer[targetEid] = 8;

  // Recoil: briefly push target away from attacker
  if (
    hasComponent(world.ecs, targetEid, Sprite) &&
    hasComponent(world.ecs, attackerEid, Position) &&
    !hasComponent(world.ecs, targetEid, IsBuilding)
  ) {
    const ax = Position.x[attackerEid];
    const ay = Position.y[attackerEid];
    triggerHitRecoil(targetEid, ax, ay, Position.x[targetEid], Position.y[targetEid]);
  }

  // Check if this warrants an under-attack alert
  checkAttackAlert(world, targetEid);

  // Track combat zone for minimap (only cross-faction combat, throttled)
  if (
    hasComponent(world.ecs, targetEid, FactionTag) &&
    hasComponent(world.ecs, attackerEid, FactionTag) &&
    FactionTag.faction[targetEid] !== FactionTag.faction[attackerEid]
  ) {
    const cx = Position.x[targetEid];
    const cy = Position.y[targetEid];
    // Merge with nearby existing zone or create new one
    let merged = false;
    for (const z of world.combatZones) {
      const dx = z.x - cx;
      const dy = z.y - cy;
      if (dx * dx + dy * dy < 100 * 100) {
        z.life = 120;
        merged = true;
        break;
      }
    }
    if (!merged && world.combatZones.length < 20) {
      world.combatZones.push({ x: cx, y: cy, life: 120 });
    }
  }

  const tx = Position.x[targetEid];
  const ty = Position.y[targetEid];
  const isBuilding = hasComponent(world.ecs, targetEid, IsBuilding);

  // Damage particles and floating text
  if (!reduceVisualNoise.value) {
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

    const spriteH = hasComponent(world.ecs, targetEid, Sprite) ? Sprite.height[targetEid] : 32;
    const dmgColor = multiplier > 1.0 ? '#f97316' : multiplier < 1.0 ? '#9ca3af' : '#ef4444';
    world.floatingTexts.push({
      x: tx + (Math.random() * 10 - 5),
      y: ty - spriteH / 2 - 5,
      text: `-${effectiveAmount}`,
      color: dmgColor,
      life: 40,
    });
  }

  // Retaliation and ally assist
  if (Health.current[targetEid] > 0 && attackerEid !== undefined) {
    processRetaliation(world, targetEid, attackerEid, tx, ty, isBuilding);
  }

  // Low HP bark
  if (
    Health.current[targetEid] > 0 &&
    Health.max[targetEid] > 0 &&
    Health.current[targetEid] < Health.max[targetEid] * 0.3 &&
    hasComponent(world.ecs, targetEid, EntityTypeTag) &&
    hasComponent(world.ecs, targetEid, FactionTag) &&
    FactionTag.faction[targetEid] === Faction.Player &&
    shouldLowHpBark(targetEid)
  ) {
    const lhKind = EntityTypeTag.kind[targetEid] as EntityKind;
    showBark(world, targetEid, tx, ty, lhKind, 'low_hp', { color: '#ef4444', force: true });
  }

  if (Health.current[targetEid] <= 0) {
    processDeath(world, targetEid, attackerEid);
  }
}

function processRetaliation(
  world: GameWorld,
  targetEid: number,
  attackerEid: number,
  tx: number,
  ty: number,
  isBuilding: boolean,
): void {
  const targetFaction = hasComponent(world.ecs, targetEid, FactionTag)
    ? (FactionTag.faction[targetEid] as Faction)
    : Faction.Neutral;
  const attackerFaction = hasComponent(world.ecs, attackerEid, FactionTag)
    ? (FactionTag.faction[attackerEid] as Faction)
    : Faction.Neutral;

  // Minimap ping for player units attacked by enemies
  if (targetFaction === Faction.Player && attackerFaction === Faction.Enemy) {
    world.minimapPings.push({ x: tx, y: ty, life: 120, maxLife: 120 });
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
      const isGathering =
        targetKind === EntityKind.Gatherer &&
        (targetState === UnitState.Gathering ||
          targetState === UnitState.GatherMove ||
          targetState === UnitState.ReturnMove);

      if (isGathering && !world.yukaManager.isFleeing(targetEid)) {
        const attackerX = Position.x[attackerEid];
        const attackerY = Position.y[attackerEid];

        if (!world.yukaManager.has(targetEid)) {
          const speed = hasComponent(world.ecs, targetEid, Velocity)
            ? Velocity.speed[targetEid]
            : 2.0;
          world.yukaManager.addUnit(targetEid, tx, ty, speed, tx, ty);
        }

        world.yukaManager.setFlee(targetEid, attackerX, attackerY);
        UnitStateMachine.state[targetEid] = UnitState.Move;
        UnitStateMachine.targetX[targetEid] = tx + (tx - attackerX) * 0.5;
        UnitStateMachine.targetY[targetEid] = ty + (ty - attackerY) * 0.5;
      } else if (!isGathering) {
        UnitStateMachine.targetEntity[targetEid] = attackerEid;
        UnitStateMachine.targetX[targetEid] = Position.x[attackerEid];
        UnitStateMachine.targetY[targetEid] = Position.y[attackerEid];
        UnitStateMachine.state[targetEid] = UnitState.AttackMove;
      }
    }
  }

  // Ally assist: nearby allies attack the attacker
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
