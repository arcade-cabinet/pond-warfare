/**
 * Tech Tree Mobile Layout Tests
 *
 * Validates the decomposed tech tree submodules:
 * - tree-data exports correct node/edge definitions for all 5 branches
 * - tree-helpers computes correct node states
 * - TechCard renders dependency text badges instead of SVG lines
 * - BranchGrid renders a responsive card grid
 * - tech-tree-panel uses accordion for compact and BranchPanel for desktop
 */

import { cleanup, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, describe, expect, it } from 'vitest';

import { createInitialTechState, TECH_UPGRADES } from '@/config/tech-tree';
import {
  FORTIFICATION_EDGES,
  FORTIFICATION_NODES,
  LODGE_EDGES,
  LODGE_NODES,
  NATURE_EDGES,
  NATURE_NODES,
  SHADOW_EDGES,
  SHADOW_NODES,
  WARFARE_EDGES,
  WARFARE_NODES,
} from '@/ui/tech-tree/tree-data';
import { getNodeState, stateStyles } from '@/ui/tech-tree/tree-helpers';

afterEach(() => {
  cleanup();
});

// ---- tree-data ----

describe('tree-data', () => {
  const ALL_BRANCH_NODES = [
    { name: 'Lodge', nodes: LODGE_NODES, edges: LODGE_EDGES, count: 5 },
    { name: 'Nature', nodes: NATURE_NODES, edges: NATURE_EDGES, count: 5 },
    { name: 'Warfare', nodes: WARFARE_NODES, edges: WARFARE_EDGES, count: 5 },
    { name: 'Fortifications', nodes: FORTIFICATION_NODES, edges: FORTIFICATION_EDGES, count: 5 },
    { name: 'Shadow', nodes: SHADOW_NODES, edges: SHADOW_EDGES, count: 5 },
  ];

  it('exports 5 branch node arrays with valid TechIds', () => {
    const techIds = new Set(Object.keys(TECH_UPGRADES));
    for (const branch of ALL_BRANCH_NODES) {
      for (const node of branch.nodes) {
        expect(techIds.has(node.id)).toBe(true);
      }
    }
  });

  it('exports edge arrays referencing valid node ids or cross-branch deps', () => {
    const allNodeIds = new Set(ALL_BRANCH_NODES.flatMap((b) => b.nodes.map((n) => n.id)));
    for (const branch of ALL_BRANCH_NODES) {
      for (const edge of branch.edges) {
        expect(allNodeIds.has(edge.from)).toBe(true);
        expect(allNodeIds.has(edge.to)).toBe(true);
      }
    }
  });

  it('each branch has exactly 5 nodes', () => {
    for (const branch of ALL_BRANCH_NODES) {
      expect(branch.nodes.length).toBe(branch.count);
    }
  });

  it('total tech count is 25 across all branches', () => {
    const total = ALL_BRANCH_NODES.reduce((sum, b) => sum + b.nodes.length, 0);
    expect(total).toBe(25);
  });
});

// ---- tree-helpers ----

describe('tree-helpers', () => {
  it('returns "locked" for a tech whose prerequisite is not done', () => {
    const state = createInitialTechState();
    expect(getNodeState('cunningTraps', state, 999, 999)).toBe('locked');
  });

  it('returns "available" when prerequisite is met and resources suffice', () => {
    const state = createInitialTechState();
    state.swiftPaws = true;
    const upgrade = TECH_UPGRADES.cunningTraps;
    expect(getNodeState('cunningTraps', state, upgrade.clamCost, upgrade.twigCost)).toBe(
      'available',
    );
  });

  it('returns "unaffordable" when prerequisite is met but resources insufficient', () => {
    const state = createInitialTechState();
    state.swiftPaws = true;
    expect(getNodeState('cunningTraps', state, 0, 0)).toBe('unaffordable');
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
    // cunningTraps requires swiftPaws
    const node = SHADOW_NODES.find((n) => n.id === 'cunningTraps');
    if (!node) throw new Error('cunningTraps node not found');
    render(h(TechCard, { node, state: 'locked', onClick: () => {} }));
    const text = document.body.textContent ?? '';
    expect(text).toContain('Needs');
    expect(text).toContain('Shadow Sprint');
  });

  it('shows unlock badge for nodes with unlocks', async () => {
    const { TechCard } = await import('@/ui/tech-tree/TechCard');
    const node = FORTIFICATION_NODES.find((n) => n.id === 'ironShell');
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

describe('tech-tree-panel uses accordion for compact and branch panels for desktop', () => {
  it('uses screenClass signal for compact vs graph layout', async () => {
    const src = await import('@/ui/tech-tree-panel?raw').then(
      (m: { default: string }) => m.default,
    );
    expect(src).toContain("screenClass.value === 'compact'");
    expect(src).toContain("screenClass.value !== 'compact'");
    expect(src).toContain('BranchGrid');
    expect(src).toContain('BranchPanel');
    expect(src).toContain('PondAccordionSection');
  });

  it('has modal-scroll-both class for two-axis scroll', async () => {
    const src = await import('@/ui/tech-tree-panel?raw').then(
      (m: { default: string }) => m.default,
    );
    expect(src).toContain('modal-scroll-both');
  });

  it('renders all 5 branches', async () => {
    const src = await import('@/ui/tech-tree-panel?raw').then(
      (m: { default: string }) => m.default,
    );
    expect(src).toContain('LODGE_NODES');
    expect(src).toContain('NATURE_NODES');
    expect(src).toContain('WARFARE_NODES');
    expect(src).toContain('FORTIFICATION_NODES');
    expect(src).toContain('SHADOW_NODES');
  });
});
