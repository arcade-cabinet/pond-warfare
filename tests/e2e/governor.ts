/**
 * Player Governor for E2E Testing
 *
 * A state-machine AI that plays the game through mouse clicks only.
 * Reads game state from the imported game singleton, performs all
 * actions by dispatching pointer events on DOM elements (canvas clicks
 * for world interactions, button clicks for UI actions).
 *
 * Phases:
 *   1. Economy (0-60s game time): Train gatherers, assign to resources
 *   2. Build (60-120s): Place burrow for housing, then armory
 *   3. Army (120-240s): Train brawlers and snipers, research Sharp Sticks
 *   4. Attack (240s+): Select army, attack-move toward enemy nests
 */

import { hasComponent, query } from 'bitecs';
import {
  Building,
  EntityTypeTag,
  FactionTag,
  Health,
  IsBuilding,
  IsResource,
  Position,
  UnitStateMachine,
} from '@/ecs/components';
import { game } from '@/game';
import { EntityKind, Faction, UnitState } from '@/types';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GovernorPhase = 'economy' | 'build' | 'army' | 'attack';

export interface GovernorSnapshot {
  gameSeconds: number;
  phase: GovernorPhase;
  clams: number;
  twigs: number;
  food: number;
  maxFood: number;
  gatherers: number;
  army: number;
  buildings: number;
  enemyNests: number;
  techResearched: string[];
}

// ---------------------------------------------------------------------------
// Helpers — DOM interaction
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Get the game canvas element. */
function getCanvas(): HTMLCanvasElement {
  return document.getElementById('game-canvas') as HTMLCanvasElement;
}

/**
 * Dispatch a synthetic pointer event on an element at (clientX, clientY).
 * This is the primary mechanism for simulating mouse input on the canvas.
 */
function firePointer(
  el: HTMLElement,
  type: 'pointerdown' | 'pointermove' | 'pointerup',
  clientX: number,
  clientY: number,
  button = 0,
) {
  const ev = new PointerEvent(type, {
    bubbles: true,
    cancelable: true,
    clientX,
    clientY,
    button,
    pointerId: 1,
    pointerType: 'mouse',
  });
  el.dispatchEvent(ev);
}

/**
 * Simulate a full click (down + up) at screen coordinates on the game container.
 * The container is the parent of the canvas and receives pointer events.
 */
function clickScreen(screenX: number, screenY: number, button = 0): void {
  const container = document.getElementById('game-container');
  if (!container) return;
  firePointer(container, 'pointerdown', screenX, screenY, button);
  firePointer(container, 'pointerup', screenX, screenY, button);
}

/**
 * Convert world coordinates to screen (client) coordinates
 * accounting for camera position and the canvas offset in the page.
 */
function worldToScreen(worldX: number, worldY: number): { x: number; y: number } {
  const canvas = getCanvas();
  const rect = canvas.getBoundingClientRect();
  const w = game.world;
  return {
    x: rect.left + (worldX - w.camX),
    y: rect.top + (worldY - w.camY),
  };
}

/** Left-click at a world position. */
function clickWorld(worldX: number, worldY: number): void {
  const { x, y } = worldToScreen(worldX, worldY);
  clickScreen(x, y, 0);
}

/** Right-click at a world position (context command). */
function rightClickWorld(worldX: number, worldY: number): void {
  const { x, y } = worldToScreen(worldX, worldY);
  clickScreen(x, y, 2);
}

/**
 * Click an action button by its title text.
 * The action panel contains buttons with class "action-btn" whose inner text
 * starts with the button title.
 */
function clickActionButton(title: string): boolean {
  const panel = document.getElementById('action-panel');
  if (!panel) return false;
  const buttons = panel.querySelectorAll<HTMLButtonElement>('.action-btn');
  for (const btn of buttons) {
    if (btn.textContent?.includes(title) && !btn.disabled) {
      btn.click();
      return true;
    }
  }
  return false;
}

// ---------------------------------------------------------------------------
// Helpers — ECS queries
// ---------------------------------------------------------------------------

function getPlayerEntities(kind?: EntityKind): number[] {
  const w = game.world;
  const all = query(w.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  return Array.from(all).filter((eid) => {
    if (FactionTag.faction[eid] !== Faction.Player) return false;
    if (Health.current[eid] <= 0) return false;
    if (kind !== undefined && EntityTypeTag.kind[eid] !== kind) return false;
    return true;
  });
}

function getEnemyNests(): number[] {
  const w = game.world;
  const all = query(w.ecs, [Position, Health, FactionTag, EntityTypeTag, IsBuilding]);
  return Array.from(all).filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Enemy &&
      EntityTypeTag.kind[eid] === EntityKind.PredatorNest &&
      Health.current[eid] > 0,
  );
}

function getIdleGatherers(): number[] {
  return getPlayerEntities(EntityKind.Gatherer).filter(
    (eid) => UnitStateMachine.state[eid] === UnitState.Idle,
  );
}

function getNearestResource(wx: number, wy: number): number | null {
  const w = game.world;
  const resources = query(w.ecs, [Position, Health, FactionTag, IsResource]);
  let best: number | null = null;
  let bestDist = Infinity;
  for (const eid of resources) {
    if (Health.current[eid] <= 0) continue;
    const dx = Position.x[eid] - wx;
    const dy = Position.y[eid] - wy;
    const dist = dx * dx + dy * dy;
    if (dist < bestDist) {
      bestDist = dist;
      best = eid;
    }
  }
  return best;
}

function getPlayerLodge(): number | null {
  const lodges = getPlayerEntities(EntityKind.Lodge);
  return lodges.length > 0 ? lodges[0] : null;
}

function getPlayerArmory(completedOnly = true): number | null {
  const armories = getPlayerEntities(EntityKind.Armory);
  for (const eid of armories) {
    if (!completedOnly || Building.progress[eid] >= 100) return eid;
  }
  return null;
}

function getPlayerBurrows(): number[] {
  return getPlayerEntities(EntityKind.Burrow);
}

function getPlayerArmyUnits(): number[] {
  const w = game.world;
  const all = query(w.ecs, [Position, Health, FactionTag, EntityTypeTag]);
  return Array.from(all).filter(
    (eid) =>
      FactionTag.faction[eid] === Faction.Player &&
      Health.current[eid] > 0 &&
      !hasComponent(w.ecs, eid, IsBuilding) &&
      !hasComponent(w.ecs, eid, IsResource) &&
      EntityTypeTag.kind[eid] !== EntityKind.Gatherer,
  );
}

/** Game time in seconds (60 frames = 1 second at 1x speed). */
function gameSeconds(): number {
  return game.world.frameCount / 60;
}

// ---------------------------------------------------------------------------
// Governor Phase Logic
// ---------------------------------------------------------------------------

/**
 * Select an entity by left-clicking its world position.
 * Waits a tick for the selection to register.
 */
async function selectEntity(eid: number): Promise<void> {
  clickWorld(Position.x[eid], Position.y[eid]);
  await delay(50);
}

/**
 * Send selected units to a world position via right-click.
 */
export async function commandMoveTo(worldX: number, worldY: number): Promise<void> {
  rightClickWorld(worldX, worldY);
  await delay(50);
}

/**
 * Send selected units to attack/interact with an entity via right-click.
 */
async function commandTarget(eid: number): Promise<void> {
  rightClickWorld(Position.x[eid], Position.y[eid]);
  await delay(50);
}

/** Deselect all by clicking empty ground. */
export async function deselectAll(): Promise<void> {
  // Click far from any entity
  const w = game.world;
  clickWorld(w.camX + w.viewWidth / 2, w.camY + 20);
  await delay(50);
}

// ---------------------------------------------------------------------------
// Phase handlers
// ---------------------------------------------------------------------------

async function economyPhase(): Promise<void> {
  const w = game.world;
  const gatherers = getPlayerEntities(EntityKind.Gatherer);
  const lodge = getPlayerLodge();

  // Train gatherers if we have fewer than 6 and can afford it
  if (gatherers.length < 6 && lodge && w.resources.clams >= 50) {
    if (w.resources.food + 1 <= w.resources.maxFood) {
      // Select lodge and click Gatherer button
      await selectEntity(lodge);
      await delay(100);
      clickActionButton('Gatherer');
      await delay(100);
    }
  }

  // Assign idle gatherers to nearby resources
  const idles = getIdleGatherers();
  for (const gid of idles) {
    const resource = getNearestResource(Position.x[gid], Position.y[gid]);
    if (resource) {
      await selectEntity(gid);
      await delay(80);
      await commandTarget(resource);
      await delay(80);
    }
  }
}

async function buildPhase(): Promise<void> {
  const w = game.world;
  const lodge = getPlayerLodge();
  if (!lodge) return;

  const lodgeX = Position.x[lodge];
  const lodgeY = Position.y[lodge];

  const burrows = getPlayerBurrows();
  const armory = getPlayerArmory();
  const gatherers = getPlayerEntities(EntityKind.Gatherer);

  // Need housing first — build a burrow if we don't have one
  if (burrows.length === 0 && w.resources.twigs >= 100 && gatherers.length > 0) {
    // Select a gatherer
    await selectEntity(gatherers[0]);
    await delay(100);

    // Click Burrow button to enter placement mode
    if (clickActionButton('Burrow')) {
      await delay(200);
      // Place near lodge
      clickWorld(lodgeX + 100, lodgeY + 50);
      await delay(200);
    }
  }

  // Build armory if we don't have one (including in-progress) and can afford it
  if (
    !armory &&
    !getPlayerArmory(false) &&
    burrows.length > 0 &&
    w.resources.clams >= 250 &&
    w.resources.twigs >= 150 &&
    gatherers.length > 0
  ) {
    await selectEntity(gatherers[0]);
    await delay(100);

    if (clickActionButton('Armory')) {
      await delay(200);
      // Place near lodge on opposite side
      clickWorld(lodgeX - 100, lodgeY + 50);
      await delay(200);
    }
  }

  // Keep assigning idle gatherers to resources
  const idles = getIdleGatherers();
  for (const gid of idles.slice(0, 2)) {
    const resource = getNearestResource(Position.x[gid], Position.y[gid]);
    if (resource) {
      await selectEntity(gid);
      await delay(80);
      await commandTarget(resource);
      await delay(80);
    }
  }
}

async function armyPhase(): Promise<void> {
  const w = game.world;
  const armory = getPlayerArmory();

  // Train brawlers and snipers from the armory
  if (armory) {
    await selectEntity(armory);
    await delay(100);

    // Alternate between brawlers and snipers
    const armyUnits = getPlayerArmyUnits();
    const brawlers = armyUnits.filter((e) => EntityTypeTag.kind[e] === EntityKind.Brawler);
    const snipers = armyUnits.filter((e) => EntityTypeTag.kind[e] === EntityKind.Sniper);

    if (w.resources.food + 1 <= w.resources.maxFood) {
      if (brawlers.length <= snipers.length) {
        // Train a brawler (100C 50T)
        if (w.resources.clams >= 100 && w.resources.twigs >= 50) {
          clickActionButton('Brawler');
          await delay(100);
        }
      } else {
        // Train a sniper (80C 80T)
        if (w.resources.clams >= 80 && w.resources.twigs >= 80) {
          clickActionButton('Sniper');
          await delay(100);
        }
      }
    }

    // Research Sharp Sticks if affordable
    if (w.resources.clams >= 300 && w.resources.twigs >= 200 && !w.tech.sharpSticks) {
      clickActionButton('Sharp Sticks');
      await delay(100);
    }
  }

  // Keep idle gatherers gathering
  const idles = getIdleGatherers();
  for (const gid of idles.slice(0, 2)) {
    const resource = getNearestResource(Position.x[gid], Position.y[gid]);
    if (resource) {
      await selectEntity(gid);
      await delay(80);
      await commandTarget(resource);
      await delay(80);
    }
  }

  // Build another burrow if needed and we're near food cap
  if (w.resources.food + 2 >= w.resources.maxFood && w.resources.twigs >= 100) {
    const lodge = getPlayerLodge();
    const gatherers = getPlayerEntities(EntityKind.Gatherer);
    if (lodge && gatherers.length > 0) {
      await selectEntity(gatherers[0]);
      await delay(100);
      const burrowCount = getPlayerBurrows().length;
      if (clickActionButton('Burrow')) {
        await delay(200);
        const lodgeX = Position.x[lodge];
        const lodgeY = Position.y[lodge];
        // Offset placement based on how many burrows we have
        const angle = (burrowCount * Math.PI) / 3;
        clickWorld(lodgeX + Math.cos(angle) * 120, lodgeY + Math.sin(angle) * 120);
        await delay(200);
      }
    }
  }
}

async function attackPhase(): Promise<void> {
  const w = game.world;
  const armyUnits = getPlayerArmyUnits();
  const nests = getEnemyNests();

  // If we have enough army, send them to attack the nearest nest
  if (armyUnits.length >= 4 && nests.length > 0) {
    // Find the nearest nest to our lodge
    const lodge = getPlayerLodge();
    const baseX = lodge ? Position.x[lodge] : 1280;
    const baseY = lodge ? Position.y[lodge] : 1280;

    let nearestNest = nests[0];
    let nearestDist = Infinity;
    for (const nid of nests) {
      const dx = Position.x[nid] - baseX;
      const dy = Position.y[nid] - baseY;
      const dist = dx * dx + dy * dy;
      if (dist < nearestDist) {
        nearestDist = dist;
        nearestNest = nid;
      }
    }

    // Select all army units by box-selecting or clicking each
    // Use the select-army button if visible
    const armyBtn = document.getElementById('select-army-btn');
    if (armyBtn) {
      armyBtn.click();
      await delay(150);
    } else {
      // Fall back to selecting units manually
      for (const uid of armyUnits.slice(0, 12)) {
        await selectEntity(uid);
        await delay(30);
      }
    }

    // Right-click on the enemy nest to attack
    await commandTarget(nearestNest);
    await delay(200);
  }

  // Continue training units if we have resources
  const armory = getPlayerArmory();
  if (armory && w.resources.food + 1 <= w.resources.maxFood) {
    await selectEntity(armory);
    await delay(100);
    if (w.resources.clams >= 100 && w.resources.twigs >= 50) {
      clickActionButton('Brawler');
      await delay(100);
    } else if (w.resources.clams >= 80 && w.resources.twigs >= 80) {
      clickActionButton('Sniper');
      await delay(100);
    }
  }

  // Keep gatherers busy
  const idles = getIdleGatherers();
  for (const gid of idles.slice(0, 2)) {
    const resource = getNearestResource(Position.x[gid], Position.y[gid]);
    if (resource) {
      await selectEntity(gid);
      await delay(60);
      await commandTarget(resource);
      await delay(60);
    }
  }
}

// ---------------------------------------------------------------------------
// Governor main loop
// ---------------------------------------------------------------------------

/**
 * Determine the current governor phase based on game time.
 */
function currentPhase(): GovernorPhase {
  const s = gameSeconds();
  if (s < 60) return 'economy';
  if (s < 120) return 'build';
  if (s < 240) return 'army';
  return 'attack';
}

/**
 * Take a snapshot of the current game state for diagnostic reporting.
 */
export function takeSnapshot(): GovernorSnapshot {
  const w = game.world;
  return {
    gameSeconds: Math.round(gameSeconds()),
    phase: currentPhase(),
    clams: w.resources.clams,
    twigs: w.resources.twigs,
    food: w.resources.food,
    maxFood: w.resources.maxFood,
    gatherers: getPlayerEntities(EntityKind.Gatherer).length,
    army: getPlayerArmyUnits().length,
    buildings: getPlayerEntities().filter((eid) => hasComponent(w.ecs, eid, IsBuilding)).length,
    enemyNests: getEnemyNests().length,
    techResearched: Object.entries(w.tech)
      .filter(([, v]) => v)
      .map(([k]) => k),
  };
}

/**
 * Run one governor tick. Call this periodically (every ~500ms real time)
 * to let the governor take its next action.
 */
export async function tick(): Promise<void> {
  const phase = currentPhase();

  switch (phase) {
    case 'economy':
      await economyPhase();
      break;
    case 'build':
      await buildPhase();
      break;
    case 'army':
      await armyPhase();
      break;
    case 'attack':
      await attackPhase();
      break;
  }
}

/**
 * Run the governor continuously until the callback returns true (stop condition)
 * or the timeout is reached. Ticks every `intervalMs` milliseconds.
 */
export async function run(opts: {
  stopWhen?: () => boolean;
  timeoutMs?: number;
  intervalMs?: number;
  onTick?: (snapshot: GovernorSnapshot) => void;
}): Promise<void> {
  const { stopWhen, timeoutMs = 300_000, intervalMs = 600, onTick } = opts;
  const start = Date.now();

  while (Date.now() - start < timeoutMs) {
    if (stopWhen?.()) break;
    if (game.world.state !== 'playing') break;

    await tick();

    const snapshot = takeSnapshot();
    onTick?.(snapshot);

    await delay(intervalMs);
  }
}
