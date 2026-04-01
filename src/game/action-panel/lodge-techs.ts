/**
 * Action Panel -- Lodge Tech Buttons
 *
 * Tech research buttons shown when a completed Lodge is selected.
 * Lodge researches Lodge branch + Nature branch techs.
 */

import { TECH_UPGRADES, type TechId } from '@/config/tech-tree';
import type { GameWorld } from '@/ecs/world';
import type { ActionButtonDef } from '@/ui/action-panel';

import { canAffordTech, discountedTechCost, purchaseTech, techRequiresLabel } from './tech-helpers';

/** Lodge branch + Nature branch tech IDs in display order. */
const LODGE_TECH_IDS: { id: TechId; hotkey: string }[] = [
  // Lodge branch
  { id: 'cartography', hotkey: 'Y' },
  { id: 'tidalHarvest', hotkey: 'U' },
  { id: 'tradeRoutes', hotkey: 'I' },
  { id: 'deepDiving', hotkey: 'O' },
  { id: 'rootNetwork', hotkey: 'P' },
  // Nature branch
  { id: 'herbalMedicine', hotkey: 'H' },
  { id: 'aquaticTraining', hotkey: 'J' },
  { id: 'pondBlessing', hotkey: 'K' },
  { id: 'tidalSurge', hotkey: 'L' },
  { id: 'regeneration', hotkey: ';' },
];

export function buildLodgeTechButtons(w: GameWorld): ActionButtonDef[] {
  const btns: ActionButtonDef[] = [];

  for (const { id, hotkey } of LODGE_TECH_IDS) {
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
