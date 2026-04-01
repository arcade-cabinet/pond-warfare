/**
 * Browser Responsive Tech Tree Tests
 *
 * Validates that the TechTreePanel renders different layouts based on
 * the screenClass signal:
 * - compact: accordion sections with card grids (PondAccordionSection + BranchGrid)
 * - medium/large: side-by-side SVG graphs (BranchPanel, 3+2 rows)
 *
 * Runs in browser mode via vitest + Playwright.
 */

import { render } from 'preact';
import { afterEach, describe, expect, it } from 'vitest';
import { createInitialTechState } from '@/config/tech-tree';
import { _testReset, _testUpdateSignals, initDeviceSignals, screenClass } from '@/platform/signals';

import { TechTreePanel } from '@/ui/tech-tree-panel';

function resizeTo(w: number, h: number) {
  Object.defineProperty(window, 'innerWidth', { value: w, configurable: true });
  Object.defineProperty(window, 'innerHeight', { value: h, configurable: true });
  _testUpdateSignals();
}

function renderPanel(container: HTMLElement) {
  render(
    <TechTreePanel
      techState={createInitialTechState()}
      clams={500}
      twigs={500}
      onResearch={() => {}}
      onClose={() => {}}
    />,
    container,
  );
}

const BRANCH_NAMES = ['Lodge', 'Nature', 'Warfare', 'Fortifications', 'Shadow'];

describe('Responsive tech tree layout', () => {
  let container: HTMLDivElement;

  afterEach(() => {
    render(null, container);
    container.remove();
    resizeTo(1280, 720);
  });

  it('compact screenClass renders 5 accordion sections with card grid', async () => {
    _testReset();
    await initDeviceSignals();
    resizeTo(400, 800);
    expect(screenClass.value).toBe('compact');

    container = document.createElement('div');
    document.body.appendChild(container);
    renderPanel(container);

    // Accordion sections should be rendered for all 5 branches
    const sections = container.querySelectorAll('[data-testid^="accordion-section-"]');
    expect(sections.length).toBe(5);

    // Card grid should be present (at least in the default open section)
    expect(container.querySelector('.tech-card-grid')).toBeTruthy();
  });

  it('large screenClass renders SVG graph branches', async () => {
    _testReset();
    await initDeviceSignals();
    resizeTo(1400, 900);
    expect(screenClass.value).toBe('large');

    container = document.createElement('div');
    document.body.appendChild(container);
    renderPanel(container);

    // No accordion sections at large
    const sections = container.querySelectorAll('[data-testid^="accordion-section-"]');
    expect(sections.length).toBe(0);

    // SVG graph headers should be present (BranchPanel renders h3 titles)
    const headings = Array.from(container.querySelectorAll('h3'));
    const headingText = headings.map((h) => h.textContent?.trim());
    for (const name of BRANCH_NAMES) {
      const found = headingText.some((t) => t?.includes(name));
      expect(found).toBe(true);
    }

    // No card grid at large
    expect(container.querySelector('.tech-card-grid')).toBeNull();
  });
});
