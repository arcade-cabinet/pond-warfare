/**
 * Governor Phases: Economy, Build, Army
 *
 * Early-to-mid game phases that handle resource gathering,
 * base construction, and initial army training.
 */

import { EntityTypeTag, Position } from '@/ecs/components';
import { game } from '@/game';
import { EntityKind } from '@/types';
import { clickActionButton, clickWorld, commandTarget, delay, selectEntity } from './helpers';
import {
  getIdleGatherers,
  getNearestResource,
  getPlayerArmory,
  getPlayerArmyUnits,
  getPlayerBurrows,
  getPlayerEntities,
  getPlayerFishingHuts,
  getPlayerHerbalistHuts,
  getPlayerLodge,
} from './queries';

export async function economyPhase(): Promise<void> {
  const w = game.world;
  const gatherers = getPlayerEntities(EntityKind.Gatherer);
  const lodge = getPlayerLodge();

  // Train gatherers if we have fewer than 6 and can afford it
  if (gatherers.length < 6 && lodge && w.resources.clams >= 50) {
    if (w.resources.food + 1 <= w.resources.maxFood) {
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

export async function buildPhase(): Promise<void> {
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

  // Build FishingHut for pearl income
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

export async function armyPhase(): Promise<void> {
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
      if (
        w.tech.ironShell &&
        shieldbearers.length < 2 &&
        w.resources.clams >= 150 &&
        w.resources.twigs >= 100
      ) {
        clickActionButton('Shieldbearer');
        await delay(100);
      } else if (
        w.tech.siegeWorks &&
        catapults.length < 2 &&
        w.resources.clams >= 200 &&
        w.resources.twigs >= 150
      ) {
        clickActionButton('Catapult');
        await delay(100);
      } else if (brawlers.length <= snipers.length) {
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
