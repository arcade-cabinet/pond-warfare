/**
 * Combat System
 *
 * Orchestrator that delegates aura processing to sub-modules and handles
 * tower auto-attack, idle auto-aggro, attack-move scanning, healer auto-follow,
 * and attack-move resume inline.
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { AGGRO_RADIUS_ENEMY, AGGRO_RADIUS_PLAYER, TOWER_ATTACK_COOLDOWN } from '@/constants';
import {
  Building,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Stance,
  StanceMode,
  TaskOverride,
  TowerAI,
  UnitStateMachine,
} from '@/ecs/components';
import { spawnProjectile } from '@/ecs/systems/projectile';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';
import { processAttackState } from './combat/attack-state';
import { commanderAura } from './combat/commander-aura';
import { warDrumsAura } from './combat/war-drums';
import { isStealthed } from './diver-stealth';

export function combatSystem(world: GameWorld): void {
  commanderAura(world);
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
  const allTargetable = hasSpatial ? [] : query(world.ecs, [Position, Health, FactionTag]);

  // --- Tower auto-attack ---
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
      if (isStealthed(world, t)) continue; // Skip stealthed Divers
      const dx = Position.x[t] - ex;
      const dy = Position.y[t] - ey;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d < minDist) {
        minDist = d;
        closest = t;
      }
    }

    if (closest !== -1) {
      audio.towerShoot(ex);
      spawnProjectile(
        world,
        ex,
        ey - 20,
        Position.x[closest],
        Position.y[closest],
        closest,
        Combat.damage[eid],
        eid,
        1.0,
        EntityKind.Tower,
      );
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

    // Support units move toward wounded allies so their healing auras matter.
    const isSupportUnit = kind === EntityKind.Healer || kind === EntityKind.Shaman;
    if (isSupportUnit && state === UnitState.Idle && world.frameCount % 30 === 0) {
      const supportRadius = kind === EntityKind.Shaman ? 220 : 150;
      let bestAlly = -1;
      let bestDistSq = supportRadius * supportRadius;
      const healCands = hasSpatial
        ? world.spatialHash.query(ex, ey, supportRadius)
        : allTargetable;
      for (let j = 0; j < healCands.length; j++) {
        const t = healCands[j];
        if (t === eid) continue;
        if (!hasComponent(world.ecs, t, FactionTag) || FactionTag.faction[t] !== faction) continue;
        if (hasComponent(world.ecs, t, IsResource) || hasComponent(world.ecs, t, IsBuilding))
          continue;
        if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;
        if (Health.current[t] >= Health.max[t]) continue;
        const dx = Position.x[t] - ex,
          dy = Position.y[t] - ey;
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

    // Idle auto-aggro: scan every 10 frames for snappier combat response
    if (state === UnitState.Idle && dmg > 0 && world.frameCount % 10 === 0) {
      if (TaskOverride.active[eid] === 1 && TaskOverride.task[eid] === UnitState.GatherMove) {
        continue;
      }

      const stanceMode = (Stance.mode?.[eid] as number | undefined) ?? StanceMode.Aggressive;
      // Hold stance: never auto-aggro
      if (faction === Faction.Player && stanceMode === StanceMode.Hold) continue;
      // Defensive stance: only auto-aggro if recently damaged (within 120 frames / ~2s)
      if (faction === Faction.Player && stanceMode === StanceMode.Defensive) {
        const lastDmgFrame = (Health.lastDamagedFrame?.[eid] as number | undefined) ?? 0;
        if (world.frameCount - lastDmgFrame > 120) continue;
      }

      let aggroRad = faction === Faction.Enemy ? AGGRO_RADIUS_ENEMY : AGGRO_RADIUS_PLAYER;
      if (faction === Faction.Enemy && world.tech.camouflage)
        aggroRad = Math.round(aggroRad * 0.67);

      let closestAggro = -1;
      let closestDist = aggroRad;
      const aggroCands = hasSpatial ? world.spatialHash.query(ex, ey, aggroRad) : allTargetable;
      for (let j = 0; j < aggroCands.length; j++) {
        const t = aggroCands[j];
        if (!hasComponent(world.ecs, t, FactionTag)) continue;
        if (FactionTag.faction[t] === faction || FactionTag.faction[t] === Faction.Neutral)
          continue;
        if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;
        if (hasComponent(world.ecs, t, IsResource)) continue;
        if (isStealthed(world, t)) continue; // Skip stealthed Divers
        const dx = Position.x[t] - ex,
          dy = Position.y[t] - ey;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < closestDist) {
          closestDist = d;
          closestAggro = t;
        }
      }
      if (closestAggro !== -1) {
        UnitStateMachine.targetEntity[eid] = closestAggro;
        UnitStateMachine.targetX[eid] = Position.x[closestAggro];
        UnitStateMachine.targetY[eid] = Position.y[closestAggro];
        UnitStateMachine.state[eid] = UnitState.AttackMove;
      }
      continue;
    }

    // Attack-move scanning
    if (state === UnitState.AttackMovePatrol && world.frameCount % 15 === 0) {
      const scanRad = Combat.attackRange[eid] > 60 ? Combat.attackRange[eid] : 150;
      let closeTarget = -1;
      let minDist = scanRad;
      const scanCands = hasSpatial ? world.spatialHash.query(ex, ey, scanRad) : allTargetable;
      for (let j = 0; j < scanCands.length; j++) {
        const t = scanCands[j];
        if (!hasComponent(world.ecs, t, FactionTag)) continue;
        if (FactionTag.faction[t] === faction || FactionTag.faction[t] === Faction.Neutral)
          continue;
        if (!hasComponent(world.ecs, t, Health) || Health.current[t] <= 0) continue;
        if (hasComponent(world.ecs, t, IsResource)) continue;
        if (isStealthed(world, t)) continue; // Skip stealthed Divers
        const dx = Position.x[t] - ex,
          dy = Position.y[t] - ey;
        const d = Math.sqrt(dx * dx + dy * dy);
        if (d < minDist) {
          minDist = d;
          closeTarget = t;
        }
      }
      if (closeTarget !== -1) {
        UnitStateMachine.attackMoveTargetX[eid] = UnitStateMachine.targetX[eid];
        UnitStateMachine.attackMoveTargetY[eid] = UnitStateMachine.targetY[eid];
        UnitStateMachine.hasAttackMoveTarget[eid] = 1;
        UnitStateMachine.targetEntity[eid] = closeTarget;
        UnitStateMachine.targetX[eid] = Position.x[closeTarget];
        UnitStateMachine.targetY[eid] = Position.y[closeTarget];
        UnitStateMachine.state[eid] = UnitState.AttackMove;
      }
      continue;
    }

    // Attack-move resume
    if (state === UnitState.Idle && UnitStateMachine.hasAttackMoveTarget[eid]) {
      UnitStateMachine.targetX[eid] = UnitStateMachine.attackMoveTargetX[eid];
      UnitStateMachine.targetY[eid] = UnitStateMachine.attackMoveTargetY[eid];
      UnitStateMachine.hasAttackMoveTarget[eid] = 0;
      UnitStateMachine.state[eid] = UnitState.AttackMovePatrol;
      UnitStateMachine.targetEntity[eid] = -1;
      continue;
    }

    // Attack state (delegated to sub-module)
    if (state === UnitState.Attacking) {
      processAttackState(world, eid, ex, ey, dmg, kind, faction, hasSpatial, allTargetable);
    }
  }
}
