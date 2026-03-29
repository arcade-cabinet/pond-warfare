/**
 * AI System
 *
 * Ported from updateLogic() lines 1211-1235 (peace timer, wave spawning) and
 * Entity.update() lines 1757-1771 (nest defense reinforcement) of the original HTML game.
 *
 * Responsibilities:
 * - Peace timer management: first peaceTimer frames are peaceful, then hunting begins
 * - Enemy wave spawning: every 1800 frames after peace ends, spawn waves from nests
 *   targeting the player lodge. Wave size scales: min(6, 1 + floor((frameCount - peaceTimer) / 7200))
 * - Nest defense reinforcement: when a nest drops below 50% HP, spawn a defender every 600
 *   frames if fewer than 4 nearby enemy units. Defenders attack nearest player unit.
 */

import { hasComponent, query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { ENTITY_DEFS } from '@/config/entity-defs';
import { MAX_WAVE_SIZE, WAVE_INTERVAL, WAVE_SCALE_INTERVAL } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

export function aiSystem(world: GameWorld): void {
  // --- Peace timer / wave logic (lines 1211-1235) ---
  const isPeaceful = world.frameCount < world.peaceTimer;

  if (!isPeaceful) {
    // Enemy wave spawning every WAVE_INTERVAL (1800) frames
    // Original: if (this.frameCount % 1800 === 0)
    if (world.frameCount % WAVE_INTERVAL === 0) {
      // Find all predator nests
      const nests = query(world.ecs, [Position, Health, EntityTypeTag, FactionTag, IsBuilding]);
      const nestEids: number[] = [];
      for (let i = 0; i < nests.length; i++) {
        const eid = nests[i];
        if (EntityTypeTag.kind[eid] === EntityKind.PredatorNest && Health.current[eid] > 0) {
          nestEids.push(eid);
        }
      }

      // Find player lodge
      // Original: let th = this.entities.find(e => e.type === 'lodge' && e.faction === 'player');
      let lodgeEid = -1;
      const pBuildings = query(world.ecs, [
        Position,
        Health,
        FactionTag,
        EntityTypeTag,
        IsBuilding,
      ]);
      for (let i = 0; i < pBuildings.length; i++) {
        const eid = pBuildings[i];
        if (
          EntityTypeTag.kind[eid] === EntityKind.Lodge &&
          FactionTag.faction[eid] === Faction.Player &&
          Health.current[eid] > 0
        ) {
          lodgeEid = eid;
          break;
        }
      }

      if (nestEids.length > 0 && lodgeEid !== -1) {
        audio.alert();

        // Wave size scales with time
        // Original: let waveSize = Math.min(6, 1 + Math.floor((this.frameCount - this.peaceTimer) / 7200));
        const waveSize = Math.min(
          MAX_WAVE_SIZE,
          1 + Math.floor((world.frameCount - world.peaceTimer) / WAVE_SCALE_INTERVAL),
        );

        for (const nestEid of nestEids) {
          const nx = Position.x[nestEid];
          const ny = Position.y[nestEid];

          for (let j = 0; j < waveSize; j++) {
            // Original: let type = Math.random() > 0.5 ? 'gator' : 'snake';
            const unitKind = Math.random() > 0.5 ? EntityKind.Gator : EntityKind.Snake;
            const sx = nx + (Math.random() - 0.5) * 60;
            const sy = ny + 30 + (Math.random() - 0.5) * 30;

            const eid = spawnEntity(world, unitKind, sx, sy, Faction.Enemy);
            if (eid < 0) continue; // Skip if spawn failed

            // cmdAtk(th) -> set a_move to lodge
            UnitStateMachine.targetEntity[eid] = lodgeEid;
            UnitStateMachine.targetX[eid] = Position.x[lodgeEid];
            UnitStateMachine.targetY[eid] = Position.y[lodgeEid];
            UnitStateMachine.state[eid] = UnitState.AttackMove;

            // Register with Yuka for steering behaviors
            const speed = Velocity.speed[eid] || ENTITY_DEFS[unitKind]?.speed || 1.5;
            world.yukaManager.addEnemy(
              eid,
              sx,
              sy,
              speed,
              Position.x[lodgeEid],
              Position.y[lodgeEid],
            );
          }
        }
      }
    }
  }

  // --- Boss wave: after wave 10, spawn 1 boss croc per nest every 3 wave intervals ---
  if (
    !isPeaceful &&
    world.frameCount > world.peaceTimer + 10 * WAVE_INTERVAL &&
    world.frameCount % (WAVE_INTERVAL * 3) === 0
  ) {
    const nests = query(world.ecs, [Position, Health, EntityTypeTag, FactionTag, IsBuilding]);
    let lodgeEid = -1;
    const pBuildings = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag, IsBuilding]);
    for (let i = 0; i < pBuildings.length; i++) {
      const eid = pBuildings[i];
      if (
        EntityTypeTag.kind[eid] === EntityKind.Lodge &&
        FactionTag.faction[eid] === Faction.Player &&
        Health.current[eid] > 0
      ) {
        lodgeEid = eid;
        break;
      }
    }

    for (let i = 0; i < nests.length; i++) {
      const nestEid = nests[i];
      if (EntityTypeTag.kind[nestEid] !== EntityKind.PredatorNest) continue;
      if (Health.current[nestEid] <= 0) continue;

      const nx = Position.x[nestEid];
      const ny = Position.y[nestEid];
      const sx = nx + (Math.random() - 0.5) * 60;
      const sy = ny + 30;

      const eid = spawnEntity(world, EntityKind.BossCroc, sx, sy, Faction.Enemy);
      if (eid < 0) continue; // Skip if spawn failed

      if (lodgeEid !== -1) {
        UnitStateMachine.targetEntity[eid] = lodgeEid;
        UnitStateMachine.targetX[eid] = Position.x[lodgeEid];
        UnitStateMachine.targetY[eid] = Position.y[lodgeEid];
        UnitStateMachine.state[eid] = UnitState.AttackMove;

        const speed = Velocity.speed[eid] || ENTITY_DEFS[EntityKind.BossCroc]?.speed || 1.2;
        world.yukaManager.addEnemy(eid, sx, sy, speed, Position.x[lodgeEid], Position.y[lodgeEid]);
      }
    }
  }

  // --- Nest defense reinforcement (lines 1757-1771) ---
  // Original: if (this.type === 'predator_nest' && this.hp < this.maxHp * 0.5 && GAME.frameCount % 600 === 0)
  if (world.frameCount % 600 === 0) {
    const nests = query(world.ecs, [Position, Health, EntityTypeTag, FactionTag, IsBuilding]);
    const allUnits = query(world.ecs, [Position, Health, FactionTag, EntityTypeTag]);

    for (let i = 0; i < nests.length; i++) {
      const nestEid = nests[i];
      if (EntityTypeTag.kind[nestEid] !== EntityKind.PredatorNest) continue;
      if (Health.current[nestEid] <= 0) continue;
      if (Health.current[nestEid] >= Health.max[nestEid] * 0.5) continue;

      const nx = Position.x[nestEid];
      const ny = Position.y[nestEid];

      // Count nearby enemy defenders
      // Original: let nearbyDefenders = GAME.entities.filter(e => e.faction === 'enemy' && !e.isBuilding && Math.sqrt((e.x-this.x)**2+(e.y-this.y)**2) < 300);
      let defenderCount = 0;
      for (let j = 0; j < allUnits.length; j++) {
        const u = allUnits[j];
        if (FactionTag.faction[u] !== Faction.Enemy) continue;
        if (hasComponent(world.ecs, u, IsBuilding)) continue;
        if (Health.current[u] <= 0) continue;

        const dx = Position.x[u] - nx;
        const dy = Position.y[u] - ny;
        const dSq = dx * dx + dy * dy;
        if (dSq < 300 * 300) {
          defenderCount++;
        }
      }

      // Original: if (nearbyDefenders.length < 4)
      if (defenderCount < 4) {
        const unitKind = Math.random() > 0.5 ? EntityKind.Gator : EntityKind.Snake;
        const sx = nx + (Math.random() - 0.5) * 60;
        const sy = ny + 30;

        const defEid = spawnEntity(world, unitKind, sx, sy, Faction.Enemy);
        if (defEid < 0) continue; // Skip if spawn failed

        // Find nearest player unit to attack
        // Original: let targets = GAME.entities.filter(e => e.faction === 'player' && e.hp > 0);
        let closestTarget = -1;
        let minDistSq = 400 * 400;
        for (let j = 0; j < allUnits.length; j++) {
          const u = allUnits[j];
          if (FactionTag.faction[u] !== Faction.Player) continue;
          if (Health.current[u] <= 0) continue;

          const dx = Position.x[u] - nx;
          const dy = Position.y[u] - ny;
          const dSq = dx * dx + dy * dy;
          if (dSq < minDistSq) {
            minDistSq = dSq;
            closestTarget = u;
          }
        }

        // Register defender with Yuka
        const defSpeed = Velocity.speed[defEid] || ENTITY_DEFS[unitKind]?.speed || 1.5;

        if (closestTarget !== -1) {
          // cmdAtk(closest)
          UnitStateMachine.targetEntity[defEid] = closestTarget;
          UnitStateMachine.targetX[defEid] = Position.x[closestTarget];
          UnitStateMachine.targetY[defEid] = Position.y[closestTarget];
          UnitStateMachine.state[defEid] = UnitState.AttackMove;

          world.yukaManager.addEnemy(
            defEid,
            sx,
            sy,
            defSpeed,
            Position.x[closestTarget],
            Position.y[closestTarget],
          );
        } else {
          // No target; register near nest for potential future use
          world.yukaManager.addEnemy(defEid, sx, sy, defSpeed, nx, ny);
        }
      }
    }
  }
}