/**
 * PondAccordion Tests -- rendering, toggle, summary, chevron, allowMultiple.
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

const q = (sel: string) => document.querySelector(sel) as HTMLElement;
const header = (k: string) => q(`[data-testid="accordion-header-${k}"]`);
const content = (k: string) => q(`[data-testid="accordion-content-${k}"]`);
const chevron = (k: string) => q(`[data-testid="accordion-chevron-${k}"]`);
const summary = (k: string) => document.querySelector(`[data-testid="accordion-summary-${k}"]`);

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
      expect(header(s.key)).toBeTruthy();
      expect(header(s.key).textContent).toContain(s.title);
    }
  });

  it('click header toggles content visibility', () => {
    renderAccordion();
    expect(content('alpha').style.display).toBe('none');
    fireEvent.click(header('alpha'));
    expect(content('alpha').style.display).toBe('block');
    fireEvent.click(header('alpha'));
    expect(content('alpha').style.display).toBe('none');
  });

  it('summary text shows when collapsed, hidden when expanded', () => {
    renderAccordion();
    expect(summary('alpha')).toBeTruthy();
    expect(summary('alpha')!.textContent).toBe('3 items');
    // Beta is defaultOpen -- summary hidden
    expect(summary('beta')).toBeNull();
  });

  it('multiple sections can be open when allowMultiple=true', () => {
    renderAccordion({ allowMultiple: true });
    fireEvent.click(header('alpha'));
    expect(content('alpha').style.display).toBe('block');
    expect(content('beta').style.display).toBe('block');
  });

  it('only one section open when allowMultiple=false', () => {
    renderAccordion({ allowMultiple: false });
    expect(content('beta').style.display).toBe('block');
    fireEvent.click(header('alpha'));
    expect(content('alpha').style.display).toBe('block');
    expect(content('beta').style.display).toBe('none');
  });

  it('chevron has open class when section is expanded', () => {
    renderAccordion();
    expect(chevron('beta').classList.contains('pond-accordion-chevron-open')).toBe(true);
    expect(chevron('alpha').classList.contains('pond-accordion-chevron-open')).toBe(false);
  });

  it('default open sections start expanded', () => {
    renderAccordion();
    expect(content('beta').style.display).toBe('block');
    expect(content('alpha').style.display).toBe('none');
    expect(content('gamma').style.display).toBe('none');
  });
});
