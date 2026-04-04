/**
 * Branch-Themed Cosmetics System
 *
 * Applies visual particle trails to player units when a full upgrade
 * category (all tiers) hits threshold. Multiple themes can be active simultaneously.
 *
 * Themes:
 * - gathering: leaf/vine particle trail (brown/green)
 * - combat: red damage spark particles
 * - defense: shield shimmer overlay (silver)
 * - utility: green healing glow particles
 * - economy: gold shimmer particles
 * - siege: dark mist/shadow trail (purple/black)
 *
 * Particles are subtle (small size, low opacity) to not obscure gameplay.
 * Runs every 30 frames to keep performance impact minimal.
 */

import { query } from 'bitecs';
import { EntityTypeTag, FactionTag, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { BUILDING_KINDS, Faction } from '@/types';
import { spawnParticle } from '@/utils/particles';
import { countBranchTechs, type UpgradeCategory } from './shrine';

/** Number of upgrades per category required for cosmetic activation. */
const FULL_BRANCH_COUNT = 5;

/** Particle spawn interval in frames. */
const COSMETIC_INTERVAL = 30;

/** Particle configs per branch theme. */
interface CosmeticParticle {
  color: string;
  vx: (r: () => number) => number;
  vy: (r: () => number) => number;
  life: number;
  size: number;
}

const BRANCH_PARTICLES: Record<UpgradeCategory, CosmeticParticle> = {
  gathering: {
    color: '#92400e',
    vx: (r) => (r() - 0.5) * 0.8,
    vy: (r) => -0.3 - r() * 0.5,
    life: 25,
    size: 1.5,
  },
  combat: {
    color: '#ef4444',
    vx: (r) => (r() - 0.5) * 1.2,
    vy: (r) => -0.8 - r() * 0.5,
    life: 15,
    size: 1,
  },
  defense: {
    color: '#cbd5e1',
    vx: (r) => (r() - 0.5) * 0.3,
    vy: (r) => -0.2 - r() * 0.3,
    life: 30,
    size: 2,
  },
  utility: {
    color: '#4ade80',
    vx: (r) => (r() - 0.5) * 0.4,
    vy: (r) => -0.5 - r() * 0.3,
    life: 20,
    size: 2,
  },
  economy: {
    color: '#facc15',
    vx: (r) => (r() - 0.5) * 0.5,
    vy: (r) => -0.4 - r() * 0.3,
    life: 25,
    size: 1.5,
  },
  siege: {
    color: '#4c1d95',
    vx: (r) => (r() - 0.5) * 0.6,
    vy: (r) => 0.2 + r() * 0.3,
    life: 35,
    size: 2,
  },
};

export function branchCosmeticsSystem(world: GameWorld): void {
  if (world.frameCount % COSMETIC_INTERVAL !== 0) return;

  // Determine which categories have enough upgrades
  const counts = countBranchTechs(world.tech);
  const activeBranches: UpgradeCategory[] = [];
  for (const [branch, count] of Object.entries(counts) as [UpgradeCategory, number][]) {
    if (count >= FULL_BRANCH_COUNT) {
      activeBranches.push(branch);
    }
  }

  if (activeBranches.length === 0) return;

  // Apply particle effects to all player units (not buildings)
  const entities = query(world.ecs, [FactionTag, Position, EntityTypeTag]);
  for (const eid of entities) {
    if (FactionTag.faction[eid] !== Faction.Player) continue;
    if (BUILDING_KINDS.has(EntityTypeTag.kind[eid])) continue;

    const x = Position.x[eid];
    const y = Position.y[eid];

    // Spawn one particle per active branch (subtle, not overwhelming)
    const r = () => world.gameRng.next();
    for (const branch of activeBranches) {
      const config = BRANCH_PARTICLES[branch];
      // Only spawn with 50% probability per unit to keep it subtle
      if (r() > 0.5) continue;
      spawnParticle(
        world,
        x + (r() - 0.5) * 16,
        y + (r() - 0.5) * 8,
        config.vx(r),
        config.vy(r),
        config.life,
        config.color,
        config.size,
      );
    }
  }
}
