/**
 * Death Processing
 *
 * Handles entity death: stats tracking, corpse creation, screen shake,
 * particle burst, kill credit, kill streaks, and entity removal.
 * Direct port of Entity.die() (lines 1809-1844).
 */

import { hasComponent, removeEntity } from 'bitecs';
import { audio } from '@/audio/audio-system';
import { showBark } from '@/config/barks';
import { entityKindName } from '@/config/entity-defs';
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
import { COMMANDER_DEATH_DEMORALIZE_FRAMES } from '@/ecs/systems/morale';
import type { GameWorld } from '@/ecs/world';
import { isLookoutKind } from '@/game/live-unit-kinds';
import { getEntityDisplayName } from '@/game/unit-display';
import { createCorpseId, EntityKind, Faction, SpriteId } from '@/types';
import { pushGameEvent } from '@/ui/game-events';
import { reduceVisualNoise } from '@/ui/store';
import { spawnDeathParticles } from './death-particles';

/** Ranged or recon bodies that get a "cry" death sound instead of a grunt. */
function isRangedDeathKind(kind: EntityKind): boolean {
  return isLookoutKind(kind);
}

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
      const name = hasComponent(world.ecs, eid, EntityTypeTag) ? getEntityDisplayName(world, eid) : 'Unit';
      pushGameEvent(`${name} killed`, '#ef4444', world.frameCount);
    }
    if (faction === Faction.Player && isBuilding) {
      world.stats.buildingsLost++;
      const bName = hasComponent(world.ecs, eid, EntityTypeTag) ? getEntityDisplayName(world, eid) : 'Building';
      pushGameEvent(`${bName} destroyed`, '#ef4444', world.frameCount);
    }
    if (faction === Faction.Enemy) {
      if (!isBuilding) {
        world.stats.unitsKilled++;
      }
    }
  }

  // Differentiated death sounds
  const deathKind = hasComponent(world.ecs, eid, EntityTypeTag)
    ? (EntityTypeTag.kind[eid] as EntityKind)
    : -1;
  if (isBuilding) {
    world.shakeTimer = Math.max(world.shakeTimer, 20);
    audio.deathBuilding(ex);
  } else if (!isResource) {
    if (isRangedDeathKind(deathKind as EntityKind)) {
      audio.deathRanged(ex);
    } else {
      audio.deathMelee(ex);
    }
  }

  // Death particle burst (enhanced)
  if (!reduceVisualNoise.value) {
    spawnDeathParticles(world, ex, ey, isBuilding, isResource);
  }

  // Death floating text showing unit name
  if (!isResource && !isBuilding && deathKind !== -1) {
    const name = getEntityDisplayName(world, eid);
    world.floatingTexts.push({
      x: ex,
      y: ey - 35,
      text: name,
      color: '#ef4444',
      life: 50,
    });
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

  // Commander death announcement + morale demoralization
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

    // Trigger morale demoralization for all player units (10 seconds)
    world.commanderDeathDemoralizeUntil = world.frameCount + COMMANDER_DEATH_DEMORALIZE_FRAMES;
  }

  // Boss croc loot
  if (
    hasComponent(world.ecs, eid, EntityTypeTag) &&
    (EntityTypeTag.kind[eid] as EntityKind) === EntityKind.BossCroc
  ) {
    world.resources.fish += 100;
    world.floatingTexts.push({
      x: ex,
      y: ey - 30,
      text: '+100 Fish!',
      color: '#facc15',
      life: 60,
    });
  }

  // Death bark (player units only)
  if (
    !isBuilding &&
    !isResource &&
    deathKind !== -1 &&
    hasComponent(world.ecs, eid, FactionTag) &&
    FactionTag.faction[eid] === Faction.Player
  ) {
    showBark(world, eid, ex, ey, deathKind as EntityKind, 'death', {
      color: '#ef4444',
      life: 120,
      force: true,
    });
  }

  // Credit kill to attacker
  processKillCredit(world, eid, ex, ey, attackerEid, isBuilding, isResource);

  // Clean up
  world.yukaManager.removeUnit(eid);
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
      world.gameRng.next() < 0.3
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
        text: 'TRIPLE KILL!',
        color: '#facc15',
        life: 100,
      });
      world.shakeTimer = Math.max(world.shakeTimer, 8);
      audio.tripleKill();
    } else if (world.killStreak.count === 5) {
      world.floatingTexts.push({
        x: ex,
        y: ey - 40,
        text: 'RAMPAGE!',
        color: '#ef4444',
        life: 120,
      });
      world.shakeTimer = Math.max(world.shakeTimer, 15);
      audio.rampage();
    } else if (world.killStreak.count === 10) {
      world.floatingTexts.push({
        x: ex,
        y: ey - 40,
        text: 'UNSTOPPABLE!',
        color: '#f97316',
        life: 150,
      });
      world.shakeTimer = Math.max(world.shakeTimer, 20);
      audio.unstoppable();
    }
  }
}
