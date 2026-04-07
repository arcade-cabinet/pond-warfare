/**
 * Commander Game-Over Tests
 *
 * Validates that Commander death triggers instant win/loss,
 * Lodge destruction alone does NOT end the game when Commanders
 * are present, and fallback logic works when no Commanders exist.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import {
  Carrying,
  Collider,
  Combat,
  Commander,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  Position,
  Sprite,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { healthSystem } from '@/ecs/systems/health';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { SAPPER_KIND } from '@/game/live-unit-kinds';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

/** Create a generic unit with Health, Position, etc. */
function createUnit(
  world: GameWorld,
  kind: EntityKind,
  faction: Faction,
  hp: number,
  isBuilding = false,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, Combat);
  addComponent(world.ecs, eid, Carrying);

  Position.x[eid] = 100;
  Position.y[eid] = 100;
  Health.current[eid] = hp;
  Health.max[eid] = hp > 0 ? hp : 100;
  Health.flashTimer[eid] = 0;
  UnitStateMachine.state[eid] = UnitState.Idle;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = kind;
  Velocity.speed[eid] = 1.8;
  Collider.radius[eid] = 16;
  Combat.damage[eid] = 6;
  Carrying.resourceType[eid] = ResourceType.None;

  if (isBuilding) {
    addComponent(world.ecs, eid, IsBuilding);
  }

  return eid;
}

/** Create a Commander entity and register it on the world. */
function createCommander(world: GameWorld, faction: Faction, hp: number): number {
  const eid = createUnit(world, EntityKind.Commander, faction, hp);
  addComponent(world.ecs, eid, Commander);
  Commander.auraRadius[eid] = 150;
  Commander.isPlayerCommander[eid] = faction === Faction.Player ? 1 : 0;

  if (faction === Faction.Player) {
    world.commanderEntityId = eid;
  } else {
    world.enemyCommanderEntityId = eid;
  }
  return eid;
}

/** Create a Lodge building. */
function createLodge(world: GameWorld, hp: number): number {
  return createUnit(world, EntityKind.Lodge, Faction.Player, hp, true);
}

/** Create an enemy PredatorNest building. */
function createNest(world: GameWorld, hp: number): number {
  return createUnit(world, EntityKind.PredatorNest, Faction.Enemy, hp, true);
}

describe('Commander Game-Over', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    // Set frameCount to 60 so win/lose check fires (every 60 frames)
    world.frameCount = 60;
  });

  it('player Commander death → instant loss', () => {
    createCommander(world, Faction.Player, 0); // dead
    createCommander(world, Faction.Enemy, 100); // alive
    createLodge(world, 100); // alive
    createNest(world, 100); // alive

    healthSystem(world);

    expect(world.state).toBe('lose');
    expect(world.gameOverReason).toBe('commander-death');
  });

  it('enemy Commander death → instant win', () => {
    createCommander(world, Faction.Player, 100); // alive
    createCommander(world, Faction.Enemy, 0); // dead
    createLodge(world, 100);
    createNest(world, 100);

    healthSystem(world);

    expect(world.state).toBe('win');
    expect(world.gameOverReason).toBe('commander-kill');
  });

  it('Lodge destruction alone does NOT end game when Commander alive', () => {
    createCommander(world, Faction.Player, 100);
    createCommander(world, Faction.Enemy, 100);
    createLodge(world, 0); // destroyed
    createNest(world, 100);
    // Player has a living unit (the Commander itself counts)
    createUnit(world, SAPPER_KIND, Faction.Player, 50);

    healthSystem(world);

    expect(world.state).toBe('playing');
  });

  it('Lodge + Commander both dead → loss (Commander check fires first)', () => {
    createCommander(world, Faction.Player, 0); // dead
    createCommander(world, Faction.Enemy, 100);
    createLodge(world, 0); // destroyed
    createNest(world, 100);

    healthSystem(world);

    expect(world.state).toBe('lose');
    // Commander death takes priority
    expect(world.gameOverReason).toBe('commander-death');
  });

  it('no Commander entities (stage 1) → fall back to Lodge/wave logic', () => {
    // No Commanders registered (commanderEntityId stays -1)
    createLodge(world, 0); // destroyed

    healthSystem(world);

    expect(world.state).toBe('lose');
    // No commander reason set — falls through to legacy logic
    expect(world.gameOverReason).toBeNull();
  });

  it('both Commanders die same frame → player wins tiebreak', () => {
    createCommander(world, Faction.Player, 0); // dead
    createCommander(world, Faction.Enemy, 0); // dead
    createLodge(world, 100);
    createNest(world, 100);

    healthSystem(world);

    expect(world.state).toBe('win');
    expect(world.gameOverReason).toBe('commander-kill');
  });

  it('enemy Commander kill adds victory floating text', () => {
    createCommander(world, Faction.Player, 100);
    createCommander(world, Faction.Enemy, 0);
    createLodge(world, 100);
    createNest(world, 100);

    const textsBefore = world.floatingTexts.length;
    healthSystem(world);

    // Should have added at least the "ENEMY COMMANDER DEFEATED!" text
    const newTexts = world.floatingTexts.slice(textsBefore);
    const defeatText = newTexts.find((t) => t.text === 'ENEMY COMMANDER DEFEATED!');
    expect(defeatText).toBeDefined();
    expect(defeatText?.color).toBe('#C5A059'); // grittyGold
    expect(defeatText?.life).toBe(300);
  });

  it('wave-survival mode still works without Commanders', () => {
    world.waveSurvivalMode = true;
    world.waveSurvivalTarget = 3;
    world.waveNumber = 3;
    world.peaceTimer = 0; // no peace timer

    createLodge(world, 100);

    healthSystem(world);

    expect(world.state).toBe('win');
  });

  it('Commander alive keeps game going even if Lodge and nests destroyed', () => {
    createCommander(world, Faction.Player, 100);
    createCommander(world, Faction.Enemy, 100);
    createLodge(world, 0); // destroyed
    // No nests, but enemy Commander alive — game continues
    // Player has living units (Commander + one brawler)
    createUnit(world, SAPPER_KIND, Faction.Player, 50);

    healthSystem(world);

    expect(world.state).toBe('playing');
  });
});
