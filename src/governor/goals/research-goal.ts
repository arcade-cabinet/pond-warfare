/**
 * ResearchGoal — Purchases affordable tech upgrades.
 *
 * Iterates through the tech tree and buys the cheapest available upgrade.
 * Uses the same purchaseTech function the tech panel uses.
 */

import { Goal } from 'yuka';
import type { TechId } from '@/config/tech-tree';
import { game } from '@/game';
import { canAffordTech, purchaseTech } from '@/game/action-panel/tech-helpers';

/** Priority order for research: economy first, then warfare, then defense. */
const RESEARCH_PRIORITY: TechId[] = [
  // Economy
  'tidalHarvest',
  'cartography',
  // Warfare basics
  'sharpSticks',
  'eagleEye',
  // Nature
  'herbalMedicine',
  // Fortifications
  'sturdyMud',
  // Shadow
  'swiftPaws',
  // Advanced economy
  'tradeRoutes',
  'deepDiving',
  // Advanced warfare
  'battleRoar',
  'ironShell',
  // More nature
  'aquaticTraining',
  // Remaining techs
  'cunningTraps',
  'fortifiedWalls',
  'siegeWorks',
  'piercingShot',
  'warDrums',
  'rallyCry',
  'hardenedShells',
  'regeneration',
  'rootNetwork',
  'pondBlessing',
  'tidalSurge',
  'camouflage',
  'venomCoating',
];

export class ResearchGoal extends Goal {
  override activate(): void {
    const w = game.world;
    let researched = false;

    for (const techId of RESEARCH_PRIORITY) {
      if (w.tech[techId]) continue;
      if (!canAffordTech(w, techId)) continue;

      researched = purchaseTech(w, techId);
      if (researched) break;
    }

    this.status = researched ? Goal.STATUS.COMPLETED : Goal.STATUS.FAILED;
  }

  override execute(): void {
    this.status = Goal.STATUS.COMPLETED;
  }

  override terminate(): void {}
}
