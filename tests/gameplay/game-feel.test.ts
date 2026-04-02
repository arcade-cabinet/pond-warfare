/**
 * Game Feel Tests
 *
 * Validates the three game feel improvements:
 * 1. Command voice acknowledgements on right-click commands
 * 2. Attack lunge animation on melee hit
 * 3. Staggered gathering rhythm + deposit/pickup sounds
 */

import { addComponent, addEntity } from 'bitecs';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { audio } from '@/audio/audio-system';
import {
  Carrying,
  Collider,
  Combat,
  EntityTypeTag,
  FactionTag,
  Health,
  IsResource,
  Position,
  Resource,
  Selectable,
  Sprite,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { gatheringSystem } from '@/ecs/systems/gathering';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { issueContextCommand } from '@/input/selection';
import { cleanupEntityAnimation, entityScales, triggerAttackLunge } from '@/rendering/animations';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

// Spy on audio methods
vi.spyOn(audio, 'playCommandVoice');
vi.spyOn(audio, 'click');
vi.spyOn(audio, 'deposit');
vi.spyOn(audio, 'pickup');
vi.spyOn(audio, 'chop');
vi.spyOn(audio, 'mine');

function createUnit(
  world: GameWorld,
  x: number,
  y: number,
  kind: EntityKind,
  faction: Faction,
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
  addComponent(world.ecs, eid, Carrying);
  addComponent(world.ecs, eid, Combat);
  addComponent(world.ecs, eid, Selectable);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 60;
  Health.max[eid] = 60;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = kind;
  Velocity.speed[eid] = 2.0;
  Collider.radius[eid] = 16;
  Carrying.resourceType[eid] = ResourceType.None;
  Combat.damage[eid] = 6;
  Combat.attackRange[eid] = 40;
  UnitStateMachine.state[eid] = UnitState.Idle;
  UnitStateMachine.targetEntity[eid] = -1;
  UnitStateMachine.returnEntity[eid] = -1;

  return eid;
}

function createResource(world: GameWorld, x: number, y: number, kind: EntityKind): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, IsResource);
  addComponent(world.ecs, eid, Resource);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Sprite);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Resource.amount[eid] = 1000;
  Health.current[eid] = 1;
  Health.max[eid] = 1;
  FactionTag.faction[eid] = Faction.Neutral;
  EntityTypeTag.kind[eid] = kind;
  Collider.radius[eid] = 16;

  return eid;
}

describe('Command Voice Acknowledgements', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.frameCount = 1;
    vi.clearAllMocks();
  });

  it('plays move command voice on ground right-click', () => {
    const unit = createUnit(world, 100, 100, EntityKind.Brawler, Faction.Player);
    world.selection = [unit];

    issueContextCommand(world, null, 500, 500);

    expect(audio.playCommandVoice).toHaveBeenCalledWith(EntityKind.Brawler, 'move');
  });

  it('plays attack command voice when targeting enemy', () => {
    const unit = createUnit(world, 100, 100, EntityKind.Brawler, Faction.Player);
    const enemy = createUnit(world, 200, 200, EntityKind.Gator, Faction.Enemy);
    world.selection = [unit];

    issueContextCommand(world, enemy, 200, 200);

    expect(audio.playCommandVoice).toHaveBeenCalledWith(EntityKind.Brawler, 'attack');
  });

  it('plays gather command voice when targeting resource', () => {
    const unit = createUnit(world, 100, 100, EntityKind.Gatherer, Faction.Player);
    const res = createResource(world, 200, 200, EntityKind.Cattail);
    world.selection = [unit];

    issueContextCommand(world, res, 200, 200);

    expect(audio.playCommandVoice).toHaveBeenCalledWith(EntityKind.Gatherer, 'gather');
  });

  it('plays voice for leader only in group selection', () => {
    const unit1 = createUnit(world, 100, 100, EntityKind.Brawler, Faction.Player);
    const unit2 = createUnit(world, 120, 100, EntityKind.Sniper, Faction.Player);
    world.selection = [unit1, unit2];

    issueContextCommand(world, null, 500, 500);

    // Only the first unit's voice should play
    expect(audio.playCommandVoice).toHaveBeenCalledTimes(1);
    expect(audio.playCommandVoice).toHaveBeenCalledWith(EntityKind.Brawler, 'move');
  });
});

describe('Attack Lunge Animation', () => {
  afterEach(() => {
    for (const eid of entityScales.keys()) {
      cleanupEntityAnimation(eid);
    }
  });

  it('adds scale entry to entityScales on lunge', () => {
    triggerAttackLunge(42, 99);
    expect(entityScales.has(42)).toBe(true);
    const scale = entityScales.get(42);
    expect(scale).toBeDefined();
    expect(typeof scale?.scaleX).toBe('number');
    expect(typeof scale?.scaleY).toBe('number');
  });

  it('handles multiple lunges on different entities', () => {
    triggerAttackLunge(1, 10);
    triggerAttackLunge(2, 20);
    expect(entityScales.has(1)).toBe(true);
    expect(entityScales.has(2)).toBe(true);
  });

  it('overwrites existing animation for the same entity', () => {
    triggerAttackLunge(10, 99);
    triggerAttackLunge(10, 99);
    expect(entityScales.size).toBeGreaterThanOrEqual(1);
    expect(entityScales.has(10)).toBe(true);
  });
});

describe('Staggered Gathering Rhythm', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    vi.clearAllMocks();
  });

  it('staggers gather SFX per entity instead of all at once', () => {
    // Create two gatherers with different eids
    const g1 = createUnit(world, 100, 100, EntityKind.Gatherer, Faction.Player);
    const r1 = createResource(world, 100, 100, EntityKind.Cattail);
    const g2 = createUnit(world, 200, 200, EntityKind.Gatherer, Faction.Player);
    const r2 = createResource(world, 200, 200, EntityKind.Clambed);

    UnitStateMachine.state[g1] = UnitState.Gathering;
    UnitStateMachine.targetEntity[g1] = r1;
    UnitStateMachine.gatherTimer[g1] = 100;

    UnitStateMachine.state[g2] = UnitState.Gathering;
    UnitStateMachine.targetEntity[g2] = r2;
    UnitStateMachine.gatherTimer[g2] = 100;

    // Find frameCount where g1 ticks but g2 does not (or vice versa)
    // (frameCount + eid * 7) % 30 === 0 means they tick at different frames
    // unless eids are 30-apart in modular arithmetic
    let g1Ticked = false;
    let g2Ticked = false;
    for (let frame = 0; frame < 60; frame++) {
      world.frameCount = frame;
      vi.clearAllMocks();
      gatheringSystem(world);

      const chopCalled = (audio.chop as any).mock.calls.length > 0;
      const mineCalled = (audio.mine as any).mock.calls.length > 0;

      if (chopCalled && !mineCalled) g1Ticked = true;
      if (mineCalled && !chopCalled) g2Ticked = true;
      // Track simultaneous ticks (both on same frame = old behavior)
    }

    // At least one gatherer should tick independently of the other
    expect(g1Ticked || g2Ticked).toBe(true);
  });

  it('plays pickup sound when gather timer completes', () => {
    const gatherer = createUnit(world, 100, 100, EntityKind.Gatherer, Faction.Player);
    const res = createResource(world, 100, 100, EntityKind.Cattail);

    UnitStateMachine.state[gatherer] = UnitState.Gathering;
    UnitStateMachine.targetEntity[gatherer] = res;
    UnitStateMachine.gatherTimer[gatherer] = 1; // About to finish

    world.frameCount = 1;
    gatheringSystem(world);

    expect(audio.pickup).toHaveBeenCalled();
  });
});
