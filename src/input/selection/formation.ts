/**
 * Formation Positioning
 *
 * Calculates formation positions for group move commands.
 * Melee units in front row, ranged behind, support in back.
 */

import { EntityTypeTag } from '@/ecs/components';
import { EntityKind } from '@/types';

const FORMATION_SPACING = 60;

export function calculateFormationPositions(
  units: number[],
  targetX: number,
  targetY: number,
): { eid: number; x: number; y: number }[] {
  const melee: number[] = [];
  const ranged: number[] = [];
  const support: number[] = [];

  for (const eid of units) {
    const kind = EntityTypeTag.kind[eid] as EntityKind;
    if (kind === EntityKind.Brawler || kind === EntityKind.Gator) {
      melee.push(eid);
    } else if (kind === EntityKind.Sniper) {
      ranged.push(eid);
    } else {
      support.push(eid);
    }
  }

  const positions: { eid: number; x: number; y: number }[] = [];

  layoutRow(melee, targetX, targetY, FORMATION_SPACING, positions);
  layoutRow(ranged, targetX, targetY + FORMATION_SPACING, FORMATION_SPACING, positions);
  layoutRow(support, targetX, targetY + FORMATION_SPACING * 2, FORMATION_SPACING, positions);

  return positions;
}

function layoutRow(
  eids: number[],
  cx: number,
  cy: number,
  spacing: number,
  out: { eid: number; x: number; y: number }[],
): void {
  const count = eids.length;
  for (let i = 0; i < count; i++) {
    const offsetX = (i - (count - 1) / 2) * spacing;
    out.push({ eid: eids[i], x: cx + offsetX, y: cy });
  }
}
