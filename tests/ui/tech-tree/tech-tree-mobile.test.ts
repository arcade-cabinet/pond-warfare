/**
 * Tech Tree Mobile Layout Tests
 *
 * Validates the decomposed tech tree submodules:
 * - tree-data exports correct node/edge definitions
 * - tree-helpers computes correct node states
 * - TechCard renders dependency text badges instead of SVG lines
 * - BranchGrid renders a responsive card grid
 * - tech-tree-panel uses both desktop and mobile layouts
 */

import { cleanup, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, describe, expect, it } from 'vitest';

import { createInitialTechState, TECH_UPGRADES } from '@/config/tech-tree';
import { ARMORY_EDGES, ARMORY_NODES, LODGE_EDGES, LODGE_NODES } from '@/ui/tech-tree/tree-data';
import { getNodeState, stateStyles } from '@/ui/tech-tree/tree-helpers';

afterEach(() => {
  cleanup();
});

// ---- tree-data ----

describe('tree-data', () => {
  it('exports Lodge and Armory node arrays with valid TechIds', () => {
    const techIds = new Set(Object.keys(TECH_UPGRADES));
    for (const node of LODGE_NODES) {
      expect(techIds.has(node.id)).toBe(true);
    }
    for (const node of ARMORY_NODES) {
      expect(techIds.has(node.id)).toBe(true);
    }
  });

  it('exports edge arrays referencing valid node ids', () => {
    const lodgeIds = new Set(LODGE_NODES.map((n) => n.id));
    for (const edge of LODGE_EDGES) {
      expect(lodgeIds.has(edge.from)).toBe(true);
      expect(lodgeIds.has(edge.to)).toBe(true);
    }
    const armoryIds = new Set(ARMORY_NODES.map((n) => n.id));
    for (const edge of ARMORY_EDGES) {
      expect(armoryIds.has(edge.from)).toBe(true);
      expect(armoryIds.has(edge.to)).toBe(true);
    }
  });

  it('Lodge has 9 nodes and Armory has 16 nodes', () => {
    expect(LODGE_NODES.length).toBe(9);
    expect(ARMORY_NODES.length).toBe(16);
  });
});

// ---- tree-helpers ----

describe('tree-helpers', () => {
  it('returns "locked" for a tech whose prerequisite is not done', () => {
    const state = createInitialTechState();
    expect(getNodeState('swiftPaws', state, 999, 999)).toBe('locked');
  });

  it('returns "available" when prerequisite is met and resources suffice', () => {
    const state = createInitialTechState();
    state.sturdyMud = true;
    const upgrade = TECH_UPGRADES.swiftPaws;
    expect(getNodeState('swiftPaws', state, upgrade.clamCost, upgrade.twigCost)).toBe('available');
  });

  it('returns "unaffordable" when prerequisite is met but resources insufficient', () => {
    const state = createInitialTechState();
    state.sturdyMud = true;
    expect(getNodeState('swiftPaws', state, 0, 0)).toBe('unaffordable');
  });

  it('returns "researched" for already-researched tech', () => {
    const state = createInitialTechState();
    state.sturdyMud = true;
    expect(getNodeState('sturdyMud', state, 0, 0)).toBe('researched');
  });

  it('stateStyles returns correct border colors per state', () => {
    expect(stateStyles('researched').border).toBe('var(--pw-success)');
    expect(stateStyles('available').border).toBe('var(--pw-warning)');
    expect(stateStyles('locked').extra).toContain('opacity-60');
  });
});

// ---- TechCard ----

describe('TechCard', () => {
  it('renders a card with tech name, cost, and description', async () => {
    const { TechCard } = await import('@/ui/tech-tree/TechCard');
    render(
      h(TechCard, {
        node: LODGE_NODES[0],
        state: 'available',
        onClick: () => {},
      }),
    );
    const card = document.querySelector('.tech-card');
    expect(card).not.toBeNull();
    expect(card?.textContent).toContain('Cartography');
  });

  it('shows dependency text badge for locked tech with requirement', async () => {
    const { TechCard } = await import('@/ui/tech-tree/TechCard');
    // swiftPaws requires sturdyMud
    const node = ARMORY_NODES.find((n) => n.id === 'swiftPaws');
    if (!node) throw new Error('swiftPaws node not found');
    render(h(TechCard, { node, state: 'locked', onClick: () => {} }));
    const text = document.body.textContent ?? '';
    expect(text).toContain('Needs');
    expect(text).toContain('Sturdy Mud');
  });

  it('shows unlock badge for nodes with unlocks', async () => {
    const { TechCard } = await import('@/ui/tech-tree/TechCard');
    const node = ARMORY_NODES.find((n) => n.id === 'ironShell');
    if (!node) throw new Error('ironShell node not found');
    render(h(TechCard, { node, state: 'available', onClick: () => {} }));
    expect(document.body.textContent).toContain('Shieldbearer');
  });
});

// ---- BranchGrid ----

describe('BranchGrid', () => {
  it('renders cards in a .tech-card-grid container', async () => {
    const { BranchGrid } = await import('@/ui/tech-tree/BranchGrid');
    const state = createInitialTechState();
    render(
      h(BranchGrid, {
        nodes: LODGE_NODES,
        techState: state,
        clams: 999,
        twigs: 999,
        onResearch: () => {},
      }),
    );
    const grid = document.querySelector('.tech-card-grid');
    expect(grid).not.toBeNull();
    const cards = grid?.querySelectorAll('.tech-card') ?? [];
    expect(cards.length).toBe(LODGE_NODES.length);
  });
});

// ---- File structure ----

describe('tech-tree-panel uses signal-based layout switching', () => {
  it('uses screenClass signal for compact vs graph layout', async () => {
    const src = await import('@/ui/tech-tree-panel?raw').then(
      (m: { default: string }) => m.default,
    );
    expect(src).toContain("screenClass.value === 'compact'");
    expect(src).toContain("screenClass.value !== 'compact'");
    expect(src).toContain('BranchGrid');
    expect(src).toContain('BranchPanel');
    expect(src).toContain('BranchTabs');
    // No CSS breakpoint switching for layout
    expect(src).not.toContain('md:hidden');
    expect(src).not.toContain('hidden md:flex');
  });

  it('has modal-scroll-both class for two-axis scroll', async () => {
    const src = await import('@/ui/tech-tree-panel?raw').then(
      (m: { default: string }) => m.default,
    );
    expect(src).toContain('modal-scroll-both');
  });
});
