// @vitest-environment jsdom
/**
 * SvgFilters Tests
 *
 * Tests the hidden SVG defs block that provides procedural texture filters
 * for the Pond Warfare UI frame pieces and components.
 */

import { cleanup, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, describe, expect, it } from 'vitest';
import { SvgFilters } from '@/ui/components/SvgFilters';

afterEach(() => {
  cleanup();
});

describe('SvgFilters', () => {
  it('renders an SVG element with aria-hidden="true"', () => {
    render(h(SvgFilters, null));
    const svg = document.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('aria-hidden')).toBe('true');
  });

  it('contains filter#grunge-heavy', () => {
    render(h(SvgFilters, null));
    const filter = document.querySelector('filter#grunge-heavy');
    expect(filter).toBeTruthy();
  });

  it('contains filter#organic-wood', () => {
    render(h(SvgFilters, null));
    const filter = document.querySelector('filter#organic-wood');
    expect(filter).toBeTruthy();
  });

  it('contains filter#swamp-glow', () => {
    render(h(SvgFilters, null));
    const filter = document.querySelector('filter#swamp-glow');
    expect(filter).toBeTruthy();
  });

  it('SVG has width:0 and height:0 (hidden)', () => {
    render(h(SvgFilters, null));
    const svg = document.querySelector('svg') as SVGSVGElement;
    expect(svg.style.width).toBe('0px');
    expect(svg.style.height).toBe('0px');
  });
});
