/**
 * Shared upgrade-branch helpers used by live v3 systems.
 */

export type UpgradeCategory = 'gathering' | 'combat' | 'defense' | 'utility' | 'economy' | 'siege';

/** Count researched upgrades per category from v3 upgrade ids. */
export function countBranchTechs(tech: Record<string, boolean>): Record<UpgradeCategory, number> {
  const counts: Record<UpgradeCategory, number> = {
    gathering: 0,
    combat: 0,
    defense: 0,
    utility: 0,
    economy: 0,
    siege: 0,
  };

  for (const [id, researched] of Object.entries(tech)) {
    if (!researched) continue;
    const category = id.split('_')[0] as UpgradeCategory;
    if (category in counts) {
      counts[category]++;
    }
  }

  return counts;
}
