/**
 * Wave Spawner
 *
 * Role-based enemy spawning orchestrator. Maps enemies.json role keys
 * to EntityKinds, tracks spawned unit roles for behavior systems, and
 * delegates position calculation to spawn-positions.ts.
 *
 * Pattern functions live in spawn-patterns.ts (10 patterns).
 * Position/edge logic lives in spawn-positions.ts.
 */

import type { EventTemplate } from '@/config/v3-types';
import { spawnEntity } from '@/ecs/archetypes';
import type { GameWorld } from '@/ecs/world';
import { EntityKind, Faction } from '@/types';
import { getSpawnPositions } from './spawn-positions';

// -- Enemy Role to EntityKind Mapping -------------------------------------

export type EnemyBehaviorRole =
  | 'fighter'
  | 'raider'
  | 'support_enemy'
  | 'recon_enemy'
  | 'sapper_enemy'
  | 'saboteur_enemy';

/** Maps enemies.json role keys to the EntityKind used to spawn that unit. */
const ENEMY_ROLE_TO_KIND: Record<EnemyBehaviorRole, EntityKind> = {
  fighter: EntityKind.Gator,
  raider: EntityKind.Snake,
  support_enemy: EntityKind.VenomSnake,
  recon_enemy: EntityKind.FlyingHeron,
  sapper_enemy: EntityKind.SiegeTurtle,
  saboteur_enemy: EntityKind.SwampDrake,
};

// -- Role Tracking --------------------------------------------------------

/** Tag spawned units with their role for behavior systems. */
const spawnedUnitRoles = new Map<number, EnemyBehaviorRole>();

/** Get the normalized behavior role assigned to a spawned enemy unit. */
export function getEnemyBehaviorRole(eid: number): EnemyBehaviorRole | undefined {
  return spawnedUnitRoles.get(eid);
}

/** Remove role tracking when an entity dies. */
export function clearEnemyUnitRole(eid: number): void {
  spawnedUnitRoles.delete(eid);
}

/** Reset all role tracking (call on new match). */
export function resetSpawnedRoles(): void {
  spawnedUnitRoles.clear();
  lastSpawnCenter = null;
}

// -- Spawn Center Tracking ------------------------------------------------

/** Last spawn center for event alert zoom-to-action. */
let lastSpawnCenter: { x: number; y: number } | null = null;

/** Get the centroid of the last wave spawn for camera zoom-to-action. */
export function getLastSpawnCenter(): { x: number; y: number } | null {
  return lastSpawnCenter;
}

// -- Event Spawning -------------------------------------------------------

/**
 * Spawn enemies for an event using role-based composition from enemies.json,
 * with panel-aware spawn positions from panels.json.
 */
export function spawnEventEnemies(world: GameWorld, template: EventTemplate): void {
  const composition = template.enemy_composition;
  if (!composition || Object.keys(composition).length === 0) return;

  const unitsToSpawn: { role: EnemyBehaviorRole; kind: EntityKind }[] = [];
  for (const [enemyType, count] of Object.entries(composition)) {
    const role = enemyType as EnemyBehaviorRole;
    const kind = ENEMY_ROLE_TO_KIND[role] ?? EntityKind.Gator;
    for (let i = 0; i < count; i++) {
      unitsToSpawn.push({ role, kind });
    }
  }

  const positions = getSpawnPositions(world, unitsToSpawn.length, template.spawn_pattern);

  // Record spawn centroid for event alert zoom-to-action
  if (positions.length > 0) {
    let cx = 0;
    let cy = 0;
    for (const p of positions) {
      cx += p.x;
      cy += p.y;
    }
    lastSpawnCenter = { x: cx / positions.length, y: cy / positions.length };
  }

  for (let i = 0; i < unitsToSpawn.length; i++) {
    const { role, kind } = unitsToSpawn[i];
    const pos = positions[i];
    const eid = spawnEntity(world, kind, pos.x, pos.y, Faction.Enemy);
    if (eid >= 0) {
      spawnedUnitRoles.set(eid, role);
    }
  }

  if (template.boss) {
    const bossRole = template.boss.type as EnemyBehaviorRole;
    const bossKind = ENEMY_ROLE_TO_KIND[bossRole] ?? EntityKind.BossCroc;
    const bossPositions = getSpawnPositions(world, 1);
    const bossPos = bossPositions[0];
    const bossEid = spawnEntity(world, bossKind, bossPos.x, bossPos.y, Faction.Enemy);
    if (bossEid >= 0) {
      spawnedUnitRoles.set(bossEid, bossRole);
    }
  }
}
