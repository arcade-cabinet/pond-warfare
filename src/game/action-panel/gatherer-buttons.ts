/**
 * Action Panel — Gatherer Build Buttons
 *
 * Building placement buttons shown when a Gatherer is selected.
 */

import { ENTITY_DEFS } from '@/config/entity-defs';
import type { GameWorld } from '@/ecs/world';
import { EntityKind } from '@/types';
import type { ActionButtonDef } from '@/ui/action-panel';

export function buildGathererButtons(w: GameWorld): ActionButtonDef[] {
  const btns: ActionButtonDef[] = [];

  const lodgeDef = ENTITY_DEFS[EntityKind.Lodge];
  btns.push({
    title: 'Lodge',
    cost: `${lodgeDef.clamCost}C ${lodgeDef.twigCost}T`,
    hotkey: 'Q',
    affordable:
      w.resources.clams >= (lodgeDef.clamCost ?? 0) &&
      w.resources.twigs >= (lodgeDef.twigCost ?? 0),
    description: 'Expansion building. +4 food cap, resource drop-off point.',
    category: 'build',
    costBreakdown: { clams: lodgeDef.clamCost, twigs: lodgeDef.twigCost },
    onClick: () => {
      w.placingBuilding = 'lodge';
    },
  });
  const burrowDef = ENTITY_DEFS[EntityKind.Burrow];
  btns.push({
    title: 'Burrow',
    cost: `${burrowDef.twigCost}T`,
    hotkey: 'W',
    affordable: w.resources.twigs >= (burrowDef.twigCost ?? 0),
    description: 'Housing structure. +4 food cap.',
    category: 'build',
    costBreakdown: { clams: burrowDef.clamCost, twigs: burrowDef.twigCost },
    onClick: () => {
      w.placingBuilding = 'burrow';
    },
  });
  const armoryDef = ENTITY_DEFS[EntityKind.Armory];
  btns.push({
    title: 'Armory',
    cost: `${armoryDef.clamCost}C ${armoryDef.twigCost}T`,
    hotkey: 'E',
    affordable:
      w.resources.clams >= (armoryDef.clamCost ?? 0) &&
      w.resources.twigs >= (armoryDef.twigCost ?? 0),
    description: 'Military production. Trains combat units and researches upgrades.',
    category: 'build',
    costBreakdown: { clams: armoryDef.clamCost, twigs: armoryDef.twigCost },
    onClick: () => {
      w.placingBuilding = 'armory';
    },
  });
  const towerDef = ENTITY_DEFS[EntityKind.Tower];
  btns.push({
    title: 'Tower',
    cost: `${towerDef.clamCost}C ${towerDef.twigCost}T`,
    hotkey: 'R',
    affordable:
      w.resources.clams >= (towerDef.clamCost ?? 0) &&
      w.resources.twigs >= (towerDef.twigCost ?? 0),
    description: 'Defensive structure. Attacks nearby enemies automatically.',
    category: 'build',
    costBreakdown: { clams: towerDef.clamCost, twigs: towerDef.twigCost },
    onClick: () => {
      w.placingBuilding = 'tower';
    },
  });
  if (w.tech.eagleEye) {
    const wtDef = ENTITY_DEFS[EntityKind.Watchtower];
    btns.push({
      title: 'Watchtower',
      cost: `${wtDef.clamCost}C ${wtDef.twigCost}T`,
      hotkey: 'T',
      affordable:
        w.resources.clams >= (wtDef.clamCost ?? 0) && w.resources.twigs >= (wtDef.twigCost ?? 0),
      description: 'Extended-range defensive tower.',
      category: 'build',
      costBreakdown: { clams: wtDef.clamCost, twigs: wtDef.twigCost },
      requires: 'Requires: Eagle Eye',
      onClick: () => {
        w.placingBuilding = 'watchtower';
      },
    });
  }
  const wallDef = ENTITY_DEFS[EntityKind.Wall];
  btns.push({
    title: 'Wall',
    cost: `${wallDef.twigCost}T`,
    hotkey: 'Y',
    affordable: w.resources.twigs >= (wallDef.twigCost ?? 0),
    description: 'Defensive barrier. Blocks enemy movement.',
    category: 'build',
    costBreakdown: { clams: wallDef.clamCost, twigs: wallDef.twigCost },
    onClick: () => {
      w.placingBuilding = 'wall';
    },
  });
  if (w.tech.cartography) {
    const spDef = ENTITY_DEFS[EntityKind.ScoutPost];
    btns.push({
      title: 'Scout Post',
      cost: `${spDef.clamCost}C ${spDef.twigCost}T`,
      hotkey: 'U',
      affordable:
        w.resources.clams >= (spDef.clamCost ?? 0) && w.resources.twigs >= (spDef.twigCost ?? 0),
      description: 'Reveals a large area of the map.',
      category: 'build',
      costBreakdown: { clams: spDef.clamCost, twigs: spDef.twigCost },
      requires: 'Requires: Cartography',
      onClick: () => {
        w.placingBuilding = 'scout_post';
      },
    });
  }
  const fhDef = ENTITY_DEFS[EntityKind.FishingHut];
  btns.push({
    title: 'Fishing Hut',
    cost: `${fhDef.clamCost}C ${fhDef.twigCost}T`,
    hotkey: 'I',
    affordable:
      w.resources.clams >= (fhDef.clamCost ?? 0) && w.resources.twigs >= (fhDef.twigCost ?? 0),
    description: 'Passive income building. Generates +5 clams every 5 seconds. +2 food cap.',
    category: 'build',
    costBreakdown: { clams: fhDef.clamCost, twigs: fhDef.twigCost },
    onClick: () => {
      w.placingBuilding = 'fishing_hut';
    },
  });
  const hhDef = ENTITY_DEFS[EntityKind.HerbalistHut];
  btns.push({
    title: 'Herbalist Hut',
    cost: `${hhDef.clamCost}C ${hhDef.twigCost}T`,
    hotkey: 'O',
    affordable:
      w.resources.clams >= (hhDef.clamCost ?? 0) && w.resources.twigs >= (hhDef.twigCost ?? 0),
    description: 'Heals all player units within range by 2 HP every 2 seconds.',
    category: 'build',
    costBreakdown: { clams: hhDef.clamCost, twigs: hhDef.twigCost },
    onClick: () => {
      w.placingBuilding = 'herbalist_hut';
    },
  });

  return btns;
}
