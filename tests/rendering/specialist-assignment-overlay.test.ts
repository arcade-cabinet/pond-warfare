import { addComponent, addEntity } from 'bitecs';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Position } from '@/ecs/components';
import { createGameWorld } from '@/ecs/world';
import {
  beginSpecialistAssignment,
  placePendingSpecialistAssignment,
  registerSpecialistEntity,
} from '@/game/specialist-assignment';

const { drawDashedCircle, drawDashedLine } = vi.hoisted(() => ({
  drawDashedCircle: vi.fn(),
  drawDashedLine: vi.fn(),
}));

vi.mock('@/rendering/pixi/init', () => ({
  drawDashedCircle,
  drawDashedLine,
}));

import { renderSpecialistAssignments } from '@/rendering/pixi/specialist-assignment-overlay';

function createEntity(world = createGameWorld(), x = 100, y = 100): { eid: number; world: ReturnType<typeof createGameWorld> } {
  const eid = addEntity(world.ecs);
  addComponent(world.ecs, eid, Position);
  Position.x[eid] = x;
  Position.y[eid] = y;
  return { eid, world };
}

describe('specialist assignment overlay', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders a single-zone circle and link for selected specialists', () => {
    const { world, eid } = createEntity();
    registerSpecialistEntity(world, eid, 'fisher');
    beginSpecialistAssignment(world, eid);
    placePendingSpecialistAssignment(world, 180, 200);
    world.selection = [eid];

    const uiGfx = { circle: vi.fn(), fill: vi.fn() } as any;
    renderSpecialistAssignments(world, uiGfx);

    expect(drawDashedCircle).toHaveBeenCalledTimes(1);
    expect(drawDashedLine).toHaveBeenCalledTimes(1);
    expect(uiGfx.circle).toHaveBeenCalledWith(180, 200, 4);
  });

  it('renders anchor and engagement circles for dual-zone specialists', () => {
    const { world, eid } = createEntity();
    registerSpecialistEntity(world, eid, 'sapper');
    beginSpecialistAssignment(world, eid);
    placePendingSpecialistAssignment(world, 220, 160);
    world.selection = [eid];

    const uiGfx = { circle: vi.fn(), fill: vi.fn() } as any;
    renderSpecialistAssignments(world, uiGfx);

    expect(drawDashedCircle).toHaveBeenCalledTimes(2);
    expect(drawDashedLine).toHaveBeenCalledTimes(1);
    expect(uiGfx.circle).toHaveBeenCalledTimes(1);
  });
});
