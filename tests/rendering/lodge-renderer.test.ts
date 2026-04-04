/**
 * Lodge Visual Evolution Tests (v3.0 — US6)
 *
 * Validates Lodge rendering reads correct wings from upgrade state,
 * prestige glow scales with rank, HP bar displays correctly,
 * and fort slot positions generate properly.
 */

import { describe, expect, it } from 'vitest';
import { getLodgeConfig } from '@/config/config-loader';
import {
  generateFortSlotPositions,
  getActiveWings,
  getFortSlotCount,
  getLodgeBaseHp,
  getLodgeHpBar,
  getPrestigeGlow,
  isValidWing,
  type LodgeVisualState,
} from '@/rendering/lodge-renderer';

// ── Helper ────────────────────────────────────────────────────────

function makeState(overrides: Partial<LodgeVisualState> = {}): LodgeVisualState {
  return {
    unlockedWings: {},
    prestigeRank: 0,
    currentHp: 500,
    maxHp: 500,
    ...overrides,
  };
}

// ── Wing rendering tests ──────────────────────────────────────────

describe('Lodge wing rendering', () => {
  it('should return no wings for a new player', () => {
    const state = makeState();
    const wings = getActiveWings(state);
    expect(wings).toHaveLength(0);
  });

  it('should return dock wing when dock is unlocked', () => {
    const state = makeState({ unlockedWings: { dock: true } });
    const wings = getActiveWings(state);
    expect(wings).toHaveLength(1);
    expect(wings[0].wingId).toBe('dock');
    expect(wings[0].offsetX).toBeLessThan(0); // dock is on the left
  });

  it('should return multiple wings when multiple are unlocked', () => {
    const state = makeState({
      unlockedWings: { dock: true, barracks: true, watchtower: true },
    });
    const wings = getActiveWings(state);
    expect(wings).toHaveLength(3);
    const ids = wings.map((w) => w.wingId);
    expect(ids).toContain('dock');
    expect(ids).toContain('barracks');
    expect(ids).toContain('watchtower');
  });

  it('should return all four wings when fully upgraded', () => {
    const state = makeState({
      unlockedWings: { dock: true, barracks: true, watchtower: true, healing_pool: true },
    });
    const wings = getActiveWings(state);
    expect(wings).toHaveLength(4);
  });

  it('should ignore unknown wing IDs', () => {
    const state = makeState({ unlockedWings: { dock: true, nonexistent: true } });
    const wings = getActiveWings(state);
    expect(wings).toHaveLength(1);
    expect(wings[0].wingId).toBe('dock');
  });

  it('should not include wings set to false', () => {
    const state = makeState({ unlockedWings: { dock: false, barracks: true } });
    const wings = getActiveWings(state);
    expect(wings).toHaveLength(1);
    expect(wings[0].wingId).toBe('barracks');
  });

  it('wing placements have correct structure', () => {
    const state = makeState({
      unlockedWings: { dock: true, barracks: true, watchtower: true, healing_pool: true },
    });
    const wings = getActiveWings(state);
    for (const wing of wings) {
      expect(wing.wingId).toBeTruthy();
      expect(wing.label).toBeTruthy();
      expect(typeof wing.offsetX).toBe('number');
      expect(typeof wing.offsetY).toBe('number');
      expect(wing.width).toBeGreaterThan(0);
      expect(wing.height).toBeGreaterThan(0);
    }
  });
});

// ── Prestige glow tests ──────────────────────────────────────────

describe('Prestige glow', () => {
  it('should return null for rank 0 (no prestige)', () => {
    expect(getPrestigeGlow(0)).toBeNull();
  });

  it('should return a glow for rank 1', () => {
    const glow = getPrestigeGlow(1);
    expect(glow).not.toBeNull();
    expect(glow?.radius).toBeGreaterThan(0);
    expect(glow?.alpha).toBeGreaterThan(0);
  });

  it('should return brighter glow for higher ranks', () => {
    const glow1 = getPrestigeGlow(1)!;
    const glow5 = getPrestigeGlow(5)!;
    const glow10 = getPrestigeGlow(10)!;

    expect(glow5.radius).toBeGreaterThan(glow1.radius);
    expect(glow10.radius).toBeGreaterThan(glow5.radius);
    expect(glow10.alpha).toBeGreaterThan(glow1.alpha);
  });

  it('glow always has valid color, radius, alpha', () => {
    for (let rank = 1; rank <= 20; rank++) {
      const glow = getPrestigeGlow(rank);
      expect(glow).not.toBeNull();
      expect(glow?.color).toBeTruthy();
      expect(glow?.radius).toBeGreaterThan(0);
      expect(glow?.alpha).toBeGreaterThan(0);
      expect(glow?.alpha).toBeLessThanOrEqual(1);
    }
  });
});

// ── HP bar tests ──────────────────────────────────────────────────

describe('Lodge HP bar', () => {
  it('should show 100% at full health', () => {
    const state = makeState({ currentHp: 500, maxHp: 500 });
    const bar = getLodgeHpBar(state);
    expect(bar.percent).toBe(1);
    expect(bar.label).toBe('500 / 500');
  });

  it('should show correct percent at half health', () => {
    const state = makeState({ currentHp: 250, maxHp: 500 });
    const bar = getLodgeHpBar(state);
    expect(bar.percent).toBeCloseTo(0.5);
  });

  it('should show 0% at zero health', () => {
    const state = makeState({ currentHp: 0, maxHp: 500 });
    const bar = getLodgeHpBar(state);
    expect(bar.percent).toBe(0);
  });

  it('should use green color above 60%', () => {
    const state = makeState({ currentHp: 400, maxHp: 500 });
    const bar = getLodgeHpBar(state);
    // Green color
    expect(bar.color).toMatch(/#4ade80|green/i);
  });

  it('should use yellow color between 30-60%', () => {
    const state = makeState({ currentHp: 200, maxHp: 500 });
    const bar = getLodgeHpBar(state);
    expect(bar.color).toBe('#facc15');
  });

  it('should use red color below 30%', () => {
    const state = makeState({ currentHp: 100, maxHp: 500 });
    const bar = getLodgeHpBar(state);
    expect(bar.color).toBe('#ef4444');
  });

  it('should clamp percent to 0-1 range', () => {
    const over = makeState({ currentHp: 600, maxHp: 500 });
    expect(getLodgeHpBar(over).percent).toBe(1);

    const under = makeState({ currentHp: -10, maxHp: 500 });
    expect(getLodgeHpBar(under).percent).toBe(0);
  });

  it('should handle zero maxHp gracefully', () => {
    const state = makeState({ currentHp: 0, maxHp: 0 });
    const bar = getLodgeHpBar(state);
    expect(bar.percent).toBe(0);
  });
});

// ── Fort slot tests ──────────────────────────────────────────────

describe('Fort slot count', () => {
  it('should return 4 slots at progression level 0', () => {
    expect(getFortSlotCount(0)).toBe(4);
  });

  it('should return 8 slots at progression level 10', () => {
    expect(getFortSlotCount(10)).toBe(8);
  });

  it('should return 12 slots at progression level 30', () => {
    expect(getFortSlotCount(30)).toBe(12);
  });

  it('should use highest matching tier', () => {
    expect(getFortSlotCount(50)).toBe(12);
  });

  it('should return tier 1 slots for levels 5-9', () => {
    expect(getFortSlotCount(5)).toBe(4);
    expect(getFortSlotCount(9)).toBe(4);
  });
});

describe('Fort slot position generation', () => {
  it('should generate correct number of positions', () => {
    expect(generateFortSlotPositions(4)).toHaveLength(4);
    expect(generateFortSlotPositions(8)).toHaveLength(8);
    expect(generateFortSlotPositions(12)).toHaveLength(12);
  });

  it('inner ring positions should be closer to center', () => {
    const positions = generateFortSlotPositions(12);
    const innerRing = positions.filter((p) => p.ring === 0);
    const outerRing = positions.filter((p) => p.ring === 1);

    for (const inner of innerRing) {
      const innerDist = Math.sqrt(inner.x ** 2 + inner.y ** 2);
      for (const outer of outerRing) {
        const outerDist = Math.sqrt(outer.x ** 2 + outer.y ** 2);
        expect(innerDist).toBeLessThan(outerDist);
      }
    }
  });

  it('positions should form roughly circular arrangement', () => {
    const positions = generateFortSlotPositions(8);
    for (const pos of positions) {
      const dist = Math.sqrt(pos.x ** 2 + pos.y ** 2);
      // All inner ring positions should be at roughly the same distance
      expect(dist).toBeGreaterThan(30);
      expect(dist).toBeLessThan(100);
    }
  });

  it('should handle zero slots', () => {
    expect(generateFortSlotPositions(0)).toHaveLength(0);
  });
});

// ── Config integration tests ──────────────────────────────────────

describe('Lodge config integration', () => {
  it('isValidWing returns true for config-defined wings', () => {
    expect(isValidWing('dock')).toBe(true);
    expect(isValidWing('barracks')).toBe(true);
    expect(isValidWing('watchtower')).toBe(true);
    expect(isValidWing('healing_pool')).toBe(true);
  });

  it('isValidWing returns false for unknown wings', () => {
    expect(isValidWing('unknown')).toBe(false);
    expect(isValidWing('')).toBe(false);
  });

  it('getLodgeBaseHp matches config', () => {
    const config = getLodgeConfig();
    expect(getLodgeBaseHp()).toBe(config.base_hp);
    expect(getLodgeBaseHp()).toBe(500);
  });

  it('config defines all four Lodge wings', () => {
    const config = getLodgeConfig();
    expect(Object.keys(config.wings)).toHaveLength(4);
    expect(config.wings.dock).toBeDefined();
    expect(config.wings.barracks).toBeDefined();
    expect(config.wings.watchtower).toBeDefined();
    expect(config.wings.healing_pool).toBeDefined();
  });

  it('each wing has unlock condition and visual ID', () => {
    const config = getLodgeConfig();
    for (const [id, wing] of Object.entries(config.wings)) {
      expect(wing.unlock, `${id} unlock`).toBeTruthy();
      expect(wing.visual, `${id} visual`).toBeTruthy();
      expect(wing.description, `${id} description`).toBeTruthy();
    }
  });

  it('fort slot tiers are ordered by min_level', () => {
    const config = getLodgeConfig();
    const levels = config.fort_slots_per_level.map((t) => t.min_level);
    for (let i = 1; i < levels.length; i++) {
      expect(levels[i]).toBeGreaterThan(levels[i - 1]);
    }
  });
});
