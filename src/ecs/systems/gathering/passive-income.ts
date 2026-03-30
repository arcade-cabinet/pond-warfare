/**
 * Passive Income
 *
 * Handles resource generation from completed player buildings:
 *   - Trade Routes tech: completed Lodges produce +3 clams every 300 frames
 *   - Fishing Huts: produce +5 clams every 300 frames unconditionally
 */

import { query } from 'bitecs';
import { Building, EntityTypeTag, FactionTag, Health, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

export function applyPassiveIncome(world: GameWorld): void {
  if (world.frameCount % 300 !== 0) return;

  const buildings = query(world.ecs, [Position, Building, FactionTag, EntityTypeTag, Health]);

  // ---- Trade Routes passive income ----
  // Every 300 frames (~5 sec), completed player-owned Lodges generate +3 clams each
  if (world.tech.tradeRoutes) {
    for (let i = 0; i < buildings.length; i++) {
      const bid = buildings[i];
      if (EntityTypeTag.kind[bid] !== EntityKind.Lodge) continue;
      if (FactionTag.faction[bid] !== Faction.Player) continue;
      if (Health.current[bid] <= 0 || Building.progress[bid] < 100) continue;
      world.resources.clams += 3;
      world.particles.push({
        x: Position.x[bid] + (Math.random() - 0.5) * 16,
        y: Position.y[bid] - 8,
        vx: (Math.random() - 0.5) * 0.5,
        vy: -Math.random() * 0.8,
        life: 12,
        color: '#fde047',
        size: 2,
      });
    }
  }

  // ---- Fishing Hut passive income ----
  // Every 300 frames, completed player-owned FishingHuts generate +5 clams
  for (let i = 0; i < buildings.length; i++) {
    const bid = buildings[i];
    if (EntityTypeTag.kind[bid] !== EntityKind.FishingHut) continue;
    if (FactionTag.faction[bid] !== Faction.Player) continue;
    if (Health.current[bid] <= 0 || Building.progress[bid] < 100) continue;
    world.resources.clams += 5;
    world.particles.push({
      x: Position.x[bid] + (Math.random() - 0.5) * 20,
      y: Position.y[bid] - 5,
      vx: (Math.random() - 0.5) * 1,
      vy: -Math.random() * 1,
      life: 15,
      color: '#38bdf8',
      size: 2,
    });
  }
}
