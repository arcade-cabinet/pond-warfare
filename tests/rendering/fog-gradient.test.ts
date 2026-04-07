/**
 * Fog of War Gradient Tests
 *
 * Validates that the fog renderer creates wide radial gradients
 * with smooth multi-stop transitions instead of hard circle edges.
 */

import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { BUILDING_SIGHT_RADIUS, UNIT_SIGHT_RADIUS } from '@/constants';
import { EntityTypeTag, FactionTag, Position } from '@/ecs/components';
import { createGameWorld, type GameWorld } from '@/ecs/world';
import type { FogRendererState } from '@/rendering/fog-renderer';
import { drawFog } from '@/rendering/fog-renderer';
import { EntityKind, Faction } from '@/types';

/** Mock gradient object that records addColorStop calls. */
function createMockGradient() {
  const stops: { offset: number; color: string }[] = [];
  return {
    stops,
    addColorStop(offset: number, color: string) {
      stops.push({ offset, color });
    },
  };
}

describe('drawFog gradient softness', () => {
  let world: GameWorld;
  let mockCtx: ReturnType<typeof createMockContext>;
  let mockGradients: ReturnType<typeof createMockGradient>[];

  function createMockContext() {
    mockGradients = [];
    const canvas = { width: 800, height: 600 };
    const ctx = {
      canvas,
      clearRect: vi.fn(),
      save: vi.fn(),
      restore: vi.fn(),
      scale: vi.fn(),
      translate: vi.fn(),
      fillRect: vi.fn(),
      beginPath: vi.fn(),
      arc: vi.fn(),
      fill: vi.fn(),
      globalCompositeOperation: 'source-over',
      fillStyle: '' as string | object,
      createRadialGradient: vi.fn(
        (_x0: number, _y0: number, _r0: number, _x1: number, _y1: number, _r1: number) => {
          const grad = createMockGradient();
          mockGradients.push(grad);
          return grad;
        },
      ),
    };
    return ctx;
  }

  function createPlayerUnit(kind: EntityKind, x: number, y: number): number {
    const eid = addEntity(world.ecs);
    addComponent(world.ecs, eid, Position);
    addComponent(world.ecs, eid, FactionTag);
    addComponent(world.ecs, eid, EntityTypeTag);

    Position.x[eid] = x;
    Position.y[eid] = y;
    FactionTag.faction[eid] = Faction.Player;
    EntityTypeTag.kind[eid] = kind;

    return eid;
  }

  beforeEach(() => {
    world = createGameWorld();
    world.camX = 0;
    world.camY = 0;
    world.viewWidth = 800;
    world.viewHeight = 600;
    world.zoomLevel = 1;
    world.frameCount = 0;

    mockCtx = createMockContext();
  });

  it('should create a radial gradient with exactly 5 stops for smooth transition', () => {
    const eid = createPlayerUnit(EntityKind.Gatherer, 400, 300);

    const mockPattern = {} as CanvasPattern;
    const state: FogRendererState = {
      fogCtx: mockCtx as unknown as CanvasRenderingContext2D,
      fogPattern: mockPattern,
    };

    drawFog(state, world, [eid], 0, 0);

    expect(mockGradients.length).toBe(1);
    const grad = mockGradients[0];
    // Must have exactly 5 gradient stops matching the fog renderer implementation
    expect(grad.stops.length).toBe(5);
  });

  it('should have the first stop fully opaque and last stop fully transparent', () => {
    const eid = createPlayerUnit(EntityKind.Gatherer, 400, 300);

    const state: FogRendererState = {
      fogCtx: mockCtx as unknown as CanvasRenderingContext2D,
      fogPattern: {} as CanvasPattern,
    };

    drawFog(state, world, [eid], 0, 0);

    const grad = mockGradients[0];
    // First stop: fully opaque (center of vision)
    expect(grad.stops[0].offset).toBe(0);
    expect(grad.stops[0].color).toContain('0,0,0,1');

    // Last stop: fully transparent (edge of vision)
    const lastStop = grad.stops[grad.stops.length - 1];
    expect(lastStop.offset).toBe(1);
    expect(lastStop.color).toContain('0,0,0,0');
  });

  it('should have intermediate stops that gradually decrease opacity', () => {
    const eid = createPlayerUnit(EntityKind.Gatherer, 400, 300);

    const state: FogRendererState = {
      fogCtx: mockCtx as unknown as CanvasRenderingContext2D,
      fogPattern: {} as CanvasPattern,
    };

    drawFog(state, world, [eid], 0, 0);

    const grad = mockGradients[0];
    // Middle stops should have decreasing opacity values
    // Extract opacity from rgba strings
    const opacities = grad.stops.map((s) => {
      const match = s.color.match(/rgba\(0,0,0,([\d.]+)\)/);
      expect(match).not.toBeNull();
      return Number.parseFloat(match?.[1] ?? '');
    });

    // All opacities must have been parsed successfully (no NaN)
    for (const o of opacities) {
      expect(Number.isNaN(o)).toBe(false);
    }

    // Each subsequent stop should have opacity <= previous
    for (let i = 1; i < opacities.length; i++) {
      expect(opacities[i]).toBeLessThanOrEqual(opacities[i - 1]);
    }
  });

  it('should use inner radius at 15% of total radius for small clear core', () => {
    const eid = createPlayerUnit(EntityKind.Gatherer, 400, 300);

    const state: FogRendererState = {
      fogCtx: mockCtx as unknown as CanvasRenderingContext2D,
      fogPattern: {} as CanvasPattern,
    };

    drawFog(state, world, [eid], 0, 0);

    // Check the createRadialGradient call
    const call = mockCtx.createRadialGradient.mock.calls[0];
    const innerRadius = call[2]; // r0
    const outerRadius = call[5]; // r1

    // Inner radius should be 15% of total
    expect(innerRadius).toBeCloseTo(UNIT_SIGHT_RADIUS * 0.15, 0);
    expect(outerRadius).toBe(UNIT_SIGHT_RADIUS);
  });

  it('should use BUILDING_SIGHT_RADIUS for building entities', () => {
    const eid = createPlayerUnit(EntityKind.Lodge, 400, 300);

    const state: FogRendererState = {
      fogCtx: mockCtx as unknown as CanvasRenderingContext2D,
      fogPattern: {} as CanvasPattern,
    };

    drawFog(state, world, [eid], 0, 0);

    const call = mockCtx.createRadialGradient.mock.calls[0];
    const outerRadius = call[5];
    expect(outerRadius).toBe(BUILDING_SIGHT_RADIUS);
  });

  it('should not draw vision for enemy faction entities', () => {
    const eid = addEntity(world.ecs);
    addComponent(world.ecs, eid, Position);
    addComponent(world.ecs, eid, FactionTag);
    addComponent(world.ecs, eid, EntityTypeTag);

    Position.x[eid] = 400;
    Position.y[eid] = 300;
    FactionTag.faction[eid] = Faction.Enemy;
    EntityTypeTag.kind[eid] = EntityKind.Gator;

    const state: FogRendererState = {
      fogCtx: mockCtx as unknown as CanvasRenderingContext2D,
      fogPattern: {} as CanvasPattern,
    };

    drawFog(state, world, [eid], 0, 0);

    expect(mockGradients.length).toBe(0);
  });

  it('skips invalid projected vision circles instead of throwing', () => {
    const eid = createPlayerUnit(EntityKind.Gatherer, Number.NaN, 300);

    const state: FogRendererState = {
      fogCtx: mockCtx as unknown as CanvasRenderingContext2D,
      fogPattern: {} as CanvasPattern,
    };

    expect(() => drawFog(state, world, [eid], 0, 0)).not.toThrow();
    expect(mockGradients.length).toBe(0);
  });
});
