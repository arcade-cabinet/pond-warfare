/**
 * Action Panel — Armory Tech Buttons
 *
 * Tech research buttons for the Armory: ironShell, siegeWorks,
 * battleRoar, cunningTraps, camouflage.
 */

import { TECH_UPGRADES } from '@/config/tech-tree';
import type { GameWorld } from '@/ecs/world';
import type { ActionButtonDef } from '@/ui/action-panel';

import { canAffordTech, discountedTechCost, purchaseTech, techRequiresLabel } from './tech-helpers';

export function buildArmoryTechButtons(w: GameWorld): ActionButtonDef[] {
  const btns: ActionButtonDef[] = [];

  const isTech = TECH_UPGRADES.ironShell;
  const isCost = discountedTechCost(w, isTech.clamCost, isTech.twigCost);
  btns.push({
    title: isTech.name,
    cost: `${isCost.clams}C ${isCost.twigs}T`,
    hotkey: 'Z',
    affordable: canAffordTech(w, 'ironShell'),
    description: isTech.description,
    category: 'tech',
    costBreakdown: { clams: isCost.clams, twigs: isCost.twigs },
    requires: techRequiresLabel('ironShell'),
    onClick: () => {
      purchaseTech(w, 'ironShell');
    },
  });
  const swTech = TECH_UPGRADES.siegeWorks;
  const swPearlCost = swTech.pearlCost ?? 0;
  const swCost = discountedTechCost(w, swTech.clamCost, swTech.twigCost);
  btns.push({
    title: swTech.name,
    cost: `${swCost.clams}C ${swCost.twigs}T${swPearlCost > 0 ? ` ${swPearlCost}P` : ''}`,
    hotkey: 'X',
    affordable: canAffordTech(w, 'siegeWorks'),
    description: swTech.description,
    category: 'tech',
    costBreakdown: { clams: swCost.clams, twigs: swCost.twigs, pearls: swPearlCost },
    requires: techRequiresLabel('siegeWorks'),
    onClick: () => {
      purchaseTech(w, 'siegeWorks');
    },
  });
  const brTech = TECH_UPGRADES.battleRoar;
  const brCost = discountedTechCost(w, brTech.clamCost, brTech.twigCost);
  btns.push({
    title: brTech.name,
    cost: `${brCost.clams}C ${brCost.twigs}T`,
    hotkey: 'C',
    affordable: canAffordTech(w, 'battleRoar'),
    description: brTech.description,
    category: 'tech',
    costBreakdown: { clams: brCost.clams, twigs: brCost.twigs },
    requires: techRequiresLabel('battleRoar'),
    onClick: () => {
      purchaseTech(w, 'battleRoar');
    },
  });
  const ctTech = TECH_UPGRADES.cunningTraps;
  const ctCost = discountedTechCost(w, ctTech.clamCost, ctTech.twigCost);
  btns.push({
    title: ctTech.name,
    cost: `${ctCost.clams}C ${ctCost.twigs}T`,
    hotkey: 'V',
    affordable: canAffordTech(w, 'cunningTraps'),
    description: ctTech.description,
    category: 'tech',
    costBreakdown: { clams: ctCost.clams, twigs: ctCost.twigs },
    requires: techRequiresLabel('cunningTraps'),
    onClick: () => {
      purchaseTech(w, 'cunningTraps');
    },
  });
  const camoTech = TECH_UPGRADES.camouflage;
  const camoCost = discountedTechCost(w, camoTech.clamCost, camoTech.twigCost);
  btns.push({
    title: camoTech.name,
    cost: `${camoCost.clams}C ${camoCost.twigs}T`,
    hotkey: 'B',
    affordable: canAffordTech(w, 'camouflage'),
    description: camoTech.description,
    category: 'tech',
    costBreakdown: { clams: camoCost.clams, twigs: camoCost.twigs },
    requires: techRequiresLabel('camouflage'),
    onClick: () => {
      purchaseTech(w, 'camouflage');
    },
  });

  return btns;
}
