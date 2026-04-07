import { describe, expect, it } from 'vitest';
import { COSMETICS, getCosmeticById, getCosmeticsForKind } from '@/config/cosmetics';
import { EntityKind } from '@/types';

const CANONICAL_UNIT_SKIN_TARGETS = new Set([
  EntityKind.Gatherer,
  EntityKind.Healer,
  EntityKind.Sapper,
  EntityKind.Saboteur,
  EntityKind.Scout,
  EntityKind.Shaman,
]);

describe('cosmetics config', () => {
  it('keeps unit skins on the canonical live otter roster', () => {
    const unitSkins = COSMETICS.filter((entry) => entry.category === 'unit_skin');
    expect(unitSkins.length).toBeGreaterThan(0);
    for (const entry of unitSkins) {
      expect(CANONICAL_UNIT_SKIN_TARGETS.has(entry.targetKind)).toBe(true);
    }
  });

  it('does not ship obsolete split-roster skin ids or names', () => {
    const serialized = JSON.stringify(COSMETICS);
    expect(serialized).not.toContain('brawler');
    expect(serialized).not.toContain('sniper');
    expect(serialized).not.toContain('gatherer');
    expect(serialized).not.toContain('Golden Brawler');
    expect(serialized).not.toContain('Shadow Sniper');
    expect(serialized).not.toContain('Elite Gatherer');
  });

  it('supports lookup by canonical skin id', () => {
    expect(getCosmeticById('skin_elite_mudpaw')?.targetKind).toBe(EntityKind.Gatherer);
    expect(getCosmeticById('skin_shadow_saboteur')?.targetKind).toBe(EntityKind.Saboteur);
    expect(getCosmeticById('skin_storm_shaman')?.targetKind).toBe(EntityKind.Shaman);
  });

  it('returns canonical skins for the live unit chassis', () => {
    expect(getCosmeticsForKind(EntityKind.Gatherer).map((entry) => entry.id)).toContain(
      'skin_elite_mudpaw',
    );
    expect(getCosmeticsForKind(EntityKind.Sapper).map((entry) => entry.id)).toContain(
      'skin_bog_sapper',
    );
    expect(getCosmeticsForKind(EntityKind.Scout).map((entry) => entry.id)).toContain(
      'skin_venom_lookout',
    );
  });
});
