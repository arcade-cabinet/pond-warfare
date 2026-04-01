/**
 * Death Processing
 *
 * Handles entity death: stats tracking, corpse creation, screen shake,
 * particle burst, kill credit, kill streaks, and entity removal.
 * Direct port of Entity.die() (lines 1809-1844).
 */

import { hasComponent, removeEntity } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { campaignNotifyKilled } from '@/campaign';
import { showBark } from '@/config/barks';
import { PALETTE } from '@/constants';
import {
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  trainingQueueSlots,
} from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { createCorpseId, EntityKind, Faction, SpriteId } from '@/types';
import { reduceVisualNoise } from '@/ui/store';
import { spawnParticle } from '@/utils/particles';

export function processDeath(world: GameWorld, eid: number, attackerEid?: number): void {
  if (Health.current[eid] === -1) return;
  Health.current[eid] = -1;

  const isBuilding = hasComponent(world.ecs, eid, IsBuilding);
  const isResource = hasComponent(world.ecs, eid, IsResource);
  const ex = Position.x[eid];
  const ey = Position.y[eid];

  // Stats tracking
  if (hasComponent(world.ecs, eid, FactionTag)) {
    const faction = FactionTag.faction[eid] as Faction;
    if (faction === Faction.Player && !isBuilding && !isResource) {
      world.stats.unitsLost++;
    }
    if (faction === Faction.Player && isBuilding) {
      world.stats.buildingsLost++;
    }
    if (faction === Faction.Enemy) {
      if (!isBuilding) {
        world.stats.unitsKilled++;
      }
      campaignNotifyKilled(world, EntityTypeTag.kind[eid]);
    }
  }

  // Screen shake for building destruction
  if (isBuilding) {
    world.shakeTimer = 20;
    audio.deathBuilding();
  } else if (!isResource) {
    audio.deathUnit();
  }

  // Death particle burst
  if (!reduceVisualNoise.value) {
    spawnDeathParticles(world, ex, ey, isBuilding, isResource);
  }

  // Battlefield corpses/ruins
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

  // Commander death announcement
  if (
    hasComponent(world.ecs, eid, EntityTypeTag) &&
    (EntityTypeTag.kind[eid] as EntityKind) === EntityKind.Commander &&
    hasComponent(world.ecs, eid, FactionTag) &&
    FactionTag.faction[eid] === Faction.Player
  ) {
    world.floatingTexts.push({
      x: ex,
      y: ey - 40,
      text: 'COMMANDER FALLEN!',
      color: '#ef4444',
      life: 180,
    });
    world.floatingTexts.push({
      x: ex,
      y: ey - 20,
      text: "The Commander can't be replaced...",
      color: '#fbbf24',
      life: 150,
    });
    world.shakeTimer = Math.max(world.shakeTimer, 20);
    audio.deathBuilding();
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

  // Death bark (player units only)
  if (
    !isBuilding &&
    !isResource &&
    hasComponent(world.ecs, eid, FactionTag) &&
    FactionTag.faction[eid] === Faction.Player &&
    hasComponent(world.ecs, eid, EntityTypeTag)
  ) {
    const deathKind = EntityTypeTag.kind[eid] as EntityKind;
    showBark(world, eid, ex, ey, deathKind, 'death', { color: '#ef4444', life: 120, force: true });
  }

  // Credit kill to attacker
  processKillCredit(world, eid, ex, ey, attackerEid, isBuilding, isResource);

  // Clean up
  world.yukaManager.removeEnemy(eid);
  world.championEnemies.delete(eid);
  trainingQueueSlots.delete(eid);

  const selIdx = world.selection.indexOf(eid);
  if (selIdx > -1) {
    world.selection.splice(selIdx, 1);
  }

  removeEntity(world.ecs, eid);
}

function processKillCredit(
  world: GameWorld,
  eid: number,
  ex: number,
  ey: number,
  attackerEid: number | undefined,
  isBuilding: boolean,
  isResource: boolean,
): void {
  if (attackerEid !== undefined && hasComponent(world.ecs, attackerEid, Combat)) {
    Combat.kills[attackerEid]++;

    if (
      hasComponent(world.ecs, attackerEid, FactionTag) &&
      FactionTag.faction[attackerEid] === Faction.Player &&
      hasComponent(world.ecs, attackerEid, EntityTypeTag) &&
      Math.random() < 0.3
    ) {
      const killKind = EntityTypeTag.kind[attackerEid] as EntityKind;
      showBark(
        world,
        attackerEid,
        Position.x[attackerEid],
        Position.y[attackerEid],
        killKind,
        'kill',
        { color: '#fbbf24' },
      );
    }
  }

  // Kill streak tracking
  if (
    !isBuilding &&
    !isResource &&
    attackerEid !== undefined &&
    hasComponent(world.ecs, attackerEid, FactionTag) &&
    FactionTag.faction[attackerEid] === Faction.Player &&
    hasComponent(world.ecs, eid, FactionTag) &&
    FactionTag.faction[eid] === Faction.Enemy
  ) {
    const STREAK_WINDOW = 300;
    if (world.frameCount - world.killStreak.lastKillFrame <= STREAK_WINDOW) {
      world.killStreak.count++;
    } else {
      world.killStreak.count = 1;
    }
    world.killStreak.lastKillFrame = world.frameCount;

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
}

function spawnDeathParticles(
  world: GameWorld,
  ex: number,
  ey: number,
  isBuilding: boolean,
  isResource: boolean,
): void {
  if (isBuilding) {
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
}
