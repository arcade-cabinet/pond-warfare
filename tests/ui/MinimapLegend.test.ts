/**
 * MinimapLegend tests.
 * US12: Tap "?" to toggle legend, tap outside to close, works on touch AND mouse.
 */
import { cleanup, fireEvent, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, describe, expect, it } from 'vitest';
import { MinimapLegend } from '@/ui/hud/MinimapLegend';

afterEach(cleanup);

describe('MinimapLegend', () => {
  it('legend is hidden by default', () => {
    render(h(MinimapLegend, null));
    // Legend entries should not be visible
    expect(document.body.textContent).not.toContain('Player building');
  });

  it('tap "?" button toggles legend open', () => {
    render(h(MinimapLegend, null));
    const btn = document.querySelector('button');
    expect(btn).toBeTruthy();
    fireEvent.click(btn!);
    expect(document.body.textContent).toContain('Player building');
    expect(document.body.textContent).toContain('Enemy building');
    expect(document.body.textContent).toContain('Clam resource');
  });

  it('tap "?" again closes legend', () => {
    render(h(MinimapLegend, null));
    const btn = document.querySelector('button');
    fireEvent.click(btn!); // open
    expect(document.body.textContent).toContain('Player building');
    fireEvent.click(btn!); // close
    expect(document.body.textContent).not.toContain('Player building');
  });

  it('hover opens legend on desktop', () => {
    render(h(MinimapLegend, null));
    const btn = document.querySelector('button');
    fireEvent.mouseEnter(btn!);
    expect(document.body.textContent).toContain('Player building');
    fireEvent.mouseLeave(btn!);
    expect(document.body.textContent).not.toContain('Player building');
  });

  it('shows all legend entries with correct labels', () => {
    render(h(MinimapLegend, null));
    const btn = document.querySelector('button');
    fireEvent.click(btn!);
    const labels = [
      'Player building',
      'Enemy building',
      'Clam resource',
      'Twig resource',
      'Pearl resource',
      'Combat zone',
    ];
    for (const label of labels) {
      expect(document.body.textContent).toContain(label);
    }
  });
});
