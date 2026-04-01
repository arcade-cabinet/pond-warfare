/**
 * SwipeableTabView Tests
 *
 * Validates indicator rendering, active tab lily pad, dot click
 * switching, content visibility, and edge arrow visibility based
 * on inputMode signal.
 */

import { cleanup, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/platform', async () => {
  const { signal } = await import('@preact/signals');
  return {
    inputMode: signal('pointer'),
    screenClass: signal('large'),
    canDockPanels: signal(false),
  };
});

import { inputMode } from '@/platform';
import { SwipeableTabView, type Tab } from '@/ui/components/SwipeableTabView';

const TABS: Tab[] = [
  { key: 'alpha', label: 'Alpha' },
  { key: 'beta', label: 'Beta' },
  { key: 'gamma', label: 'Gamma' },
];

function renderTabs(activeTab: string, onTabChange = vi.fn()) {
  return render(
    h(SwipeableTabView, { tabs: TABS, activeTab, onTabChange }, [
      h('div', { 'data-testid': 'panel-alpha' }, 'Content A'),
      h('div', { 'data-testid': 'panel-beta' }, 'Content B'),
      h('div', { 'data-testid': 'panel-gamma' }, 'Content C'),
    ]),
  );
}

beforeEach(() => {
  (inputMode as any).value = 'pointer';
});

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
});

describe('SwipeableTabView', () => {
  it('renders all tab indicators', () => {
    renderTabs('alpha');
    for (const tab of TABS) {
      const dot = document.querySelector(`[data-testid="tab-dot-${tab.key}"]`);
      expect(dot).toBeTruthy();
    }
  });

  it('active tab has lily pad indicator image', () => {
    renderTabs('beta');
    const activeDot = document.querySelector('[data-testid="tab-dot-beta"]');
    expect(activeDot).toBeTruthy();
    const img = activeDot?.querySelector('img.swipe-tab-lilypad');
    expect(img).toBeTruthy();
    expect((img as HTMLImageElement).src).toContain('Lillypad-tiny.png');
  });

  it('inactive tabs have plain dot indicators', () => {
    renderTabs('beta');
    const alphaDot = document.querySelector('[data-testid="tab-dot-alpha"]');
    expect(alphaDot).toBeTruthy();
    const inactiveDot = alphaDot?.querySelector('.swipe-tab-inactive-dot');
    expect(inactiveDot).toBeTruthy();
    const img = alphaDot?.querySelector('img');
    expect(img).toBeNull();
  });

  it('clicking an indicator calls onTabChange', () => {
    const onChange = vi.fn();
    renderTabs('alpha', onChange);
    const gammaDot = document.querySelector('[data-testid="tab-dot-gamma"]') as HTMLElement;
    gammaDot.click();
    expect(onChange).toHaveBeenCalledWith('gamma');
  });

  it('displays the current tab label', () => {
    renderTabs('gamma');
    const label = document.querySelector('.swipe-tab-label');
    expect(label).toBeTruthy();
    expect(label?.textContent).toBe('Gamma');
  });

  it('renders all content panels in the track', () => {
    renderTabs('alpha');
    const panels = document.querySelectorAll('.swipe-tab-panel');
    expect(panels).toHaveLength(3);
    expect(document.querySelector('[data-testid="panel-alpha"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="panel-beta"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="panel-gamma"]')).toBeTruthy();
  });

  it('edge arrows show on desktop (inputMode=pointer)', () => {
    (inputMode as any).value = 'pointer';
    renderTabs('beta');
    expect(document.querySelector('[data-testid="swipe-arrow-left"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="swipe-arrow-right"]')).toBeTruthy();
  });

  it('edge arrows hidden on touch (inputMode=touch)', () => {
    (inputMode as any).value = 'touch';
    renderTabs('beta');
    expect(document.querySelector('[data-testid="swipe-arrow-left"]')).toBeNull();
    expect(document.querySelector('[data-testid="swipe-arrow-right"]')).toBeNull();
  });

  it('no left arrow on first tab, no right arrow on last tab', () => {
    (inputMode as any).value = 'pointer';
    renderTabs('alpha');
    expect(document.querySelector('[data-testid="swipe-arrow-left"]')).toBeNull();
    expect(document.querySelector('[data-testid="swipe-arrow-right"]')).toBeTruthy();

    cleanup();
    renderTabs('gamma');
    expect(document.querySelector('[data-testid="swipe-arrow-left"]')).toBeTruthy();
    expect(document.querySelector('[data-testid="swipe-arrow-right"]')).toBeNull();
  });

  it('clicking edge arrows switches tabs', () => {
    (inputMode as any).value = 'pointer';
    const onChange = vi.fn();
    renderTabs('beta', onChange);

    const leftArrow = document.querySelector('[data-testid="swipe-arrow-left"]') as HTMLElement;
    leftArrow.click();
    expect(onChange).toHaveBeenCalledWith('alpha');

    const rightArrow = document.querySelector('[data-testid="swipe-arrow-right"]') as HTMLElement;
    rightArrow.click();
    expect(onChange).toHaveBeenCalledWith('gamma');
  });
});
