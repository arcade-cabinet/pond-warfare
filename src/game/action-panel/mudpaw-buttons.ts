/**
 * Action Panel — Mudpaw Build Buttons
 *
 * Building placement buttons shown when a Mudpaw is selected.
 */

import { ENTITY_DEFS } from '@/config/entity-defs';
import type { GameWorld } from '@/ecs/world';
import { EntityKind } from '@/types';
import type { ActionButtonDef } from '@/ui/action-panel';

export function buildMudpawButtons(w: GameWorld): ActionButtonDef[] {
  const btns: ActionButtonDef[] = [];

  const lodgeDef = ENTITY_DEFS[EntityKind.Lodge];
  btns.push({
    title: 'Lodge',
    cost: `${lodgeDef.fishCost}F ${lodgeDef.logCost}L`,
    hotkey: 'Q',
    affordable:
      w.resources.fish >= (lodgeDef.fishCost ?? 0) && w.resources.logs >= (lodgeDef.logCost ?? 0),
    description: 'Expansion building. +4 food cap, resource drop-off point.',
    category: 'build',
    costBreakdown: { fish: lodgeDef.fishCost, logs: lodgeDef.logCost },
    onClick: () => {
      w.placingBuilding = 'lodge';
    },
  });
  const burrowDef = ENTITY_DEFS[EntityKind.Burrow];
  btns.push({
    title: 'Burrow',
    cost: `${burrowDef.logCost}L`,
    hotkey: 'W',
    affordable: w.resources.logs >= (burrowDef.logCost ?? 0),
    description: 'Housing structure. +4 food cap.',
    category: 'build',
    costBreakdown: { fish: burrowDef.fishCost, logs: burrowDef.logCost },
    onClick: () => {
      w.placingBuilding = 'burrow';
    },
  });
  const armoryDef = ENTITY_DEFS[EntityKind.Armory];
  btns.push({
    title: 'Armory',
    cost: `${armoryDef.fishCost}F ${armoryDef.logCost}L`,
    hotkey: 'E',
    affordable:
      w.resources.fish >= (armoryDef.fishCost ?? 0) && w.resources.logs >= (armoryDef.logCost ?? 0),
    description: 'Military logistics wing. Unlocks late-run battlefield support and fortification pressure.',
    category: 'build',
    costBreakdown: { fish: armoryDef.fishCost, logs: armoryDef.logCost },
    onClick: () => {
      w.placingBuilding = 'armory';
    },
  });
  const towerDef = ENTITY_DEFS[EntityKind.Tower];
  btns.push({
    title: 'Tower',
    cost: `${towerDef.fishCost}F ${towerDef.logCost}L`,
    hotkey: 'R',
    affordable:
      w.resources.fish >= (towerDef.fishCost ?? 0) && w.resources.logs >= (towerDef.logCost ?? 0),
    description: 'Defensive structure. Attacks nearby enemies automatically.',
    category: 'build',
    costBreakdown: { fish: towerDef.fishCost, logs: towerDef.logCost },
    onClick: () => {
      w.placingBuilding = 'tower';
    },
  });
  if (w.tech.eagleEye) {
    const wtDef = ENTITY_DEFS[EntityKind.Watchtower];
    btns.push({
      title: 'Watchtower',
      cost: `${wtDef.fishCost}F ${wtDef.logCost}L`,
      hotkey: 'T',
      affordable:
        w.resources.fish >= (wtDef.fishCost ?? 0) && w.resources.logs >= (wtDef.logCost ?? 0),
      description: 'Extended-range defensive tower.',
      category: 'build',
      costBreakdown: { fish: wtDef.fishCost, logs: wtDef.logCost },
      requires: 'Requires: Eagle Eye',
      onClick: () => {
        w.placingBuilding = 'watchtower';
      },
    });
  }
  const wallDef = ENTITY_DEFS[EntityKind.Wall];
  btns.push({
    title: 'Wall',
    cost: `${wallDef.logCost}L`,
    hotkey: 'Y',
    affordable: w.resources.logs >= (wallDef.logCost ?? 0),
    description: 'Defensive barrier. Blocks enemy movement.',
    category: 'build',
    costBreakdown: { fish: wallDef.fishCost, logs: wallDef.logCost },
    onClick: () => {
      w.placingBuilding = 'wall';
    },
  });
  if (w.tech.cartography) {
    const spDef = ENTITY_DEFS[EntityKind.ScoutPost];
    btns.push({
      title: 'Lookout Post',
      cost: `${spDef.fishCost}F ${spDef.logCost}L`,
      hotkey: 'U',
      affordable:
        w.resources.fish >= (spDef.fishCost ?? 0) && w.resources.logs >= (spDef.logCost ?? 0),
      description: 'Recon outpost. Reveals a large area of the map.',
      category: 'build',
      costBreakdown: { fish: spDef.fishCost, logs: spDef.logCost },
      requires: 'Requires: Cartography',
      onClick: () => {
        w.placingBuilding = 'scout_post';
      },
    });
  }
  const marketDef = ENTITY_DEFS[EntityKind.Market];
  btns.push({
    title: 'Market',
    cost: `${marketDef.fishCost}F ${marketDef.logCost}L`,
    hotkey: 'P',
    affordable:
      w.resources.fish >= (marketDef.fishCost ?? 0) && w.resources.logs >= (marketDef.logCost ?? 0),
    description: 'Trade building. Convert resources at favorable rates.',
    category: 'build',
    costBreakdown: { fish: marketDef.fishCost, logs: marketDef.logCost },
    onClick: () => {
      w.placingBuilding = 'market';
    },
  });
  const fhDef = ENTITY_DEFS[EntityKind.FishingHut];
  btns.push({
    title: 'Fishing Hut',
    cost: `${fhDef.fishCost}F ${fhDef.logCost}L`,
    hotkey: 'I',
    affordable:
      w.resources.fish >= (fhDef.fishCost ?? 0) && w.resources.logs >= (fhDef.logCost ?? 0),
    description: 'Passive income building. Generates +5 fish every 5 seconds. +2 food cap.',
    category: 'build',
    costBreakdown: { fish: fhDef.fishCost, logs: fhDef.logCost },
    onClick: () => {
      w.placingBuilding = 'fishing_hut';
    },
  });
  const hhDef = ENTITY_DEFS[EntityKind.HerbalistHut];
  btns.push({
    title: 'Herbalist Hut',
    cost: `${hhDef.fishCost}F ${hhDef.logCost}L`,
    hotkey: 'O',
    affordable:
      w.resources.fish >= (hhDef.fishCost ?? 0) && w.resources.logs >= (hhDef.logCost ?? 0),
    description: 'Heals all player units within range by 2 HP every 2 seconds.',
    category: 'build',
    costBreakdown: { fish: hhDef.fishCost, logs: hhDef.logCost },
    onClick: () => {
      w.placingBuilding = 'herbalist_hut';
    },
  });

  return btns;
}
