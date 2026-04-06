/**
 * Pointer/Touch Interaction Tests
 *
 * Validates the primary input method (tap/pointer) for core game interactions:
 * - Tap ground with units selected = move command
 * - Tap unit = select it
 * - Tap enemy with unit selected = attack command
 * - Tap resource with gatherer selected = gather command
 * - Re-tap selected gatherer near resource = gather command (not radial)
 * - Double-tap empty ground = deselect
 *
 * Zero keyboard references in this file.
 */

import { addComponent, addEntity, hasComponent } from 'bitecs';
import { describe, expect, it, vi } from 'vitest';
import {
  Carrying,
  Collider,
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
import { createGameWorld, type GameWorld } from '@/ecs/world';
import { type ClickState, handleClick } from '@/input/pointer-click';
import type { PointerCallbacks, PointerState } from '@/input/pointer-types';
import { EntityKind, Faction, ResourceType, UnitState } from '@/types';

vi.mock('@/audio/audio-system', () => ({
  audio: new Proxy({}, { get: () => vi.fn() }),
}));
vi.mock('@/rendering/animations', () => ({ triggerCommandPulse: vi.fn() }));
vi.mock('@/rendering/pixi/auto-symbol-overlay', () => ({
  hitTestAutoSymbol: () => -1,
}));
vi.mock('@/config/barks', () => ({
  showSelectBark: vi.fn(),
  showBark: vi.fn(),
}));

/** Create a minimal player unit for tap tests. */
function createUnit(world: GameWorld, x: number, y: number, kind: number, faction: number): number {
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
  Health.current[eid] = 60;
  Health.max[eid] = 60;
  FactionTag.faction[eid] = faction;
  EntityTypeTag.kind[eid] = kind;
  Collider.radius[eid] = 16;
  Selectable.selected[eid] = 0;
  UnitStateMachine.state[eid] = UnitState.Idle;

  return eid;
}

function createResource(world: GameWorld, x: number, y: number): number {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  addComponent(world.ecs, eid, Health);
  addComponent(world.ecs, eid, FactionTag);
  addComponent(world.ecs, eid, EntityTypeTag);
  addComponent(world.ecs, eid, Collider);
  addComponent(world.ecs, eid, IsResource);
  addComponent(world.ecs, eid, Resource);

  Position.x[eid] = x;
  Position.y[eid] = y;
  Health.current[eid] = 100;
  Health.max[eid] = 100;
  FactionTag.faction[eid] = Faction.Neutral;
  EntityTypeTag.kind[eid] = EntityKind.Clambed;
  Resource.resourceType[eid] = ResourceType.Fish;
  Collider.radius[eid] = 20;

  return eid;
}

function makeMouse(worldX: number, worldY: number): PointerState {
  return {
    x: worldX,
    y: worldY,
    worldX,
    worldY,
    startX: worldX,
    startY: worldY,
    screenX: worldX,
    screenY: worldY,
    isDown: false,
    btn: 0,
    in: true,
  };
}

function makeCallbacks(world: GameWorld, entityMap: Map<string, number>): PointerCallbacks {
  return {
    getEntityAt: (wx, wy) => {
      // Prioritize non-resource entities (same as real getEntityAt)
      const sorted = [...entityMap.values()].sort((a, b) => {
        const aRes = hasComponent(world.ecs, a, IsResource) ? 1 : 0;
        const bRes = hasComponent(world.ecs, b, IsResource) ? 1 : 0;
        return aRes - bRes;
      });
      for (const eid of sorted) {
        const dx = Position.x[eid] - wx;
        const dy = Position.y[eid] - wy;
        if (Math.sqrt(dx * dx + dy * dy) < Collider.radius[eid]) return eid;
      }
      return null;
    },
    getResourceAt: (wx, wy) => {
      for (const [, eid] of entityMap) {
        if (!hasComponent(world.ecs, eid, IsResource)) continue;
        const dx = Position.x[eid] - wx;
        const dy = Position.y[eid] - wy;
        if (Math.sqrt(dx * dx + dy * dy) < Collider.radius[eid] + 20) return eid;
      }
      return null;
    },
    hasPlayerUnitsSelected: () =>
      world.selection.some((eid) => FactionTag.faction[eid] === Faction.Player),
    issueContextCommand: vi.fn(),
    onUpdateUI: vi.fn(),
    onPlaceBuilding: vi.fn(),
    onPlaySound: vi.fn(),
    isPlayerUnit: (eid) =>
      FactionTag.faction[eid] === Faction.Player && EntityTypeTag.kind[eid] !== EntityKind.Lodge,
    isPlayerBuilding: () => false,
    isEnemyFaction: (eid) => FactionTag.faction[eid] === Faction.Enemy,
    isBuildingEntity: () => false,
    getEntityKind: (eid) => EntityTypeTag.kind[eid],
    getEntityPosition: (eid) => ({ x: Position.x[eid], y: Position.y[eid] }),
    isEntityOnScreen: () => true,
    getAllPlayerUnitsOfKind: () => [],
    selectEntity: vi.fn((eid: number) => {
      Selectable.selected[eid] = 1;
    }),
    deselectEntity: vi.fn((eid: number) => {
      Selectable.selected[eid] = 0;
    }),
    deselectAll: vi.fn(() => {
      for (const eid of world.selection) Selectable.selected[eid] = 0;
    }),
  };
}

describe('Pointer Interactions (tap-only)', () => {
  it('tap on empty ground with units selected issues move command', () => {
    const world = createGameWorld();
    world.state = 'playing';
    const entities = new Map<string, number>();
    const unit = createUnit(world, 100, 100, EntityKind.Gatherer, Faction.Player);
    entities.set('unit', unit);

    Selectable.selected[unit] = 1;
    world.selection = [unit];

    const cb = makeCallbacks(world, entities);
    const clickState: ClickState = { lastClickTime: 0, lastClickEntity: null };

    // Tap on empty ground (far from unit)
    const mouse = makeMouse(500, 500);
    handleClick(world, mouse, cb, clickState, () => false);

    expect(cb.issueContextCommand).toHaveBeenCalledWith(null);
  });

  it('tap on player unit selects it', () => {
    const world = createGameWorld();
    world.state = 'playing';
    const entities = new Map<string, number>();
    const unit = createUnit(world, 100, 100, EntityKind.Brawler, Faction.Player);
    entities.set('unit', unit);

    const cb = makeCallbacks(world, entities);
    const clickState: ClickState = { lastClickTime: 0, lastClickEntity: null };

    const mouse = makeMouse(100, 100);
    handleClick(world, mouse, cb, clickState, () => false);

    expect(world.selection).toContain(unit);
    expect(Selectable.selected[unit]).toBe(1);
    expect(cb.onPlaySound).toHaveBeenCalledWith('selectUnit');
  });

  it('tap on enemy with player unit selected issues attack command', () => {
    const world = createGameWorld();
    world.state = 'playing';
    const entities = new Map<string, number>();

    const playerUnit = createUnit(world, 100, 100, EntityKind.Brawler, Faction.Player);
    const enemyUnit = createUnit(world, 300, 300, EntityKind.Gator, Faction.Enemy);
    entities.set('player', playerUnit);
    entities.set('enemy', enemyUnit);

    Selectable.selected[playerUnit] = 1;
    world.selection = [playerUnit];

    const cb = makeCallbacks(world, entities);
    const clickState: ClickState = { lastClickTime: 0, lastClickEntity: null };

    const mouse = makeMouse(300, 300);
    handleClick(world, mouse, cb, clickState, () => false);

    expect(cb.issueContextCommand).toHaveBeenCalledWith(enemyUnit);
  });

  it('tap on resource with gatherer selected issues gather command', () => {
    const world = createGameWorld();
    world.state = 'playing';
    const entities = new Map<string, number>();

    const gatherer = createUnit(world, 100, 100, EntityKind.Gatherer, Faction.Player);
    const resource = createResource(world, 250, 250);
    entities.set('gatherer', gatherer);
    entities.set('resource', resource);

    Selectable.selected[gatherer] = 1;
    world.selection = [gatherer];

    const cb = makeCallbacks(world, entities);
    const clickState: ClickState = { lastClickTime: 0, lastClickEntity: null };

    const mouse = makeMouse(250, 250);
    handleClick(world, mouse, cb, clickState, () => false);

    expect(cb.issueContextCommand).toHaveBeenCalledWith(resource);
  });

  it('re-tap selected gatherer near resource dispatches gather instead of radial', () => {
    const world = createGameWorld();
    world.state = 'playing';
    const entities = new Map<string, number>();

    // Gatherer and resource at same position (gatherer standing on fish node)
    const gatherer = createUnit(world, 200, 200, EntityKind.Gatherer, Faction.Player);
    const resource = createResource(world, 200, 200);
    entities.set('gatherer', gatherer);
    entities.set('resource', resource);

    // Gatherer is already selected
    Selectable.selected[gatherer] = 1;
    world.selection = [gatherer];

    const cb = makeCallbacks(world, entities);
    const clickState: ClickState = { lastClickTime: 0, lastClickEntity: null };

    // Tap on the same position (gatherer + resource overlap)
    // getEntityAt returns gatherer (non-resource priority), but getResourceAt
    // finds the resource underneath.
    const mouse = makeMouse(200, 200);
    handleClick(world, mouse, cb, clickState, () => false);

    // Should dispatch gather command with the resource entity, not open radial
    expect(cb.issueContextCommand).toHaveBeenCalledWith(resource);
  });

  it('non-gatherer selected unit re-tapping resource does NOT dispatch gather', () => {
    const world = createGameWorld();
    world.state = 'playing';
    const entities = new Map<string, number>();

    // Brawler (non-gatherer) and resource at same position
    const brawler = createUnit(world, 200, 200, EntityKind.Brawler, Faction.Player);
    const resource = createResource(world, 200, 200);
    entities.set('brawler', brawler);
    entities.set('resource', resource);

    // Brawler is already selected
    Selectable.selected[brawler] = 1;
    world.selection = [brawler];

    const cb = makeCallbacks(world, entities);
    const clickState: ClickState = { lastClickTime: 0, lastClickEntity: null };

    // Tap on the brawler/resource overlap position
    const mouse = makeMouse(200, 200);
    handleClick(world, mouse, cb, clickState, () => false);

    // Should NOT dispatch gather -- Brawler cannot gather.
    // The resource shortcut only activates when a Gatherer is selected.
    expect(cb.issueContextCommand).not.toHaveBeenCalledWith(resource);
  });

  it('tap on nothing with no selection is a no-op', () => {
    const world = createGameWorld();
    world.state = 'playing';
    const entities = new Map<string, number>();

    const cb = makeCallbacks(world, entities);
    const clickState: ClickState = { lastClickTime: 0, lastClickEntity: null };

    handleClick(world, makeMouse(500, 500), cb, clickState, () => false);

    expect(world.selection).toHaveLength(0);
    expect(cb.issueContextCommand).not.toHaveBeenCalled();
  });
});
