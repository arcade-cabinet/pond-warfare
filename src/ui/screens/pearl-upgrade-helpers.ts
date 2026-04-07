/**
 * Pearl Upgrade Screen Helpers
 *
 * Extracted helper functions for PearlUpgradeScreen to keep it under 300 LOC.
 * Contains: upgrade categorization, grouping, commander section builder.
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
  const specialist = getSpecialistCategory(upgrade.id);
  if (specialist) return specialist;
  if (upgrade.id.endsWith('_behavior')) return 'Behaviors';
  if (upgrade.id === 'starting_tier') return 'Starting Tier';
  return 'Multipliers';
}

/** Group Pearl upgrades by display category, preserving config order within each group. */
export function getUpgradeGroups(
  upgrades: PearlUpgradeDisplay[],
): Map<string, PearlUpgradeDisplay[]> {
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
  return groups;
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

const SPECIALIST_CATEGORY_NAMES: Record<string, string> = {
  fisher: 'Fisher',
  logger: 'Logger',
  digger: 'Digger',
  guard: 'Guard',
  ranger: 'Ranger',
  bombardier: 'Bombardier',
  shaman: 'Shaman',
  lookout: 'Lookout',
};

function getSpecialistCategory(id: string): string | null {
  if (id.startsWith('blueprint_')) {
    const unitId = id.slice('blueprint_'.length);
    return SPECIALIST_CATEGORY_NAMES[unitId] ?? null;
  }

  const unitId = Object.keys(SPECIALIST_CATEGORY_NAMES).find((key) => id.startsWith(`${key}_`));
  return unitId ? SPECIALIST_CATEGORY_NAMES[unitId] : null;
}
