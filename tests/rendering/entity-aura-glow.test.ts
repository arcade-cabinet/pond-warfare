/**
 * Entity Aura and Glow Overlay Tests
 *
 * Validates that commanders render a gold aura ring and enemy
 * predator nests render a red glow ring for visual distinctiveness.
 *
 * Tests verify the overlay drawing calls (circle + stroke) using
 * a mock Graphics context that records draw operations.
 */

import { describe, expect, it } from 'vitest';
import { drawCommanderAura, drawNestGlow } from '@/rendering/pixi/entity-aura-glow';
import { EntityKind } from '@/types';

/** Create a mock PixiJS Graphics that records circle/stroke calls. */
function createMockGraphics() {
  const calls: { method: string; args: unknown[] }[] = [];
  return {
    calls,
    circle(x: number, y: number, r: number) {
      calls.push({ method: 'circle', args: [x, y, r] });
    },
    stroke(opts: { width: number; color: number; alpha: number }) {
      calls.push({ method: 'stroke', args: [opts] });
    },
  };
}

describe('Commander aura constants', () => {
  it('should have Commander entity kind defined', () => {
    expect(EntityKind.Commander).toBeDefined();
    expect(EntityKind.Commander).toBe(30);
  });

  it('should have PredatorNest entity kind defined', () => {
    expect(EntityKind.PredatorNest).toBeDefined();
    expect(EntityKind.PredatorNest).toBe(9);
  });
});

describe('Commander aura visual behavior', () => {
  it('should distinguish Commander from regular units by EntityKind', () => {
    expect(EntityKind.Commander).not.toBe(EntityKind.Gatherer);
    expect(EntityKind.Commander).not.toBe(EntityKind.Brawler);
    expect(EntityKind.Commander).not.toBe(EntityKind.Sniper);
  });

  it('should have Commander spriteScale > regular unit spriteScale', async () => {
    const { ENTITY_DEFS } = await import('@/config/entity-defs');
    const commanderDef = ENTITY_DEFS[EntityKind.Commander];
    const gathererDef = ENTITY_DEFS[EntityKind.Gatherer];

    expect(commanderDef).toBeDefined();
    expect(gathererDef).toBeDefined();
    expect(commanderDef.spriteScale).toBeGreaterThan(gathererDef.spriteScale);
    expect(commanderDef.spriteScale).toBe(5.0);
  });
});

describe('drawCommanderAura', () => {
  it('should draw 3 circles with strokes for the aura layers', () => {
    const gfx = createMockGraphics();
    drawCommanderAura(gfx as never, 100, 200, 0);

    const circleCalls = gfx.calls.filter((c) => c.method === 'circle');
    const strokeCalls = gfx.calls.filter((c) => c.method === 'stroke');

    // Outer glow, main ring, inner highlight = 3 circles + 3 strokes
    expect(circleCalls).toHaveLength(3);
    expect(strokeCalls).toHaveLength(3);

    // All circles should be centered on (100, 200)
    for (const call of circleCalls) {
      expect(call.args[0]).toBe(100);
      expect(call.args[1]).toBe(200);
    }

    // Outer ring should have the largest radius
    const radii = circleCalls.map((c) => c.args[2] as number);
    expect(radii[0]).toBeGreaterThan(radii[1]);
    expect(radii[1]).toBeGreaterThan(radii[2]);
  });

  it('should use gold colors (0xfbbf24 family)', () => {
    const gfx = createMockGraphics();
    drawCommanderAura(gfx as never, 0, 0, 50);

    const strokeCalls = gfx.calls.filter((c) => c.method === 'stroke');
    const colors = strokeCalls.map((c) => (c.args[0] as { color: number }).color);

    // Should include the gold palette
    expect(colors).toContain(0xf59e0b); // outer gold
    expect(colors).toContain(0xfbbf24); // main gold
    expect(colors).toContain(0xfef3c7); // inner highlight
  });

  it('should produce pulse-varying alpha over time', () => {
    const gfx0 = createMockGraphics();
    const gfx50 = createMockGraphics();
    drawCommanderAura(gfx0 as never, 0, 0, 0);
    drawCommanderAura(gfx50 as never, 0, 0, 50);

    const alpha0 = (gfx0.calls.filter((c) => c.method === 'stroke')[0].args[0] as { alpha: number })
      .alpha;
    const alpha50 = (
      gfx50.calls.filter((c) => c.method === 'stroke')[0].args[0] as { alpha: number }
    ).alpha;

    // Alpha should vary with frame count
    expect(alpha0).not.toBe(alpha50);
  });
});

describe('drawNestGlow', () => {
  it('should draw 3 circles with strokes for the glow layers', () => {
    const gfx = createMockGraphics();
    drawNestGlow(gfx as never, 300, 400, 0);

    const circleCalls = gfx.calls.filter((c) => c.method === 'circle');
    const strokeCalls = gfx.calls.filter((c) => c.method === 'stroke');

    expect(circleCalls).toHaveLength(3);
    expect(strokeCalls).toHaveLength(3);

    // All circles at (300, 400)
    for (const call of circleCalls) {
      expect(call.args[0]).toBe(300);
      expect(call.args[1]).toBe(400);
    }
  });

  it('should use red colors (0xef4444 family)', () => {
    const gfx = createMockGraphics();
    drawNestGlow(gfx as never, 0, 0, 25);

    const strokeCalls = gfx.calls.filter((c) => c.method === 'stroke');
    const colors = strokeCalls.map((c) => (c.args[0] as { color: number }).color);

    expect(colors).toContain(0xb91c1c); // dark red outer
    expect(colors).toContain(0xef4444); // main red
    expect(colors).toContain(0xfca5a5); // inner highlight
  });

  it('should produce decreasing radii from outer to inner', () => {
    const gfx = createMockGraphics();
    drawNestGlow(gfx as never, 0, 0, 0);

    const circleCalls = gfx.calls.filter((c) => c.method === 'circle');
    const radii = circleCalls.map((c) => c.args[2] as number);

    expect(radii[0]).toBeGreaterThan(radii[1]);
    expect(radii[1]).toBeGreaterThan(radii[2]);
  });
});

describe('PredatorNest glow behavior', () => {
  it('should be classified as a building', async () => {
    const { ENTITY_DEFS } = await import('@/config/entity-defs');
    const nestDef = ENTITY_DEFS[EntityKind.PredatorNest];

    expect(nestDef).toBeDefined();
    expect(nestDef.isBuilding).toBe(true);
  });
});

describe('Aura pulse math', () => {
  it('should produce a pulse value between 0.4 and 1.0', () => {
    for (let fc = 0; fc < 200; fc++) {
      const pulse = 0.4 + 0.6 * (0.5 + 0.5 * Math.sin(fc * 0.06));
      expect(pulse).toBeGreaterThanOrEqual(0.4);
      expect(pulse).toBeLessThanOrEqual(1.0);
    }
  });

  it('should produce a nest glow pulse between 0.0 and 1.0', () => {
    for (let fc = 0; fc < 200; fc++) {
      const pulse = 0.5 + 0.5 * Math.sin(fc * 0.04);
      expect(pulse).toBeGreaterThanOrEqual(0);
      expect(pulse).toBeLessThanOrEqual(1);
    }
  });
});
