/**
 * Entity Status Overlay Tests
 *
 * Validates idle unit indicator timing and ctrl group badge logic.
 * Tests the data/tracking layer; PixiJS rendering is not tested here
 * to avoid dependencies on PixiJS Application state.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EntityTypeTag,
  FactionTag,
  Health,
  Position,
  Sprite,
  UnitStateMachine,
} from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { EntityKind, Faction, UnitState } from '@/types';

// Mock the PixiJS-dependent overlay functions so we can test
// the tracking logic without requiring a PixiJS context.
vi.mock('@/rendering/pixi/entity-overlays', () => ({
  renderIdleIndicator: vi.fn(),
  removeIdleIndicator: vi.fn(),
  renderCtrlGroupBadge: vi.fn(),
  removeCtrlGroupBadge: vi.fn(),
  cleanupOverlayTexts: vi.fn(),
}));

vi.mock('@/rendering/pixi/init', () => ({
  setDestroyOverlayTextsCallback: vi.fn(),
}));

// Import after mocking
const { getEntityIdleFrames, resetEntityIdleFrames, updateIdleOverlay } = await import(
  '@/rendering/pixi/entity-status-overlays'
);

const mockEntityLayer = {} as any;

function createUnit(
  world: GameWorld,
  kind: EntityKind,
  faction: Faction,
  state: UnitState,
  x = 100,
  y = 100,
): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, Sprite);
  addComponent(world.ecs, eid, UnitStateMachine);

  Position.x[eid] = x;
  Position.y[eid] = y;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = kind;
  Health.current[eid] = 100;
  Health.max[eid] = 100;
  Sprite.width[eid] = 32;
  Sprite.height[eid] = 32;
  Sprite.yOffset[eid] = 0;
  UnitStateMachine.state[eid] = state;

  return eid;
}

// ── Idle Indicator Tracking ──────────────────────────────────────

describe('Idle indicator frame tracking', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
    resetEntityIdleFrames();
  });

  it('increments idle frames for idle player units', () => {
    const eid = createUnit(world, EntityKind.Gatherer, Faction.Player, UnitState.Idle);

    for (let i = 0; i < 5; i++) {
      updateIdleOverlay(eid, false, false, 100, 100, 32, 0, i, mockEntityLayer);
    }

    expect(getEntityIdleFrames(eid)).toBe(5);
  });

  it('resets idle frames when unit starts moving', () => {
    const eid = createUnit(world, EntityKind.Gatherer, Faction.Player, UnitState.Idle);

    for (let i = 0; i < 100; i++) {
      updateIdleOverlay(eid, false, false, 100, 100, 32, 0, i, mockEntityLayer);
    }
    expect(getEntityIdleFrames(eid)).toBe(100);

    UnitStateMachine.state[eid] = UnitState.Move;
    updateIdleOverlay(eid, false, false, 100, 100, 32, 0, 101, mockEntityLayer);
    expect(getEntityIdleFrames(eid)).toBe(0);
  });

  it('does not track idle frames for enemy units', () => {
    const eid = createUnit(world, EntityKind.Gator, Faction.Enemy, UnitState.Idle);

    for (let i = 0; i < 200; i++) {
      updateIdleOverlay(eid, false, false, 100, 100, 32, 0, i, mockEntityLayer);
    }

    expect(getEntityIdleFrames(eid)).toBe(0);
  });

  it('does not track idle frames for buildings', () => {
    const eid = createUnit(world, EntityKind.Lodge, Faction.Player, UnitState.Idle);

    for (let i = 0; i < 200; i++) {
      updateIdleOverlay(eid, true, false, 100, 100, 32, 0, i, mockEntityLayer);
    }

    expect(getEntityIdleFrames(eid)).toBe(0);
  });

  it('does not track idle frames for resources', () => {
    const eid = createUnit(world, EntityKind.Cattail, Faction.Player, UnitState.Idle);

    for (let i = 0; i < 200; i++) {
      updateIdleOverlay(eid, false, true, 100, 100, 32, 0, i, mockEntityLayer);
    }

    expect(getEntityIdleFrames(eid)).toBe(0);
  });

  it('reaches 180 frame threshold for idle indicator', () => {
    const eid = createUnit(world, EntityKind.Brawler, Faction.Player, UnitState.Idle);

    for (let i = 0; i < 179; i++) {
      updateIdleOverlay(eid, false, false, 100, 100, 32, 0, i, mockEntityLayer);
    }
    expect(getEntityIdleFrames(eid)).toBe(179);

    updateIdleOverlay(eid, false, false, 100, 100, 32, 0, 180, mockEntityLayer);
    expect(getEntityIdleFrames(eid)).toBe(180);
  });

  it('resetEntityIdleFrames clears all tracking', () => {
    const eid1 = createUnit(world, EntityKind.Brawler, Faction.Player, UnitState.Idle);
    const eid2 = createUnit(world, EntityKind.Gatherer, Faction.Player, UnitState.Idle);

    for (let i = 0; i < 50; i++) {
      updateIdleOverlay(eid1, false, false, 100, 100, 32, 0, i, mockEntityLayer);
      updateIdleOverlay(eid2, false, false, 200, 200, 32, 0, i, mockEntityLayer);
    }

    expect(getEntityIdleFrames(eid1)).toBe(50);
    expect(getEntityIdleFrames(eid2)).toBe(50);

    resetEntityIdleFrames();

    expect(getEntityIdleFrames(eid1)).toBe(0);
    expect(getEntityIdleFrames(eid2)).toBe(0);
  });
});

// ── Ctrl Group Lookup ────────────────────────────────────────────

describe('Ctrl group badge rendering', () => {
  let world: GameWorld;

  beforeEach(() => {
    world = createGameWorld();
  });

  it('world.ctrlGroups stores entity-to-group mapping', () => {
    const eid = addEntity(world.ecs);
    world.ctrlGroups[1] = [eid];

    expect(world.ctrlGroups[1]).toContain(eid);
  });

  it('entity can exist in multiple ctrl groups', () => {
    const eid = addEntity(world.ecs);
    world.ctrlGroups[1] = [eid];
    world.ctrlGroups[2] = [eid];

    expect(world.ctrlGroups[1]).toContain(eid);
    expect(world.ctrlGroups[2]).toContain(eid);
  });

  it('empty ctrlGroups means no badge for any entity', () => {
    expect(Object.keys(world.ctrlGroups).length).toBe(0);
  });
});
