/**
 * Passive Income
 *
 * Handles resource generation from completed player buildings:
 *   - Trade Routes tech: completed Markets produce +2 clams every 60 frames (1/sec)
 *   - Fishing Huts: produce +5 clams every 300 frames unconditionally
 */

import { query } from 'bitecs';
import { Building, EntityTypeTag, FactionTag, Health, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';

export function applyPassiveIncome(world: GameWorld): void {
  const buildings = query(world.ecs, [Position, Building, FactionTag, EntityTypeTag, Health]);

  // ---- Trade Routes passive income ----
  // Every 60 frames (~1 sec), completed player-owned Markets generate +2 clams each
  if (world.tech.tradeRoutes && world.frameCount % 60 === 0) {
    for (let i = 0; i < buildings.length; i++) {
      const bid = buildings[i];
      if (EntityTypeTag.kind[bid] !== EntityKind.Market) continue;
      if (FactionTag.faction[bid] !== Faction.Player) continue;
      if (Health.current[bid] <= 0 || Building.progress[bid] < 100) continue;
      world.resources.clams += 2;
      world.stats.totalClamsEarned += 2;
      world.particles.push({
        x: Position.x[bid] + (world.gameRng.next() - 0.5) * 16,
        y: Position.y[bid] - 8,
        vx: (world.gameRng.next() - 0.5) * 0.5,
        vy: -world.gameRng.next() * 0.8,
        life: 12,
        color: '#fde047',
        size: 2,
      });
    }
  }

  // ---- Fishing Hut passive income ----
  // Every 300 frames, completed player-owned FishingHuts generate +5 clams
  if (world.frameCount % 300 === 0) {
    for (let i = 0; i < buildings.length; i++) {
      const bid = buildings[i];
      if (EntityTypeTag.kind[bid] !== EntityKind.FishingHut) continue;
      if (FactionTag.faction[bid] !== Faction.Player) continue;
      if (Health.current[bid] <= 0 || Building.progress[bid] < 100) continue;
      world.resources.clams += 5;
      world.stats.totalClamsEarned += 5;
      world.particles.push({
        x: Position.x[bid] + (world.gameRng.next() - 0.5) * 20,
        y: Position.y[bid] - 5,
        vx: (world.gameRng.next() - 0.5) * 1,
        vy: -world.gameRng.next() * 1,
        life: 15,
        color: '#38bdf8',
        size: 2,
      });
    }
  }
}
