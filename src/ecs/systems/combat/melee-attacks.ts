/**
 * Melee & Boss Croc Attack Execution
 *
 * Handles direct-damage melee attacks with damage modifiers (alpha buff,
 * commander aura, war drums, venom, flanking, elevation, morale) and
 * boss croc stomp AoE with enrage.
 *
 * Extracted from attack-state.ts to stay under 300 LOC.
 */

import { hasComponent } from 'bitecs';
import { getDamageMultiplier } from '@/config/entity-defs';
import {
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsResource,
  Position,
  Velocity,
} from '@/ecs/components';
import { takeDamage } from '@/ecs/systems/health/take-damage';
import type { GameWorld } from '@/ecs/world';
import { triggerAttackLunge } from '@/rendering/animations';
import { EntityKind, Faction } from '@/types';
import { calculatePositionalBonuses, emitPositionalBonusText } from './positional-damage';

export function executeBossCrocAttack(
  world: GameWorld,
  eid: number,
  ex: number,
  ey: number,
  dmg: number,
  faction: Faction,
  hasSpatial: boolean,
  allTargetable: ArrayLike<number>,
): void {
  const atkRange = Combat.attackRange[eid];
  const enraged = Health.current[eid] < Health.max[eid] * 0.3 && Health.max[eid] > 0;
  const bossDmg = enraged ? dmg * 2 : dmg;

  const stompRadius = atkRange + 20;
  const stompCandidates = hasSpatial ? world.spatialHash.query(ex, ey, stompRadius) : allTargetable;
  for (let j = 0; j < stompCandidates.length; j++) {
    const t = stompCandidates[j];
    if (!hasComponent(world.ecs, t, FactionTag) || FactionTag.faction[t] === faction) continue;
    if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;
    if (hasComponent(world.ecs, t, IsResource)) continue;
    const adx = Position.x[t] - ex;
    const ady = Position.y[t] - ey;
    if (Math.sqrt(adx * adx + ady * ady) <= stompRadius) {
      takeDamage(world, t, bossDmg, eid);
    }
  }

  world.shakeTimer = Math.max(world.shakeTimer, enraged ? 8 : 4);

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
}

export function executeMeleeAttack(
  world: GameWorld,
  eid: number,
  tEnt: number,
  dmg: number,
  kind: EntityKind,
  faction: Faction,
): void {
  const targetKind = EntityTypeTag.kind[tEnt] as EntityKind;
  const mult = getDamageMultiplier(kind, targetKind);
  let meleeDmg = Math.round(dmg * mult);
  let criticalHit = false;

  // Positional bonuses (flanking + elevation)
  const positional = calculatePositionalBonuses(world, eid, tEnt);
  meleeDmg = Math.round(meleeDmg * positional.multiplier);

  // Morale: demoralized units deal -20% damage
  if (world.demoralizedUnits.has(eid)) {
    meleeDmg = Math.round(meleeDmg * 0.8);
  }

  if (world.alphaDamageBuff.has(eid)) {
    meleeDmg = Math.round(meleeDmg * 1.2);
  }

  if (world.commanderDamageBuff.has(eid) && world.commanderModifiers.auraDamageBonus > 0) {
    meleeDmg = Math.round(meleeDmg * (1 + world.commanderModifiers.auraDamageBonus));
  }

  if (world.commanderEnemyDebuff.has(eid)) {
    meleeDmg = Math.round(meleeDmg * (1 - world.commanderModifiers.auraEnemyDamageReduction));
  }

  if (world.warDrumsBuff.has(eid)) {
    meleeDmg = Math.round(meleeDmg * 1.15);
  }

  if (
    faction === Faction.Player &&
    world.playerCriticalHitChance > 0 &&
    world.gameRng.next() < world.playerCriticalHitChance
  ) {
    meleeDmg *= 2;
    criticalHit = true;
  }

  takeDamage(world, tEnt, meleeDmg, eid, mult);
  triggerAttackLunge(eid, tEnt);

  // Emit floating text for positional bonuses
  if (positional.flanking || positional.elevationUp) {
    emitPositionalBonusText(world, tEnt, positional);
  }

  if (criticalHit) {
    world.floatingTexts.push({
      x: Position.x[tEnt],
      y: Position.y[tEnt] - 24,
      text: 'CRIT!',
      color: '#facc15',
      life: 30,
    });
  }

  if (kind === EntityKind.VenomSnake) {
    world.poisonTimers.set(tEnt, 5);
  }

  if (faction === Faction.Player && world.tech.venomCoating && kind !== EntityKind.VenomSnake) {
    if (!world.poisonTimers.has(tEnt)) {
      world.venomCoatingTimers.set(tEnt, 5);
    }
  }
}
