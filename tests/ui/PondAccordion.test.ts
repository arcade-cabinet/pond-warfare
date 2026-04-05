// @vitest-environment jsdom
/**
 * PondAccordion Tests -- rendering, toggle, summary, allowMultiple.
 *
 * After the Frame9Slice migration (design bible), accordion sections are
 * wrapped in Frame9Slice components. The title and summary are rendered
 * as the Frame9Slice title prop. Expand/collapse uses isExpanded.
 */
import { cleanup, fireEvent, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, describe, expect, it } from 'vitest';
import { type AccordionSection, PondAccordion } from '@/ui/components/PondAccordion';

const SECTIONS: AccordionSection[] = [
  { key: 'alpha', title: 'Alpha Section', summary: '3 items' },
  { key: 'beta', title: 'Beta Section', summary: '5 items', defaultOpen: true },
  { key: 'gamma', title: 'Gamma Section', icon: 'G' },
];

/** Get the section wrapper by key. */
const section = (k: string) =>
  document.querySelector(`[data-testid="accordion-section-${k}"]`) as HTMLElement;

/** Frame9Slice renders h2 titles — find them within a section. */
function sectionTitle(k: string): string {
  const el = section(k);
  const h2 = el?.querySelector('h2');
  return h2?.textContent ?? '';
}

/**
 * Check if a section's content area is expanded.
 * Frame9Slice uses scaleY(1)/scaleY(0) + opacity to toggle content.
 * When collapsed, the content div has opacity 0 and scaleY(0).
 * We check for scaleY(0) or height:0 in the style of the center cell.
 */
function isOpen(key: string): boolean {
  const el = section(key);
  if (!el) return false;
  // The Frame9Slice center cell (content area) is the 5th grid child (index 4)
  const grid = el.querySelector('.grid');
  if (!grid) return false;
  const cells = grid.children;
  // Middle row center cell is index 4 (0-indexed: TL=0, Top=1, TR=2, Left=3, Center=4)
  const centerCell = cells[4] as HTMLElement;
  if (!centerCell) return false;
  // Frame9Slice uses Tailwind class "scale-y-0" when collapsed
  return !centerCell.className.includes('scale-y-0');
}

/** Click the Frame9Slice header to toggle. The top edge is clickable. */
function clickHeader(k: string) {
  const el = section(k);
  // The top-center cell (index 1) is the clickable header area
  const grid = el?.querySelector('.grid');
  const topCenter = grid?.children[1] as HTMLElement;
  if (topCenter) fireEvent.click(topCenter);
}

function renderAccordion(props: Partial<{ allowMultiple: boolean }> = {}) {
  return render(
    h(PondAccordion, { sections: SECTIONS, ...props }, [
      h('div', null, 'Alpha content'),
      h('div', null, 'Beta content'),
      h('div', null, 'Gamma content'),
    ]),
  );
}

afterEach(cleanup);

describe('PondAccordion', () => {
  it('renders all section headers with full titles', () => {
    renderAccordion();
    for (const s of SECTIONS) {
      expect(section(s.key)).toBeTruthy();
      expect(sectionTitle(s.key)).toContain(s.title);
    }
  });

  it('click header toggles content visibility', () => {
    renderAccordion();
    expect(isOpen('alpha')).toBe(false);
    clickHeader('alpha');
    expect(isOpen('alpha')).toBe(true);
    clickHeader('alpha');
    expect(isOpen('alpha')).toBe(false);
  });

  it('summary text shows when collapsed, hidden when expanded', () => {
    renderAccordion();
    // Alpha collapsed — title should include summary
    expect(sectionTitle('alpha')).toContain('3 items');
    // Beta is defaultOpen — title should NOT include summary
    expect(sectionTitle('beta')).not.toContain('5 items');
  });

  it('multiple sections can be open when allowMultiple=true', () => {
    renderAccordion({ allowMultiple: true });
    clickHeader('alpha');
    expect(isOpen('alpha')).toBe(true);
    expect(isOpen('beta')).toBe(true);
  });

  it('only one section open when allowMultiple=false', () => {
    renderAccordion({ allowMultiple: false });
    expect(isOpen('beta')).toBe(true);
    clickHeader('alpha');
    expect(isOpen('alpha')).toBe(true);
    expect(isOpen('beta')).toBe(false);
  });

  it('default open sections start expanded', () => {
    renderAccordion();
    expect(isOpen('beta')).toBe(true);
    expect(isOpen('alpha')).toBe(false);
    expect(isOpen('gamma')).toBe(false);
  });
});
