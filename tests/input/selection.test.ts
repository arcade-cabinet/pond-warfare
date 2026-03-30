/**
 * Selection Utilities Tests
 *
 * Validates the selection and command helper functions as documented in
 * POC reference files 10-selection-commands.js and 12-game-actions.js.
 *
 * Covers:
 * - canPlaceBuilding() – overlap and bounds validation
 * - getEntityAt() – click detection with priority ordering
 * - hasPlayerUnitsSelected() – selection predicate
 * - selectIdleWorker() – idle worker cycling
 * - selectArmy() – full army selection
 * - train() – training queue management and resource costs
 * - cancelTrain() – cancellation and refunds
 * - issueContextCommand() – move formation, attack, gather, rally
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it } from 'vitest';
import { TRAIN_TIMER, WORLD_HEIGHT, WORLD_WIDTH } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import {
  Building,
  Carrying,
  Collider,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  Selectable,
  Sprite,
  TrainingQueue,
  trainingQueueSlots,
  UnitStateMachine,
  Velocity,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import {
  cancelTrain,
  canPlaceBuilding,
  getEntityAt,
  hasPlayerUnitsSelected,
  issueContextCommand,
  selectArmy,
  selectIdleWorker,
  train,
} from '@/input/selection';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Create a minimal player unit entity with all required selection components. */
function createPlayerUnit(
  world: GameWorld,
  x: number,
  y: number,
  kind = EntityKind.Gatherer,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, Selectable);
  addComponent(world.ecs, eid, UnitStateMachine);
  addComponent(world.ecs, eid, Velocity);
  addComponent(world.ecs, eid, Carrying);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 100;
  Health.max[eid] = 100;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = kind;
  Collider.radius[eid] = 16;
  Sprite.width[eid] = 40;
  Sprite.height[eid] = 40;
  Selectable.selected[eid] = 0;
  UnitStateMachine.state[eid] = UnitState.Idle;
  UnitStateMachine.targetEntity[eid] = -1;
  UnitStateMachine.returnEntity[eid] = -1;
  Carrying.resourceType[eid] = ResourceType.None;

  return eid;
}

/** Create an enemy unit entity. */
function createEnemyUnit(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, Selectable);
  addComponent(world.ecs, eid, UnitStateMachine);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 60;
  Health.max[eid] = 60;
  FactionTag.faction[eid] = Faction.Enemy;
  EntityTypeTag.kind[eid] = EntityKind.Gator;
  Collider.radius[eid] = 16;
  Sprite.width[eid] = 40;
  Sprite.height[eid] = 40;
  Selectable.selected[eid] = 0;
  UnitStateMachine.state[eid] = UnitState.Idle;

  return eid;
}

/** Create a player building entity. */
function createPlayerBuilding(
  world: GameWorld,
  x: number,
  y: number,
  spriteW: number,
  spriteH: number,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, IsBuilding);
  addComponent(world.ecs, eid, Building);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, Selectable);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 500;
  Health.max[eid] = 500;
  FactionTag.faction[eid] = Faction.Player;
  EntityTypeTag.kind[eid] = EntityKind.Burrow;
  Sprite.width[eid] = spriteW;
  Sprite.height[eid] = spriteH;
  Selectable.selected[eid] = 0;
  Building.progress[eid] = 100;
  Building.hasRally[eid] = 0;

  return eid;
}

/** Create a resource entity. */
function createResource(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, IsResource);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, Selectable);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 1;
  Health.max[eid] = 1;
  FactionTag.faction[eid] = Faction.Neutral;
  EntityTypeTag.kind[eid] = EntityKind.Cattail;
  Collider.radius[eid] = 12;
  Sprite.width[eid] = 30;
  Sprite.height[eid] = 30;
  Selectable.selected[eid] = 0;

  return eid;
}

// ---------------------------------------------------------------------------
// canPlaceBuilding
// ---------------------------------------------------------------------------

describe('canPlaceBuilding()', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  it('returns true in an empty world at a valid center position', () => {
    const cx = WORLD_WIDTH / 2;
    const cy = WORLD_HEIGHT / 2;
    expect(canPlaceBuilding(world, cx, cy, 96, 96)).toBe(true);
  });

  it('returns false when position is out of bounds (left edge)', () => {
    // hw = 96/2 = 48, so bx=10 → bx-hw = -38 < 0
    expect(canPlaceBuilding(world, 10, 500, 96, 96)).toBe(false);
  });

  it('returns false when position is out of bounds (right edge)', () => {
    // bx + hw > WORLD_WIDTH
    expect(canPlaceBuilding(world, WORLD_WIDTH - 10, 500, 96, 96)).toBe(false);
  });

  it('returns false when position is out of bounds (top edge)', () => {
    expect(canPlaceBuilding(world, 500, 10, 96, 96)).toBe(false);
  });

  it('returns false when position is out of bounds (bottom edge)', () => {
    expect(canPlaceBuilding(world, 500, WORLD_HEIGHT - 10, 96, 96)).toBe(false);
  });

  it('returns false when overlapping an existing building', () => {
    // Place a building at (500, 500) with sprite 96x96
    createPlayerBuilding(world, 500, 500, 96, 96);

    // Try to place another building at (520, 520) – should overlap
    expect(canPlaceBuilding(world, 520, 520, 96, 96)).toBe(false);
  });

  it('returns true when placed far enough from an existing building', () => {
    createPlayerBuilding(world, 500, 500, 96, 96);

    // 200 pixels away – well clear of the overlap zone
    expect(canPlaceBuilding(world, 700, 700, 96, 96)).toBe(true);
  });

  it('non-building entities do not block placement', () => {
    // A unit at the same spot should not prevent building placement
    createPlayerUnit(world, 500, 500);
    expect(canPlaceBuilding(world, 500, 500, 96, 96)).toBe(true);
  });

  it('returns false exactly at world boundary (zero margin)', () => {
    // bx - hw = 0 is NOT < 0, so exactly on edge should pass
    // But bx + hw = WORLD_WIDTH should also fail (> check)
    expect(canPlaceBuilding(world, 48, WORLD_HEIGHT / 2, 96, 96)).toBe(true);
    // bx - hw = 47 < 0 → should fail
    expect(canPlaceBuilding(world, 47, WORLD_HEIGHT / 2, 96, 96)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// getEntityAt
// ---------------------------------------------------------------------------

describe('getEntityAt()', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  it('returns null in an empty world', () => {
    expect(getEntityAt(world, 100, 100)).toBeNull();
  });

  it('returns the entity ID when clicking directly on it', () => {
    const eid = createPlayerUnit(world, 200, 200);
    const result = getEntityAt(world, 200, 200);
    expect(result).toBe(eid);
  });

  it('returns entity within hit tolerance', () => {
    const eid = createPlayerUnit(world, 200, 200);
    // radius=16, hitW = max(25, 16+15)=31, click 20 px away → still within tolerance
    expect(getEntityAt(world, 220, 200)).toBe(eid);
  });

  it('returns null when click is outside hit tolerance', () => {
    createPlayerUnit(world, 200, 200);
    // hitW = max(25, 16+15) = 31; click 100 px away → miss
    expect(getEntityAt(world, 350, 200)).toBeNull();
  });

  it('prioritizes non-resource entities over resources at the same location', () => {
    const resource = createResource(world, 300, 300);
    const unit = createPlayerUnit(world, 300, 300);

    const result = getEntityAt(world, 300, 300);
    expect(result).toBe(unit);
    expect(result).not.toBe(resource);
  });

  it('returns the resource when it is the only entity at position', () => {
    const resource = createResource(world, 300, 300);
    expect(getEntityAt(world, 300, 300)).toBe(resource);
  });

  it('ignores dead entities (hp = 0), except resources', () => {
    const eid = createPlayerUnit(world, 200, 200);
    Health.current[eid] = 0; // Mark dead
    expect(getEntityAt(world, 200, 200)).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// hasPlayerUnitsSelected
// ---------------------------------------------------------------------------

describe('hasPlayerUnitsSelected()', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.selection = [];
  });

  it('returns false when selection is empty', () => {
    expect(hasPlayerUnitsSelected(world)).toBe(false);
  });

  it('returns true when a player unit is selected', () => {
    const eid = createPlayerUnit(world, 100, 100);
    world.selection = [eid];
    expect(hasPlayerUnitsSelected(world)).toBe(true);
  });

  it('returns false when only a building is selected', () => {
    const building = createPlayerBuilding(world, 500, 500, 96, 96);
    world.selection = [building];
    expect(hasPlayerUnitsSelected(world)).toBe(false);
  });

  it('returns true when selection contains mix of building and unit', () => {
    const unit = createPlayerUnit(world, 100, 100);
    const building = createPlayerBuilding(world, 500, 500, 96, 96);
    world.selection = [building, unit];
    expect(hasPlayerUnitsSelected(world)).toBe(true);
  });

  it('returns false when enemy unit is selected', () => {
    const enemy = createEnemyUnit(world, 200, 200);
    world.selection = [enemy];
    expect(hasPlayerUnitsSelected(world)).toBe(false);
  });
});

// ---------------------------------------------------------------------------
// selectIdleWorker
// ---------------------------------------------------------------------------

describe('selectIdleWorker()', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.selection = [];
    world.idleWorkerIdx = 0;
  });

  it('does nothing when no idle gatherers exist', () => {
    selectIdleWorker(world);
    expect(world.selection).toHaveLength(0);
  });

  it('selects the idle gatherer', () => {
    const eid = createPlayerUnit(world, 100, 100, EntityKind.Gatherer);
    UnitStateMachine.state[eid] = UnitState.Idle;

    selectIdleWorker(world);
    expect(world.selection).toContain(eid);
  });

  it('marks selected entity as selected', () => {
    const eid = createPlayerUnit(world, 100, 100, EntityKind.Gatherer);
    UnitStateMachine.state[eid] = UnitState.Idle;

    selectIdleWorker(world);
    expect(Selectable.selected[eid]).toBe(1);
  });

  it('sets isTracking to true', () => {
    const eid = createPlayerUnit(world, 100, 100, EntityKind.Gatherer);
    UnitStateMachine.state[eid] = UnitState.Idle;
    world.isTracking = false;

    selectIdleWorker(world);
    expect(world.isTracking).toBe(true);
  });

  it('cycles to next idle gatherer on second call', () => {
    const eid1 = createPlayerUnit(world, 100, 100, EntityKind.Gatherer);
    const eid2 = createPlayerUnit(world, 200, 200, EntityKind.Gatherer);
    UnitStateMachine.state[eid1] = UnitState.Idle;
    UnitStateMachine.state[eid2] = UnitState.Idle;

    selectIdleWorker(world);
    const firstSelection = [...world.selection];

    selectIdleWorker(world);
    const secondSelection = [...world.selection];

    // Should select a different idle worker (or cycle back if only 2)
    expect(firstSelection).not.toEqual(secondSelection);
  });

  it('ignores non-idle gatherers', () => {
    const eid = createPlayerUnit(world, 100, 100, EntityKind.Gatherer);
    UnitStateMachine.state[eid] = UnitState.Move; // Not idle

    selectIdleWorker(world);
    expect(world.selection).toHaveLength(0);
  });

  it('ignores non-gatherer units even if idle', () => {
    const brawler = createPlayerUnit(world, 100, 100, EntityKind.Brawler);
    UnitStateMachine.state[brawler] = UnitState.Idle;

    selectIdleWorker(world);
    expect(world.selection).toHaveLength(0);
  });
});

// ---------------------------------------------------------------------------
// selectArmy
// ---------------------------------------------------------------------------

describe('selectArmy()', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.selection = [];
  });

  it('does nothing when no army units exist', () => {
    selectArmy(world);
    expect(world.selection).toHaveLength(0);
  });

  it('selects all non-gatherer player units', () => {
    const brawler = createPlayerUnit(world, 100, 100, EntityKind.Brawler);
    const sniper = createPlayerUnit(world, 200, 200, EntityKind.Sniper);
    // Gatherer should NOT be included
    createPlayerUnit(world, 300, 300, EntityKind.Gatherer);

    selectArmy(world);
    expect(world.selection).toContain(brawler);
    expect(world.selection).toContain(sniper);
  });

  it('excludes gatherers from army selection', () => {
    const gatherer = createPlayerUnit(world, 100, 100, EntityKind.Gatherer);
    const brawler = createPlayerUnit(world, 200, 200, EntityKind.Brawler);

    selectArmy(world);
    expect(world.selection).not.toContain(gatherer);
    expect(world.selection).toContain(brawler);
  });

  it('excludes buildings from army selection', () => {
    const building = createPlayerBuilding(world, 500, 500, 96, 96);
    const brawler = createPlayerUnit(world, 200, 200, EntityKind.Brawler);

    selectArmy(world);
    expect(world.selection).not.toContain(building);
    expect(world.selection).toContain(brawler);
  });

  it('excludes dead units', () => {
    const dead = createPlayerUnit(world, 100, 100, EntityKind.Brawler);
    Health.current[dead] = 0;
    const alive = createPlayerUnit(world, 200, 200, EntityKind.Brawler);

    selectArmy(world);
    expect(world.selection).not.toContain(dead);
    expect(world.selection).toContain(alive);
  });

  it('sets isTracking to true', () => {
    const _brawler = createPlayerUnit(world, 200, 200, EntityKind.Brawler);
    world.isTracking = false;

    selectArmy(world);
    expect(world.isTracking).toBe(true);
  });

  it('marks all selected units as selected', () => {
    const brawler1 = createPlayerUnit(world, 100, 100, EntityKind.Brawler);
    const brawler2 = createPlayerUnit(world, 200, 200, EntityKind.Brawler);

    selectArmy(world);
    expect(Selectable.selected[brawler1]).toBe(1);
    expect(Selectable.selected[brawler2]).toBe(1);
  });

  it('deselects previously selected entities', () => {
    const prevSelected = createPlayerUnit(world, 50, 50, EntityKind.Gatherer);
    Selectable.selected[prevSelected] = 1;
    world.selection = [prevSelected];

    const _brawler = createPlayerUnit(world, 200, 200, EntityKind.Brawler);
    selectArmy(world);

    expect(Selectable.selected[prevSelected]).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// train()
// ---------------------------------------------------------------------------

describe('train()', () => {
  let world: GameWorld;
  let lodgeEid: number;

  beforeEach(() => {
    world = createGameWorld();
    // Spawn a lodge (has TrainingQueue component from archetypes.ts)
    lodgeEid = spawnEntity(world, EntityKind.Lodge, 1280, 1280, Faction.Player);
    // Ensure enough food capacity for training
    world.resources.maxFood = 10;
    world.resources.food = 0;
    // Reset resources to known values
    world.resources.clams = 200;
    world.resources.twigs = 50;
    // Clear the queue slot map
    trainingQueueSlots.delete(lodgeEid);
    TrainingQueue.count[lodgeEid] = 0;
    TrainingQueue.timer[lodgeEid] = 0;
  });

  it('deducts clam cost when queuing a unit', () => {
    const before = world.resources.clams;
    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);
    expect(world.resources.clams).toBe(before - 50);
  });

  it('deducts twig cost when queuing a unit', () => {
    world.resources.clams = 200;
    world.resources.twigs = 100;
    train(world, lodgeEid, EntityKind.Brawler, 100, 50, 1);
    expect(world.resources.twigs).toBe(50);
  });

  it('eagerly reserves food so consecutive train calls respect the cap', () => {
    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);
    // Food is eagerly incremented so subsequent train() calls see the reservation
    expect(world.resources.food).toBe(1);
  });

  it('adds unit to training queue', () => {
    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);
    expect(TrainingQueue.count[lodgeEid]).toBe(1);
    const slots = trainingQueueSlots.get(lodgeEid);
    expect(slots?.[0]).toBe(EntityKind.Gatherer);
  });

  it('initializes timer for first queued unit', () => {
    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);
    expect(TrainingQueue.timer[lodgeEid]).toBe(TRAIN_TIMER);
  });

  it('does not reset timer when second unit is queued', () => {
    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);
    TrainingQueue.timer[lodgeEid] = 90; // Simulate partial progress
    world.resources.clams = 200;

    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);
    expect(TrainingQueue.timer[lodgeEid]).toBe(90); // Timer unchanged
  });

  it('does not queue when insufficient clams', () => {
    world.resources.clams = 10; // Not enough for gatherer (costs 50)
    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);
    expect(TrainingQueue.count[lodgeEid]).toBe(0);
  });

  it('does not queue when insufficient twigs', () => {
    world.resources.twigs = 0; // Not enough for brawler (costs 50 twigs)
    world.resources.clams = 200;
    train(world, lodgeEid, EntityKind.Brawler, 100, 50, 1);
    expect(TrainingQueue.count[lodgeEid]).toBe(0);
  });

  it('does not queue when food limit reached', () => {
    world.resources.food = 10;
    world.resources.maxFood = 10;
    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);
    expect(TrainingQueue.count[lodgeEid]).toBe(0);
  });

  it('does not queue when queue is full (max 8)', () => {
    // Fill up to 8
    world.resources.maxFood = 20;
    for (let i = 0; i < 8; i++) {
      world.resources.clams = 200;
      train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);
    }
    expect(TrainingQueue.count[lodgeEid]).toBe(8);

    world.resources.clams = 200;
    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);
    expect(TrainingQueue.count[lodgeEid]).toBe(8); // Still 8, not 9
  });

  it('queues multiple different unit types', () => {
    world.resources.clams = 300;
    world.resources.twigs = 200;
    world.resources.maxFood = 5;

    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);
    train(world, lodgeEid, EntityKind.Brawler, 100, 50, 1);

    expect(TrainingQueue.count[lodgeEid]).toBe(2);
    const slots = trainingQueueSlots.get(lodgeEid);
    expect(slots?.[0]).toBe(EntityKind.Gatherer);
    expect(slots?.[1]).toBe(EntityKind.Brawler);
  });
});

// ---------------------------------------------------------------------------
// cancelTrain()
// ---------------------------------------------------------------------------

describe('cancelTrain()', () => {
  let world: GameWorld;
  let lodgeEid: number;

  beforeEach(() => {
    world = createGameWorld();
    lodgeEid = spawnEntity(world, EntityKind.Lodge, 1280, 1280, Faction.Player);
    world.resources.maxFood = 10;
    world.resources.food = 0;
    world.resources.clams = 200;
    world.resources.twigs = 50;
    trainingQueueSlots.delete(lodgeEid);
    TrainingQueue.count[lodgeEid] = 0;
    TrainingQueue.timer[lodgeEid] = 0;
  });

  it('refunds clam cost when canceling a gatherer', () => {
    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);
    const clamsBefore = world.resources.clams;

    cancelTrain(world, lodgeEid, 0);
    expect(world.resources.clams).toBe(clamsBefore + 50);
  });

  it('refunds twig cost when canceling a brawler', () => {
    world.resources.clams = 200;
    world.resources.twigs = 100;
    train(world, lodgeEid, EntityKind.Brawler, 100, 50, 1);
    const twigsBefore = world.resources.twigs;

    cancelTrain(world, lodgeEid, 0);
    expect(world.resources.twigs).toBe(twigsBefore + 50);
  });

  it('eagerly releases food reservation on cancellation', () => {
    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);
    expect(world.resources.food).toBe(1);

    cancelTrain(world, lodgeEid, 0);
    expect(world.resources.food).toBe(0);
  });

  it('removes the unit from the queue', () => {
    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);
    cancelTrain(world, lodgeEid, 0);
    expect(TrainingQueue.count[lodgeEid]).toBe(0);
  });

  it('resets timer to 0 when last queued unit is canceled', () => {
    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);
    cancelTrain(world, lodgeEid, 0);
    expect(TrainingQueue.timer[lodgeEid]).toBe(0);
  });

  it('resets timer to TRAIN_TIMER when active item canceled with items remaining', () => {
    world.resources.clams = 300;
    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);
    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);

    TrainingQueue.timer[lodgeEid] = 90; // Simulate partial progress
    cancelTrain(world, lodgeEid, 0); // Cancel the active (first) item
    expect(TrainingQueue.timer[lodgeEid]).toBe(TRAIN_TIMER);
  });

  it('does not change timer when canceling a non-active item', () => {
    world.resources.clams = 300;
    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);
    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);

    TrainingQueue.timer[lodgeEid] = 90;
    cancelTrain(world, lodgeEid, 1); // Cancel second item (not active)
    expect(TrainingQueue.timer[lodgeEid]).toBe(90);
  });

  it('does nothing for out-of-range index', () => {
    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);
    const clamsBefore = world.resources.clams;

    cancelTrain(world, lodgeEid, 5); // Out of range
    expect(world.resources.clams).toBe(clamsBefore);
    expect(TrainingQueue.count[lodgeEid]).toBe(1);
  });

  it('does nothing for negative index', () => {
    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1);
    const clamsBefore = world.resources.clams;

    cancelTrain(world, lodgeEid, -1);
    expect(world.resources.clams).toBe(clamsBefore);
  });

  it('does nothing when queue is empty', () => {
    const clamsBefore = world.resources.clams;
    cancelTrain(world, lodgeEid, 0);
    expect(world.resources.clams).toBe(clamsBefore);
  });

  it('shifts remaining items down after cancellation of first item', () => {
    world.resources.clams = 300;
    world.resources.twigs = 200;
    train(world, lodgeEid, EntityKind.Gatherer, 50, 0, 1); // index 0
    train(world, lodgeEid, EntityKind.Brawler, 100, 50, 1); // index 1

    cancelTrain(world, lodgeEid, 0);

    const slots = trainingQueueSlots.get(lodgeEid);
    expect(slots?.[0]).toBe(EntityKind.Brawler); // Brawler shifted to index 0
    expect(TrainingQueue.count[lodgeEid]).toBe(1);
  });
});

// ---------------------------------------------------------------------------
// issueContextCommand()
// ---------------------------------------------------------------------------

describe('issueContextCommand()', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    world.selection = [];
    world.placingBuilding = null;
    world.groundPings = [];
  });

  it('cancels building placement when placingBuilding is set', () => {
    world.placingBuilding = 'burrow';
    const unit = createPlayerUnit(world, 100, 100);
    world.selection = [unit];

    issueContextCommand(world, null, 500, 500);
    expect(world.placingBuilding).toBeNull();
  });

  it('does nothing when selection is empty', () => {
    world.selection = [];
    issueContextCommand(world, null, 500, 500);
    expect(world.groundPings).toHaveLength(0);
  });

  it('issues move command to player units on ground click', () => {
    const unit = createPlayerUnit(world, 100, 100);
    world.selection = [unit];

    issueContextCommand(world, null, 500, 500);
    expect(UnitStateMachine.state[unit]).toBe(UnitState.Move);
    // Role-based formation: single Gatherer goes to support (back) row
    // at targetY + FORMATION_SPACING * 2 = 500 + 80 = 580, centered X
    expect(UnitStateMachine.targetX[unit]).toBeCloseTo(500, 0);
    // Support row offset: targetY + FORMATION_SPACING * 2
    expect(UnitStateMachine.targetY[unit]).toBeGreaterThan(500);
  });

  it('adds a green ground ping on ground move', () => {
    const unit = createPlayerUnit(world, 100, 100);
    world.selection = [unit];

    issueContextCommand(world, null, 500, 500);
    expect(world.groundPings.length).toBeGreaterThan(0);
    expect(world.groundPings[0].color).toMatch(/34, 197, 94/);
  });

  it('issues attack command when targeting enemy', () => {
    const unit = createPlayerUnit(world, 100, 100, EntityKind.Brawler);
    const enemy = createEnemyUnit(world, 300, 300);
    world.selection = [unit];

    issueContextCommand(world, enemy, 300, 300);
    expect(UnitStateMachine.state[unit]).toBe(UnitState.AttackMove);
    expect(UnitStateMachine.targetEntity[unit]).toBe(enemy);
  });

  it('adds a red ground ping when attacking enemy', () => {
    const unit = createPlayerUnit(world, 100, 100, EntityKind.Brawler);
    const enemy = createEnemyUnit(world, 300, 300);
    world.selection = [unit];

    issueContextCommand(world, enemy, 300, 300);
    const redPing = world.groundPings.find((p) => p.color.includes('239, 68, 68'));
    expect(redPing).toBeDefined();
  });

  it('issues gather command when gatherer targets resource', () => {
    const gatherer = createPlayerUnit(world, 100, 100, EntityKind.Gatherer);
    const resource = createResource(world, 300, 300);
    world.selection = [gatherer];

    issueContextCommand(world, resource, 300, 300);
    expect(UnitStateMachine.state[gatherer]).toBe(UnitState.GatherMove);
    expect(UnitStateMachine.targetEntity[gatherer]).toBe(resource);
  });

  it('adds a yellow ground ping when gathering resource', () => {
    const gatherer = createPlayerUnit(world, 100, 100, EntityKind.Gatherer);
    const resource = createResource(world, 300, 300);
    world.selection = [gatherer];

    issueContextCommand(world, resource, 300, 300);
    const yellowPing = world.groundPings.find((p) => p.color.includes('250, 204, 21'));
    expect(yellowPing).toBeDefined();
  });

  it('sets rally point when single building selected and ground clicked', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 1280, 1280, Faction.Player);
    world.selection = [lodge];

    issueContextCommand(world, null, 400, 400);
    expect(Building.rallyX[lodge]).toBe(400);
    expect(Building.rallyY[lodge]).toBe(400);
    expect(Building.hasRally[lodge]).toBe(1);
  });

  it('applies diamond formation offsets for multiple units', () => {
    const unit1 = createPlayerUnit(world, 100, 100);
    const unit2 = createPlayerUnit(world, 150, 100);
    const unit3 = createPlayerUnit(world, 200, 100);
    const unit4 = createPlayerUnit(world, 250, 100);
    world.selection = [unit1, unit2, unit3, unit4];

    issueContextCommand(world, null, 500, 500);

    // All should move, but with different offsets
    expect(UnitStateMachine.state[unit1]).toBe(UnitState.Move);
    expect(UnitStateMachine.state[unit2]).toBe(UnitState.Move);
    expect(UnitStateMachine.state[unit3]).toBe(UnitState.Move);
    expect(UnitStateMachine.state[unit4]).toBe(UnitState.Move);

    // Verify they are not all sent to the exact same position (formation spread)
    const x1 = UnitStateMachine.targetX[unit1];
    const x2 = UnitStateMachine.targetX[unit2];
    expect(x1).not.toBe(x2);
  });

  it('clears attack-move state before issuing new command', () => {
    const unit = createPlayerUnit(world, 100, 100);
    UnitStateMachine.hasAttackMoveTarget[unit] = 1;
    UnitStateMachine.attackMoveTargetX[unit] = 999;
    world.selection = [unit];

    issueContextCommand(world, null, 500, 500);
    expect(UnitStateMachine.hasAttackMoveTarget[unit]).toBe(0);
  });

  it('returns true when movable player units are dispatched on ground move', () => {
    const unit = createPlayerUnit(world, 100, 100, EntityKind.Brawler);
    world.selection = [unit];

    const result = issueContextCommand(world, null, 500, 500);
    expect(result).toBe(true);
  });

  it('returns true when movable player units are dispatched on attack command', () => {
    const unit = createPlayerUnit(world, 100, 100, EntityKind.Brawler);
    const enemy = createEnemyUnit(world, 300, 300);
    world.selection = [unit];

    const result = issueContextCommand(world, enemy, 300, 300);
    expect(result).toBe(true);
  });

  it('returns false for building rally-point (no units dispatched)', () => {
    const lodge = spawnEntity(world, EntityKind.Lodge, 1280, 1280, Faction.Player);
    world.selection = [lodge];

    const result = issueContextCommand(world, null, 400, 400);
    expect(result).toBe(false);
  });

  it('returns false when selection is empty', () => {
    world.selection = [];

    const result = issueContextCommand(world, null, 500, 500);
    expect(result).toBe(false);
  });

  it('returns false when cancelling building placement', () => {
    world.placingBuilding = 'burrow';
    const unit = createPlayerUnit(world, 100, 100);
    world.selection = [unit];

    const result = issueContextCommand(world, null, 500, 500);
    expect(result).toBe(false);
  });
});
