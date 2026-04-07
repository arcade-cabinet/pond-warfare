/**
 * Pearl Upgrade Screen Helpers
 *
 * Extracted helper functions for PearlUpgradeScreen to keep it under 300 LOC.
 * Contains: upgrade categorization, next-per-group logic, commander section builder.
 */

import { COMMANDERS } from '@/config/commanders';
import type { PearlUpgradeDisplay } from '@/config/prestige-logic';
import type { PlayerProfile } from '@/storage/database';
import type { AccordionSection } from '@/ui/components/PondAccordion';

/** Pearl unlock cost per commander (id -> cost). Free commander has no entry. */
export const COMMANDER_PEARL_COSTS: Record<string, number> = {
  sage: 25,
  warden: 50,
  tidekeeper: 75,
  shadowfang: 100,
  ironpaw: 125,
  stormcaller: 150,
};

/** Categorize a Pearl upgrade into a display group. */
export function categorizeUpgrade(upgrade: PearlUpgradeDisplay): string {
  if (upgrade.id.startsWith('auto_deploy_')) return 'Specialists';
  if (upgrade.id.endsWith('_behavior')) return 'Behaviors';
  if (upgrade.id === 'starting_tier') return 'Starting Tier';
  return 'Multipliers';
}

/** Find the next (non-maxed) upgrade per group. */
export function getNextPerGroup(
  upgrades: PearlUpgradeDisplay[],
): Map<string, PearlUpgradeDisplay | null> {
  const groups = new Map<string, PearlUpgradeDisplay[]>();
  for (const u of upgrades) {
    const cat = categorizeUpgrade(u);
    const list = groups.get(cat);
    if (list) {
      list.push(u);
    } else {
      groups.set(cat, [u]);
    }
  }

  const result = new Map<string, PearlUpgradeDisplay | null>();
  for (const [cat, items] of groups) {
    const affordable = items.filter((u) => !u.isMaxed && u.canAfford);
    if (affordable.length > 0) {
      affordable.sort((a, b) => a.costPerRank - b.costPerRank);
      result.set(cat, affordable[0]);
    } else {
      const available = items.find((u) => !u.isMaxed);
      result.set(cat, available ?? null);
    }
  }
  return result;
}

/** Build commander accordion sections for unlocked + next unlockable commanders. */
export function buildCommanderSections(
  selectedCommanderId: string,
  playerProfile: PlayerProfile,
  pearls: number,
): AccordionSection[] {
  const sections: AccordionSection[] = [];
  let nextLockShown = false;

  for (const def of COMMANDERS) {
    const isUnlocked = def.unlock === null || def.unlock.check(playerProfile);
    const isSelected = selectedCommanderId === def.id;

    if (isUnlocked) {
      sections.push({
        key: def.id,
        title: def.name,
        summary: isSelected ? 'SELECTED' : undefined,
      });
    } else if (!nextLockShown) {
      const cost = COMMANDER_PEARL_COSTS[def.id] ?? 0;
      if (pearls >= cost) {
        sections.push({
          key: def.id,
          title: def.name,
          summary: `${cost}P to unlock`,
        });
        nextLockShown = true;
      }
    }
  }
  return sections;
}
