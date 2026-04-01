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
 *   2. Build (60-120s): Place burrow for housing, then armory, FishingHut, HerbalistHut
 *   3. Army (120-240s): Train brawlers, snipers, shieldbearers, catapults; research techs
 *   4. Attack (240-300s): Use auto-attack toggle instead of manual attack-move
 *   5. Late Game (300s+): Research advanced techs, build expansion Lodge,
 *      train Swimmers for scouting, enable all auto-behaviors
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
import * as store from '@/ui/store';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type GovernorPhase = 'economy' | 'build' | 'army' | 'attack' | 'lateGame';

export interface GovernorSnapshot {
  gameSeconds: number;
  phase: GovernorPhase;
  clams: number;
  twigs: number;
  pearls: number;
  food: number;
  maxFood: number;
  gatherers: number;
  army: number;
  buildings: number;
  enemyNests: number;
  techResearched: string[];
  evolutionTier: number;
  champions: number;
  autoBehaviors: {
    gatherer: boolean;
    combat: boolean;
    healer: boolean;
    scout: boolean;
  };
}

// ---------------------------------------------------------------------------
// Helpers — DOM interaction
// ---------------------------------------------------------------------------

function delay(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
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
  const canvas = document.getElementById('game-canvas') as HTMLCanvasElement;
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

function getPlayerFishingHuts(): number[] {
  return getPlayerEntities(EntityKind.FishingHut);
}

function getPlayerHerbalistHuts(): number[] {
  return getPlayerEntities(EntityKind.HerbalistHut);
}

function getPlayerLodges(): number[] {
  return getPlayerEntities(EntityKind.Lodge);
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
async function selectEntity(eid: number, additive = false): Promise<void> {
  if (additive) {
    // Hold shift for additive selection
    const container = document.getElementById('game-container');
    if (container) {
      const { x, y } = worldToScreen(Position.x[eid], Position.y[eid]);
      const downEv = new PointerEvent('pointerdown', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
        shiftKey: true,
      });
      const upEv = new PointerEvent('pointerup', {
        bubbles: true,
        cancelable: true,
        clientX: x,
        clientY: y,
        button: 0,
        pointerId: 1,
        pointerType: 'mouse',
        shiftKey: true,
      });
      container.dispatchEvent(downEv);
      container.dispatchEvent(upEv);
    }
  } else {
    clickWorld(Position.x[eid], Position.y[eid]);
  }
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
    await selectEntity(gatherers[0]);
    await delay(100);

    if (clickActionButton('Burrow')) {
      await delay(200);
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
      clickWorld(lodgeX - 100, lodgeY + 50);
      await delay(200);
    }
  }

  // Build FishingHut for pearl income (if herbalMedicine tech researched and none exist)
  if (
    getPlayerFishingHuts().length === 0 &&
    w.resources.clams >= 150 &&
    w.resources.twigs >= 100 &&
    gatherers.length > 0
  ) {
    await selectEntity(gatherers[0]);
    await delay(100);

    if (clickActionButton('FishingHut') || clickActionButton('Fishing Hut')) {
      await delay(200);
      clickWorld(lodgeX + 150, lodgeY - 50);
      await delay(200);
    }
  }

  // Build HerbalistHut for healing aura (if herbalMedicine researched and none exist)
  if (
    getPlayerHerbalistHuts().length === 0 &&
    w.tech.herbalMedicine &&
    w.resources.clams >= 100 &&
    w.resources.twigs >= 80 &&
    gatherers.length > 0
  ) {
    await selectEntity(gatherers[0]);
    await delay(100);

    if (clickActionButton('HerbalistHut') || clickActionButton('Herbalist Hut')) {
      await delay(200);
      clickWorld(lodgeX - 150, lodgeY - 50);
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

  // Train combat units from the armory
  if (armory) {
    await selectEntity(armory);
    await delay(100);

    const armyUnits = getPlayerArmyUnits();
    const brawlers = armyUnits.filter((e) => EntityTypeTag.kind[e] === EntityKind.Brawler);
    const snipers = armyUnits.filter((e) => EntityTypeTag.kind[e] === EntityKind.Sniper);
    const shieldbearers = armyUnits.filter(
      (e) => EntityTypeTag.kind[e] === EntityKind.Shieldbearer,
    );
    const catapults = armyUnits.filter((e) => EntityTypeTag.kind[e] === EntityKind.Catapult);

    if (w.resources.food + 1 <= w.resources.maxFood) {
      // Train Shieldbearers if Iron Shell is researched and we have few
      if (
        w.tech.ironShell &&
        shieldbearers.length < 2 &&
        w.resources.clams >= 150 &&
        w.resources.twigs >= 100
      ) {
        clickActionButton('Shieldbearer');
        await delay(100);
      }
      // Train Catapults if Siege Works is researched and we have few
      else if (
        w.tech.siegeWorks &&
        catapults.length < 2 &&
        w.resources.clams >= 200 &&
        w.resources.twigs >= 150
      ) {
        clickActionButton('Catapult');
        await delay(100);
      }
      // Alternate between brawlers and snipers
      else if (brawlers.length <= snipers.length) {
        if (w.resources.clams >= 100 && w.resources.twigs >= 50) {
          clickActionButton('Brawler');
          await delay(100);
        }
      } else {
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

    // Research Iron Shell for Shieldbearers
    if (
      w.tech.sharpSticks &&
      !w.tech.ironShell &&
      w.resources.clams >= 300 &&
      w.resources.twigs >= 200
    ) {
      clickActionButton('Iron Shell');
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

  // Enable auto-combat toggle (covers attack + defend)
  if (!store.autoCombatEnabled.value) {
    store.autoCombatEnabled.value = true;
  }

  // If army is large enough, also manually direct them at the nearest nest
  const nests = getEnemyNests();
  if (armyUnits.length >= 6 && nests.length > 0) {
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

    const armyBtn = document.getElementById('select-army-btn');
    if (armyBtn) {
      armyBtn.click();
      await delay(150);
    }

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

async function lateGamePhase(): Promise<void> {
  const w = game.world;

  // Enable all auto-behaviors (per-role)
  if (!store.autoGathererEnabled.value) store.autoGathererEnabled.value = true;
  if (!store.autoCombatEnabled.value) store.autoCombatEnabled.value = true;
  if (!store.autoHealerEnabled.value) store.autoHealerEnabled.value = true;
  if (!store.autoScoutEnabled.value) store.autoScoutEnabled.value = true;

  // Research advanced techs in priority order
  const lodge = getPlayerLodge();

  // Eagle Eye -> Siege Works -> Hardened Shells
  if (
    w.tech.sharpSticks &&
    !w.tech.eagleEye &&
    w.resources.clams >= 400 &&
    w.resources.twigs >= 300
  ) {
    if (lodge) {
      await selectEntity(lodge);
      await delay(100);
      clickActionButton('Eagle Eye');
      await delay(100);
    }
  }

  if (
    w.tech.eagleEye &&
    !w.tech.siegeWorks &&
    w.resources.clams >= 400 &&
    w.resources.twigs >= 350
  ) {
    if (lodge) {
      await selectEntity(lodge);
      await delay(100);
      clickActionButton('Siege Works');
      await delay(100);
    }
  }

  if (
    w.tech.eagleEye &&
    !w.tech.hardenedShells &&
    w.resources.clams >= 500 &&
    w.resources.twigs >= 400
  ) {
    if (lodge) {
      await selectEntity(lodge);
      await delay(100);
      clickActionButton('Hardened Shells');
      await delay(100);
    }
  }

  // Research aquatic training + cartography for scouting
  if (!w.tech.herbalMedicine && w.resources.clams >= 100 && w.resources.twigs >= 80) {
    if (lodge) {
      await selectEntity(lodge);
      await delay(100);
      clickActionButton('Herbal Medicine');
      await delay(100);
    }
  }

  if (
    w.tech.herbalMedicine &&
    !w.tech.aquaticTraining &&
    w.resources.clams >= 150 &&
    w.resources.twigs >= 100
  ) {
    if (lodge) {
      await selectEntity(lodge);
      await delay(100);
      clickActionButton('Aquatic Training');
      await delay(100);
    }
  }

  if (!w.tech.cartography && w.resources.clams >= 150 && w.resources.twigs >= 100) {
    if (lodge) {
      await selectEntity(lodge);
      await delay(100);
      clickActionButton('Cartography');
      await delay(100);
    }
  }

  // Build expansion Lodge if we only have one and can afford it
  const lodges = getPlayerLodges();
  if (lodges.length === 1 && w.resources.clams >= 300 && w.resources.twigs >= 200) {
    const gatherers = getPlayerEntities(EntityKind.Gatherer);
    if (gatherers.length > 0 && lodge) {
      await selectEntity(gatherers[0]);
      await delay(100);
      const lodgeX = Position.x[lodge];
      const lodgeY = Position.y[lodge];
      if (clickActionButton('Lodge')) {
        await delay(200);
        clickWorld(lodgeX + 200, lodgeY + 100);
        await delay(200);
      }
    }
  }

  // Train Swimmers for scouting if aquaticTraining is researched
  if (w.tech.aquaticTraining) {
    const swimmers = getPlayerEntities(EntityKind.Swimmer);
    if (swimmers.length < 2 && w.resources.food + 1 <= w.resources.maxFood && lodge) {
      await selectEntity(lodge);
      await delay(100);
      if (w.resources.clams >= 80 && w.resources.twigs >= 60) {
        clickActionButton('Swimmer');
        await delay(100);
      }
    }
  }

  // Continue training army from armory
  const armory = getPlayerArmory();
  if (armory && w.resources.food + 1 <= w.resources.maxFood) {
    await selectEntity(armory);
    await delay(100);
    const armyUnits = getPlayerArmyUnits();
    const catapults = armyUnits.filter((e) => EntityTypeTag.kind[e] === EntityKind.Catapult);

    if (
      w.tech.siegeWorks &&
      catapults.length < 3 &&
      w.resources.clams >= 200 &&
      w.resources.twigs >= 150
    ) {
      clickActionButton('Catapult');
      await delay(100);
    } else if (w.resources.clams >= 100 && w.resources.twigs >= 50) {
      clickActionButton('Brawler');
      await delay(100);
    }
  }

  // Direct army at nests
  const nests = getEnemyNests();
  const armyUnits = getPlayerArmyUnits();
  if (armyUnits.length >= 4 && nests.length > 0) {
    const armyBtn = document.getElementById('select-army-btn');
    if (armyBtn) {
      armyBtn.click();
      await delay(150);
    }

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
    await commandTarget(nearestNest);
    await delay(200);
  }

  // Build more burrows if near food cap
  if (w.resources.food + 2 >= w.resources.maxFood && w.resources.twigs >= 100) {
    const gatherers = getPlayerEntities(EntityKind.Gatherer);
    if (lodge && gatherers.length > 0) {
      await selectEntity(gatherers[0]);
      await delay(100);
      const burrowCount = getPlayerBurrows().length;
      if (clickActionButton('Burrow')) {
        await delay(200);
        const lodgeX = Position.x[lodge];
        const lodgeY = Position.y[lodge];
        const angle = (burrowCount * Math.PI) / 3;
        clickWorld(lodgeX + Math.cos(angle) * 140, lodgeY + Math.sin(angle) * 140);
        await delay(200);
      }
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
  if (s < 300) return 'attack';
  return 'lateGame';
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
    pearls: w.resources.pearls,
    food: w.resources.food,
    maxFood: w.resources.maxFood,
    gatherers: getPlayerEntities(EntityKind.Gatherer).length,
    army: getPlayerArmyUnits().length,
    buildings: getPlayerEntities().filter((eid) => hasComponent(w.ecs, eid, IsBuilding)).length,
    enemyNests: getEnemyNests().length,
    techResearched: Object.entries(w.tech)
      .filter(([, v]) => v)
      .map(([k]) => k),
    evolutionTier: w.enemyEvolution.tier,
    champions: w.championEnemies.size,
    autoBehaviors: {
      gatherer: store.autoGathererEnabled.value,
      combat: store.autoCombatEnabled.value,
      healer: store.autoHealerEnabled.value,
      scout: store.autoScoutEnabled.value,
    },
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
    case 'lateGame':
      await lateGamePhase();
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
