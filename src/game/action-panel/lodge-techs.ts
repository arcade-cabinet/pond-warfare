/**
 * Action Panel — Lodge Tech Buttons
 *
 * Additional tech research buttons shown when a completed Lodge is selected
 * (cartography, tidal harvest, herbal medicine, aquatic training, deep diving).
 */

import { TECH_UPGRADES } from '@/config/tech-tree';
import type { GameWorld } from '@/ecs/world';
import type { ActionButtonDef } from '@/ui/action-panel';

import { canAffordTech, discountedTechCost, purchaseTech, techRequiresLabel } from './tech-helpers';

export function buildLodgeTechButtons(w: GameWorld): ActionButtonDef[] {
  const btns: ActionButtonDef[] = [];

  const cartoTech = TECH_UPGRADES.cartography;
  const cartoCost = discountedTechCost(w, cartoTech.clamCost, cartoTech.twigCost);
  btns.push({
    title: cartoTech.name,
    cost: `${cartoCost.clams}C ${cartoCost.twigs}T`,
    hotkey: 'Y',
    affordable: canAffordTech(w, 'cartography'),
    description: cartoTech.description,
    category: 'tech',
    costBreakdown: { clams: cartoCost.clams, twigs: cartoCost.twigs },
    requires: techRequiresLabel('cartography'),
    onClick: () => {
      purchaseTech(w, 'cartography');
    },
  });
  const thTech = TECH_UPGRADES.tidalHarvest;
  const thCost = discountedTechCost(w, thTech.clamCost, thTech.twigCost);
  btns.push({
    title: thTech.name,
    cost: `${thCost.clams}C ${thCost.twigs}T`,
    hotkey: 'U',
    affordable: canAffordTech(w, 'tidalHarvest'),
    description: thTech.description,
    category: 'tech',
    costBreakdown: { clams: thCost.clams, twigs: thCost.twigs },
    requires: techRequiresLabel('tidalHarvest'),
    onClick: () => {
      purchaseTech(w, 'tidalHarvest');
    },
  });
  const hmTech = TECH_UPGRADES.herbalMedicine;
  const hmCost = discountedTechCost(w, hmTech.clamCost, hmTech.twigCost);
  btns.push({
    title: hmTech.name,
    cost: `${hmCost.clams}C ${hmCost.twigs}T`,
    hotkey: 'I',
    affordable: canAffordTech(w, 'herbalMedicine'),
    description: hmTech.description,
    category: 'tech',
    costBreakdown: { clams: hmCost.clams, twigs: hmCost.twigs },
    requires: techRequiresLabel('herbalMedicine'),
    onClick: () => {
      purchaseTech(w, 'herbalMedicine');
    },
  });
  const atTech = TECH_UPGRADES.aquaticTraining;
  const atCost = discountedTechCost(w, atTech.clamCost, atTech.twigCost);
  btns.push({
    title: atTech.name,
    cost: `${atCost.clams}C ${atCost.twigs}T`,
    hotkey: 'O',
    affordable: canAffordTech(w, 'aquaticTraining'),
    description: atTech.description,
    category: 'tech',
    costBreakdown: { clams: atCost.clams, twigs: atCost.twigs },
    requires: techRequiresLabel('aquaticTraining'),
    onClick: () => {
      purchaseTech(w, 'aquaticTraining');
    },
  });
  const ddTech = TECH_UPGRADES.deepDiving;
  const ddCost = discountedTechCost(w, ddTech.clamCost, ddTech.twigCost);
  btns.push({
    title: ddTech.name,
    cost: `${ddCost.clams}C ${ddCost.twigs}T`,
    hotkey: 'P',
    affordable: canAffordTech(w, 'deepDiving'),
    description: ddTech.description,
    category: 'tech',
    costBreakdown: { clams: ddCost.clams, twigs: ddCost.twigs },
    requires: techRequiresLabel('deepDiving'),
    onClick: () => {
      purchaseTech(w, 'deepDiving');
    },
  });

  return btns;
}
