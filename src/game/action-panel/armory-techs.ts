/**
 * Action Panel -- Armory Tech Buttons
 *
 * Tech research buttons shown when a completed Armory is selected.
 * Armory researches Warfare + Fortifications + Shadow branch techs.
 */

import { TECH_UPGRADES, type TechId } from '@/config/tech-tree';
import type { GameWorld } from '@/ecs/world';
import type { ActionButtonDef } from '@/ui/action-panel';

import { canAffordTech, discountedTechCost, purchaseTech, techRequiresLabel } from './tech-helpers';

/** Warfare + Fortifications + Shadow tech IDs in display order. */
const ARMORY_TECH_IDS: { id: TechId; hotkey: string }[] = [
  // Warfare branch
  { id: 'sharpSticks', hotkey: 'Z' },
  { id: 'eagleEye', hotkey: 'X' },
  { id: 'battleRoar', hotkey: 'C' },
  { id: 'piercingShot', hotkey: 'V' },
  { id: 'warDrums', hotkey: 'B' },
  // Fortifications branch
  { id: 'sturdyMud', hotkey: 'N' },
  { id: 'ironShell', hotkey: 'M' },
  { id: 'fortifiedWalls', hotkey: ',' },
  { id: 'siegeWorks', hotkey: '.' },
  { id: 'hardenedShells', hotkey: '/' },
  // Shadow branch
  { id: 'swiftPaws', hotkey: 'G' },
  { id: 'cunningTraps', hotkey: 'T' },
  { id: 'rallyCry', hotkey: 'R' },
  { id: 'camouflage', hotkey: 'F' },
  { id: 'venomCoating', hotkey: 'E' },
];

export function buildArmoryTechButtons(w: GameWorld): ActionButtonDef[] {
  const btns: ActionButtonDef[] = [];

  for (const { id, hotkey } of ARMORY_TECH_IDS) {
    const tech = TECH_UPGRADES[id];
    const cost = discountedTechCost(w, tech.clamCost, tech.twigCost);
    const pearlCost = (tech as { pearlCost?: number }).pearlCost ?? 0;
    btns.push({
      title: tech.name,
      cost: `${cost.clams}C ${cost.twigs}T${pearlCost > 0 ? ` ${pearlCost}P` : ''}`,
      hotkey,
      affordable: canAffordTech(w, id),
      description: tech.description,
      category: 'tech',
      costBreakdown: { clams: cost.clams, twigs: cost.twigs, pearls: pearlCost || undefined },
      requires: techRequiresLabel(id),
      onClick: () => {
        purchaseTech(w, id);
      },
    });
  }

  return btns;
}
