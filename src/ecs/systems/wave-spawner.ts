/**
 * Wave Spawner (T7/T25)
 *
 * Role-based enemy spawning and panel-aware spawn positions.
 * Extracted from match-event-runner.ts for 300 LOC compliance.
 *
 * - Maps enemies.json role keys to EntityKinds
 * - Tracks spawned unit roles for behavior systems (raider, healer, sapper)
 * - Computes spawn positions from panel progression
 */

import type { EventTemplate } from '@/config/v3-types';
import { WORLD_WIDTH } from '@/constants';
import { spawnEntity } from '@/ecs/archetypes';
import type { GameWorld } from '@/ecs/world';
import type { PanelId } from '@/game/panel-grid';
import { EntityKind, Faction } from '@/types';

// ── Enemy Role to EntityKind Mapping ─────────────────────────────

/** Maps enemies.json role keys to the EntityKind used to spawn that unit. */
const ENEMY_ROLE_TO_KIND: Record<string, EntityKind> = {
  fighter: EntityKind.Gator,
  raider: EntityKind.Snake,
  healer: EntityKind.VenomSnake,
  scout_enemy: EntityKind.FlyingHeron,
  sapper_enemy: EntityKind.SiegeTurtle,
  saboteur_enemy: EntityKind.SwampDrake,
};

/** Tag spawned units with their role for behavior systems. */
const spawnedUnitRoles = new Map<number, string>();

/** Get the role assigned to a spawned enemy unit (for behavior systems). */
export function getEnemyUnitRole(eid: number): string | undefined {
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

/** Last spawn center for event alert zoom-to-action (T27). */
let lastSpawnCenter: { x: number; y: number } | null = null;

/** Get the centroid of the last wave spawn for camera zoom-to-action. */
export function getLastSpawnCenter(): { x: number; y: number } | null {
  return lastSpawnCenter;
}

// ── Spawn Position Calculation (T25) ─────────────────────────────

interface SpawnPosition {
  x: number;
  y: number;
}

/**
 * Get spawn positions based on panel progression (T25).
 * Stage 1: top of panel 5 only.
 * Stage 2-3: top of unlocked top-row panels (1, 2, 3).
 * Stage 4+: top of panels 1, 2, 3.
 * Stage 5+: also sides of panels 4 and 6.
 */
function getSpawnPositions(world: GameWorld, count: number): SpawnPosition[] {
  const grid = world.panelGrid;
  if (!grid) {
    const mapW = world.worldWidth || WORLD_WIDTH;
    return Array.from({ length: count }, () => ({
      x: mapW * 0.2 + Math.random() * mapW * 0.6,
      y: 20 + Math.random() * 40,
    }));
  }

  const activePanels = grid.getActivePanels();
  const spawnEdges: SpawnPosition[] = [];

  const topRowPanels: PanelId[] = [1, 2, 3];
  const sideLeftPanel: PanelId = 4;
  const sideRightPanel: PanelId = 6;

  // Top edges of unlocked top-row panels
  for (const pid of topRowPanels) {
    if (activePanels.includes(pid)) {
      const bounds = grid.getPanelBounds(pid);
      for (let i = 0; i < 3; i++) {
        spawnEdges.push({
          x: bounds.x + bounds.width * 0.2 + Math.random() * bounds.width * 0.6,
          y: bounds.y + 20 + Math.random() * 30,
        });
      }
    }
  }

  // If no top-row panels are unlocked, spawn from top of panel 5
  if (spawnEdges.length === 0) {
    const bounds = grid.getPanelBounds(5);
    for (let i = 0; i < 3; i++) {
      spawnEdges.push({
        x: bounds.x + bounds.width * 0.2 + Math.random() * bounds.width * 0.6,
        y: bounds.y + 20 + Math.random() * 30,
      });
    }
  }

  // Side edges of panels 4 and 6 (stage 5+)
  if (activePanels.includes(sideLeftPanel)) {
    const bounds = grid.getPanelBounds(sideLeftPanel);
    for (let i = 0; i < 2; i++) {
      spawnEdges.push({
        x: bounds.x + 20 + Math.random() * 30,
        y: bounds.y + bounds.height * 0.2 + Math.random() * bounds.height * 0.6,
      });
    }
  }
  if (activePanels.includes(sideRightPanel)) {
    const bounds = grid.getPanelBounds(sideRightPanel);
    for (let i = 0; i < 2; i++) {
      spawnEdges.push({
        x: bounds.x + bounds.width - 20 - Math.random() * 30,
        y: bounds.y + bounds.height * 0.2 + Math.random() * bounds.height * 0.6,
      });
    }
  }

  const result: SpawnPosition[] = [];
  for (let i = 0; i < count; i++) {
    const edge = spawnEdges[i % spawnEdges.length];
    result.push({
      x: edge.x + (Math.random() - 0.5) * 40,
      y: edge.y + (Math.random() - 0.5) * 20,
    });
  }
  return result;
}

// ── Role-Based Enemy Spawning ────────────────────────────────────

/**
 * Spawn enemies for an event using role-based composition from enemies.json,
 * with panel-aware spawn positions from panels.json.
 */
export function spawnEventEnemies(world: GameWorld, template: EventTemplate): void {
  const composition = template.enemy_composition;
  if (!composition || Object.keys(composition).length === 0) return;

  const unitsToSpawn: { role: string; kind: EntityKind }[] = [];
  for (const [enemyType, count] of Object.entries(composition)) {
    const kind = ENEMY_ROLE_TO_KIND[enemyType] ?? EntityKind.Gator;
    for (let i = 0; i < count; i++) {
      unitsToSpawn.push({ role: enemyType, kind });
    }
  }

  const positions = getSpawnPositions(world, unitsToSpawn.length);

  // Record spawn centroid for event alert zoom-to-action (T27)
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
    const bossKind = ENEMY_ROLE_TO_KIND[template.boss.type] ?? EntityKind.BossCroc;
    const bossPositions = getSpawnPositions(world, 1);
    const bossPos = bossPositions[0];
    const bossEid = spawnEntity(world, bossKind, bossPos.x, bossPos.y, Faction.Enemy);
    if (bossEid >= 0) {
      spawnedUnitRoles.set(bossEid, template.boss.type);
    }
  }
}
