import type { Graphics } from 'pixi.js';

import { Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { getSpecialistAssignment } from '@/game/specialist-assignment';
import { drawDashedCircle, drawDashedLine } from './init';

const SINGLE_ZONE_COLOR = 0x2dd4bf;
const DUAL_ZONE_COLOR = 0xf59e0b;
const LINK_ALPHA = 0.7;

export function renderSpecialistAssignments(
  world: GameWorld,
  uiGfx: Graphics,
): void {
  for (const eid of world.selection) {
    const assignment = getSpecialistAssignment(world, eid);
    if (!assignment) continue;

    const unitX = Position.x[eid];
    const unitY = Position.y[eid];
    if (assignment.mode === 'dual_zone') {
      drawDashedCircle(
        uiGfx,
        assignment.anchorX,
        assignment.anchorY,
        assignment.anchorRadius,
        7,
        5,
        DUAL_ZONE_COLOR,
        2,
        0.3,
      );
      drawDashedCircle(
        uiGfx,
        assignment.engagementX,
        assignment.engagementY,
        assignment.engagementRadius,
        7,
        5,
        DUAL_ZONE_COLOR,
        2,
        0.45,
      );
      if (Math.hypot(unitX - assignment.anchorX, unitY - assignment.anchorY) > 6) {
        drawDashedLine(
          uiGfx,
          unitX,
          unitY,
          assignment.anchorX,
          assignment.anchorY,
          8,
          6,
          DUAL_ZONE_COLOR,
          2,
        );
      }
      drawDashedLine(
        uiGfx,
        assignment.anchorX,
        assignment.anchorY,
        assignment.engagementX,
        assignment.engagementY,
        8,
        6,
        DUAL_ZONE_COLOR,
        2,
      );
      drawCenterDot(uiGfx, assignment.anchorX, assignment.anchorY, DUAL_ZONE_COLOR);
      drawCenterDot(uiGfx, assignment.engagementX, assignment.engagementY, DUAL_ZONE_COLOR);
      continue;
    }

    drawDashedCircle(
      uiGfx,
      assignment.centerX,
      assignment.centerY,
      assignment.operatingRadius,
      7,
      5,
      SINGLE_ZONE_COLOR,
      2,
      0.45,
    );
    if (Math.hypot(assignment.centerX - unitX, assignment.centerY - unitY) > 6) {
      drawDashedLine(
        uiGfx,
        unitX,
        unitY,
        assignment.centerX,
        assignment.centerY,
        8,
        6,
        SINGLE_ZONE_COLOR,
        2,
      );
    }
    drawCenterDot(uiGfx, assignment.centerX, assignment.centerY, SINGLE_ZONE_COLOR);
  }
}

function drawCenterDot(
  uiGfx: Graphics,
  x: number,
  y: number,
  color: number,
): void {
  uiGfx.circle(x, y, 4);
  uiGfx.fill({ color, alpha: LINK_ALPHA });
}
