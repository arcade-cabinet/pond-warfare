/**
 * Governor Phases: Attack, Late Game
 *
 * Mid-to-late game phases that handle army deployment, auto-behaviors,
 * advanced tech research across all 5 branches, and expansion.
 */

import { EntityTypeTag, Position } from '@/ecs/components';
import { game } from '@/game';
import { EntityKind } from '@/types';
import * as store from '@/ui/store';
import { clickActionButton, clickWorld, commandTarget, delay, selectEntity } from './helpers';
import {
  getEnemyNests,
  getIdleGatherers,
  getNearestResource,
  getPlayerArmory,
  getPlayerArmyUnits,
  getPlayerBurrows,
  getPlayerEntities,
  getPlayerLodge,
  getPlayerLodges,
} from './queries';

export async function attackPhase(): Promise<void> {
  const w = game.world;
  const armyUnits = getPlayerArmyUnits();

  // Enable auto-combat toggle (covers attack + defend)
  if (!store.autoCombatEnabled.value) {
    store.autoCombatEnabled.value = true;
  }

  // If army is large enough, manually direct them at the nearest nest
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

export async function lateGamePhase(): Promise<void> {
  const w = game.world;

  // Enable all auto-behaviors (per-role)
  if (!store.autoGathererEnabled.value) store.autoGathererEnabled.value = true;
  if (!store.autoCombatEnabled.value) store.autoCombatEnabled.value = true;
  if (!store.autoHealerEnabled.value) store.autoHealerEnabled.value = true;
  if (!store.autoScoutEnabled.value) store.autoScoutEnabled.value = true;

  const lodge = getPlayerLodge();

  // Research techs across all 5 branches in priority order
  await researchTechs(lodge);

  // Build expansion Lodge if we only have one and can afford it
  await buildExpansion(lodge);

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
  await trainLateArmy();

  // Direct army at nests
  await directArmyAtNests(lodge);

  // Build more burrows if near food cap
  await buildBurrowsIfNeeded(lodge);
}

/** Research advanced techs across all 5 branches. */
async function researchTechs(lodge: number | null): Promise<void> {
  const w = game.world;
  const armory = getPlayerArmory();

  // --- Lodge branch (researched at Lodge) ---
  if (lodge) {
    if (!w.tech.cartography && w.resources.clams >= 100 && w.resources.twigs >= 50) {
      await selectEntity(lodge);
      await delay(100);
      clickActionButton('Cartography');
      await delay(100);
    }
    if (!w.tech.tidalHarvest && w.resources.clams >= 100 && w.resources.twigs >= 75) {
      await selectEntity(lodge);
      await delay(100);
      clickActionButton('Tidal Harvest');
      await delay(100);
    }
  }

  // --- Nature branch (researched at Lodge) ---
  if (lodge) {
    if (!w.tech.herbalMedicine && w.resources.clams >= 100 && w.resources.twigs >= 75) {
      await selectEntity(lodge);
      await delay(100);
      clickActionButton('Herbal Medicine');
      await delay(100);
    }
    if (
      w.tech.herbalMedicine &&
      !w.tech.aquaticTraining &&
      w.resources.clams >= 150 &&
      w.resources.twigs >= 100
    ) {
      await selectEntity(lodge);
      await delay(100);
      clickActionButton('Aquatic Training');
      await delay(100);
    }
  }

  // --- Warfare branch (researched at Armory) ---
  if (armory) {
    if (
      w.tech.sharpSticks &&
      !w.tech.eagleEye &&
      w.resources.clams >= 200 &&
      w.resources.twigs >= 150
    ) {
      await selectEntity(armory);
      await delay(100);
      clickActionButton('Eagle Eye');
      await delay(100);
    }
    if (
      w.tech.eagleEye &&
      !w.tech.siegeWorks &&
      w.resources.clams >= 300 &&
      w.resources.twigs >= 250
    ) {
      await selectEntity(armory);
      await delay(100);
      clickActionButton('Siege Works');
      await delay(100);
    }
  }

  // --- Fortifications branch (researched at Armory) ---
  if (armory) {
    if (
      w.tech.eagleEye &&
      !w.tech.hardenedShells &&
      w.resources.clams >= 400 &&
      w.resources.twigs >= 300
    ) {
      await selectEntity(armory);
      await delay(100);
      clickActionButton('Hardened Shells');
      await delay(100);
    }
  }

  // --- Shadow branch (researched at Armory) ---
  if (armory) {
    if (!w.tech.swiftPaws && w.resources.clams >= 100 && w.resources.twigs >= 50) {
      await selectEntity(armory);
      await delay(100);
      clickActionButton('Swift Paws');
      await delay(100);
    }
    if (
      w.tech.swiftPaws &&
      !w.tech.cunningTraps &&
      w.resources.clams >= 150 &&
      w.resources.twigs >= 100
    ) {
      await selectEntity(armory);
      await delay(100);
      clickActionButton('Cunning Traps');
      await delay(100);
    }
  }
}

async function buildExpansion(lodge: number | null): Promise<void> {
  const w = game.world;
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
}

async function trainLateArmy(): Promise<void> {
  const w = game.world;
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
}

async function directArmyAtNests(lodge: number | null): Promise<void> {
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
}

async function buildBurrowsIfNeeded(lodge: number | null): Promise<void> {
  const w = game.world;
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
