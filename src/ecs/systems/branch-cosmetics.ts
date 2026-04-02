/**
 * Branch-Themed Cosmetics System
 *
 * Applies visual particle trails to player units when a full tech branch
 * (all 5 techs) is researched. Multiple themes can be active simultaneously.
 *
 * Themes:
 * - Lodge: leaf/vine particle trail (brown/green)
 * - Nature: green healing glow particles
 * - Warfare: red damage spark particles
 * - Fortifications: shield shimmer overlay (silver)
 * - Shadow: dark mist/shadow trail (purple/black)
 *
 * Particles are subtle (small size, low opacity) to not obscure gameplay.
 * Runs every 30 frames to keep performance impact minimal.
 */

import { query } from 'bitecs';
import type { TechBranch } from '@/config/tech-tree';
import { EntityTypeTag, FactionTag, Position } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { BUILDING_KINDS, Faction } from '@/types';
import { spawnParticle } from '@/utils/particles';
import { countBranchTechs } from './shrine';

/** Number of techs per branch required for cosmetic activation. */
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

const BRANCH_PARTICLES: Record<TechBranch, CosmeticParticle> = {
  lodge: {
    color: '#92400e',
    vx: (r) => (r() - 0.5) * 0.8,
    vy: (r) => -0.3 - r() * 0.5,
    life: 25,
    size: 1.5,
  },
  nature: {
    color: '#4ade80',
    vx: (r) => (r() - 0.5) * 0.4,
    vy: (r) => -0.5 - r() * 0.3,
    life: 20,
    size: 2,
  },
  warfare: {
    color: '#ef4444',
    vx: (r) => (r() - 0.5) * 1.2,
    vy: (r) => -0.8 - r() * 0.5,
    life: 15,
    size: 1,
  },
  fortifications: {
    color: '#cbd5e1',
    vx: (r) => (r() - 0.5) * 0.3,
    vy: (r) => -0.2 - r() * 0.3,
    life: 30,
    size: 2,
  },
  shadow: {
    color: '#4c1d95',
    vx: (r) => (r() - 0.5) * 0.6,
    vy: (r) => 0.2 + r() * 0.3,
    life: 35,
    size: 2,
  },
};

export function branchCosmeticsSystem(world: GameWorld): void {
  if (world.frameCount % COSMETIC_INTERVAL !== 0) return;

  // Determine which branches are fully researched
  const counts = countBranchTechs(world.tech);
  const activeBranches: TechBranch[] = [];
  for (const [branch, count] of Object.entries(counts) as [TechBranch, number][]) {
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
