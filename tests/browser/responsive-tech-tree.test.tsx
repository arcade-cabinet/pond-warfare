/**
 * Browser Responsive Tech Tree Tests
 *
 * Validates that the TechTreePanel renders different layouts based on
 * the screenClass signal:
 * - compact: branch tabs + card grid (BranchTabs + BranchGrid)
 * - medium/large: side-by-side SVG graphs (BranchPanel)
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

describe('Responsive tech tree layout', () => {
  let container: HTMLDivElement;

  afterEach(() => {
    render(null, container);
    container.remove();
    resizeTo(1280, 720);
  });

  it('compact screenClass renders branch tabs and card grid', async () => {
    _testReset();
    await initDeviceSignals();
    resizeTo(400, 800);
    expect(screenClass.value).toBe('compact');

    container = document.createElement('div');
    document.body.appendChild(container);
    renderPanel(container);

    // Branch tabs should be rendered (Lodge / Nature and Armory buttons)
    const buttons = Array.from(container.querySelectorAll('button'));
    const tabLabels = buttons.map((b) => b.textContent?.trim());
    expect(tabLabels).toContain('Lodge / Nature');
    expect(tabLabels).toContain('Armory');

    // Card grid should be present
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

    // Branch tabs should NOT be rendered at large
    const buttons = Array.from(container.querySelectorAll('button'));
    const tabLabels = buttons.map((b) => b.textContent?.trim());
    expect(tabLabels).not.toContain('Lodge / Nature');

    // SVG graph headers should be present (BranchPanel renders h3 titles)
    const headings = Array.from(container.querySelectorAll('h3'));
    const headingText = headings.map((h) => h.textContent?.trim());
    expect(headingText).toContain('Lodge / Nature');
    expect(headingText).toContain('Armory');

    // No card grid at large
    expect(container.querySelector('.tech-card-grid')).toBeNull();
  });
});
