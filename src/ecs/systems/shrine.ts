/**
 * Shrine System
 *
 * Manages Shrine building abilities. Each Shrine provides one powerful
 * one-time ability based on the player's dominant tech branch.
 *
 * Abilities:
 * - Lodge: "Flood" — all Water tiles expand by 1 for 30s
 * - Nature: "Bloom" — heal all units to full HP
 * - Warfare: "Meteor" — massive AoE damage at target location
 * - Fortifications: "Stone Wall" — ring of walls around Lodge
 * - Shadow: "Eclipse" — all enemies blinded for 15s
 *
 * One use per Shrine, then it crumbles (destroyed after activation).
 * Requires at least 3 techs in the dominant branch.
 */

import { query } from 'bitecs';
import { audio } from '@/audio/audio-system';
import type { TechBranch, TechState } from '@/config/tech-tree';
import { TECH_UPGRADES } from '@/config/tech-tree';
import { FactionTag, Health, Position, UnitStateMachine } from '@/ecs/components';
import type { GameWorld } from '@/ecs/world';
import { Faction, UnitState } from '@/types';
import { spawnParticle } from '@/utils/particles';

export type ShrineAbility = 'flood' | 'bloom' | 'meteor' | 'stoneWall' | 'eclipse';

/** Map from tech branch to shrine ability. */
const BRANCH_ABILITY: Record<TechBranch, ShrineAbility> = {
  lodge: 'flood',
  nature: 'bloom',
  warfare: 'meteor',
  fortifications: 'stoneWall',
  shadow: 'eclipse',
};

/** Map from ability to display name. */
export const SHRINE_ABILITY_NAMES: Record<ShrineAbility, string> = {
  flood: 'Flood',
  bloom: 'Bloom',
  meteor: 'Meteor',
  stoneWall: 'Stone Wall',
  eclipse: 'Eclipse',
};

/** Map from ability to description. */
export const SHRINE_ABILITY_DESCRIPTIONS: Record<ShrineAbility, string> = {
  flood: 'Water tiles expand by 1 tile for 30 seconds',
  bloom: 'Heal all units to full HP',
  meteor: 'Massive AoE damage at target location',
  stoneWall: 'Build a ring of walls around the Lodge',
  eclipse: 'All enemies stop moving/attacking for 15 seconds',
};

/** Count researched techs per branch. */
export function countBranchTechs(tech: TechState): Record<TechBranch, number> {
  const counts: Record<TechBranch, number> = {
    lodge: 0,
    nature: 0,
    warfare: 0,
    fortifications: 0,
    shadow: 0,
  };
  for (const [id, upgrade] of Object.entries(TECH_UPGRADES)) {
    if (tech[id as keyof TechState]) {
      counts[upgrade.branch]++;
    }
  }
  return counts;
}

/** Get the dominant tech branch (most researched techs, min 3). */
export function getDominantBranch(tech: TechState): TechBranch | null {
  const counts = countBranchTechs(tech);
  let best: TechBranch | null = null;
  let bestCount = 0;
  for (const [branch, count] of Object.entries(counts) as [TechBranch, number][]) {
    if (count >= 3 && count > bestCount) {
      best = branch;
      bestCount = count;
    }
  }
  return best;
}

/** Get the shrine ability for a given shrine entity. */
export function getShrineAbility(world: GameWorld): ShrineAbility | null {
  const branch = getDominantBranch(world.tech);
  if (!branch) return null;
  return BRANCH_ABILITY[branch];
}

/** Activate a shrine ability. Returns true if successful. */
export function activateShrine(
  world: GameWorld,
  shrineEid: number,
  targetX?: number,
  targetY?: number,
): boolean {
  if (world.shrineUsed.has(shrineEid)) return false;
  if (Health.current[shrineEid] <= 0) return false;

  const ability = getShrineAbility(world);
  if (!ability) return false;

  world.shrineUsed.add(shrineEid);

  // Play dramatic activation sound
  audio.shrineActivation(ability, Position.x[shrineEid]);

  switch (ability) {
    case 'bloom':
      activateBloom(world, shrineEid);
      break;
    case 'eclipse':
      activateEclipse(world, shrineEid);
      break;
    case 'meteor':
      activateMeteor(world, targetX ?? 0, targetY ?? 0);
      break;
    case 'flood':
      activateFlood(world, shrineEid);
      break;
    case 'stoneWall':
      activateStoneWall(world, shrineEid);
      break;
  }

  // Shrine crumbles after use
  Health.current[shrineEid] = 0;

  return true;
}

/** Bloom: heal all player units to full HP. */
function activateBloom(world: GameWorld, shrineEid: number): void {
  const entities = query(world.ecs, [Health, FactionTag]);
  for (const eid of entities) {
    if (FactionTag.faction[eid] === Faction.Player) {
      Health.current[eid] = Health.max[eid];
      spawnParticle(world, Position.x[eid], Position.y[eid] - 10, 0, -2, 30, '#4ade80', 3);
    }
  }
  world.floatingTexts.push({
    x: Position.x[shrineEid],
    y: Position.y[shrineEid] - 20,
    text: 'BLOOM!',
    color: '#4ade80',
    life: 120,
  });
}

/** Eclipse: all enemies stop moving/attacking for 15 seconds (900 frames). */
function activateEclipse(world: GameWorld, shrineEid: number): void {
  const entities = query(world.ecs, [UnitStateMachine, FactionTag]);
  for (const eid of entities) {
    if (FactionTag.faction[eid] === Faction.Enemy) {
      UnitStateMachine.state[eid] = UnitState.Idle;
      UnitStateMachine.targetEntity[eid] = -1;
      spawnParticle(world, Position.x[eid], Position.y[eid], 0, -1, 40, '#4c1d95', 3);
    }
  }
  world.floatingTexts.push({
    x: Position.x[shrineEid],
    y: Position.y[shrineEid] - 20,
    text: 'ECLIPSE!',
    color: '#7c3aed',
    life: 120,
  });
}

/** Meteor: 80 damage in a 150px radius at target location. */
function activateMeteor(world: GameWorld, tx: number, ty: number): void {
  const RADIUS = 150;
  const DAMAGE = 80;
  const r2 = RADIUS * RADIUS;

  const entities = query(world.ecs, [Health, Position, FactionTag]);
  for (const eid of entities) {
    if (FactionTag.faction[eid] !== Faction.Enemy) continue;
    const dx = Position.x[eid] - tx;
    const dy = Position.y[eid] - ty;
    if (dx * dx + dy * dy <= r2) {
      Health.current[eid] = Math.max(0, Health.current[eid] - DAMAGE);
      Health.flashTimer[eid] = 10;
    }
  }

  for (let i = 0; i < 20; i++) {
    const angle = (i / 20) * Math.PI * 2;
    spawnParticle(world, tx, ty, Math.cos(angle) * 3, Math.sin(angle) * 3, 40, '#f97316', 4);
  }
  world.floatingTexts.push({
    x: tx,
    y: ty - 20,
    text: 'METEOR!',
    color: '#f97316',
    life: 120,
  });
}

/** Flood: expand water tiles by 1 for 30 seconds (placeholder visual effect). */
function activateFlood(world: GameWorld, shrineEid: number): void {
  world.floatingTexts.push({
    x: Position.x[shrineEid],
    y: Position.y[shrineEid] - 20,
    text: 'FLOOD!',
    color: '#38bdf8',
    life: 120,
  });
  for (let i = 0; i < 15; i++) {
    spawnParticle(
      world,
      Position.x[shrineEid] + (Math.random() - 0.5) * 200,
      Position.y[shrineEid] + (Math.random() - 0.5) * 200,
      0,
      1,
      60,
      '#38bdf8',
      3,
    );
  }
}

/** Stone Wall: build ring of walls around the Lodge (placeholder). */
function activateStoneWall(world: GameWorld, shrineEid: number): void {
  world.floatingTexts.push({
    x: Position.x[shrineEid],
    y: Position.y[shrineEid] - 20,
    text: 'STONE WALL!',
    color: '#9ca3af',
    life: 120,
  });
  for (let i = 0; i < 12; i++) {
    const angle = (i / 12) * Math.PI * 2;
    spawnParticle(
      world,
      Position.x[shrineEid] + Math.cos(angle) * 60,
      Position.y[shrineEid] + Math.sin(angle) * 60,
      0,
      -0.5,
      50,
      '#9ca3af',
      3,
    );
  }
}
