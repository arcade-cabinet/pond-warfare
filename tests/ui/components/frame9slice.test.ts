/**
 * Frame9Slice Tests
 *
 * Tests the 9-slice frame component: grid structure, title rendering,
 * expand/collapse states, click handling, glow aura, and children rendering.
 */

import { cleanup, fireEvent, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { Frame9Slice } from '@/ui/components/frame/Frame9Slice';

afterEach(() => {
  cleanup();
});

describe('Frame9Slice', () => {
  it('renders a 3x3 grid with 9 children', () => {
    render(h(Frame9Slice, null, h('span', null, 'content')));
    const grid = document.querySelector('.grid');
    expect(grid).toBeTruthy();
    expect(grid?.children.length).toBe(9);
  });

  it('renders title in an h2 element', () => {
    render(h(Frame9Slice, { title: 'Battle Report' }, h('span', null, 'body')));
    const h2 = document.querySelector('h2');
    expect(h2).toBeTruthy();
    expect(h2?.textContent).toBe('Battle Report');
  });

  it('isExpanded=true: center cell does NOT have class scale-y-0', () => {
    render(h(Frame9Slice, { isExpanded: true }, h('span', null, 'body')));
    const grid = document.querySelector('.grid');
    const centerCell = grid?.children[4] as HTMLElement;
    expect(centerCell.className).not.toContain('scale-y-0');
  });

  it('isExpanded=false: center cell has class scale-y-0', () => {
    render(h(Frame9Slice, { isExpanded: false }, h('span', null, 'body')));
    const grid = document.querySelector('.grid');
    const centerCell = grid?.children[4] as HTMLElement;
    expect(centerCell.className).toContain('scale-y-0');
  });

  it('onClick fires when top-center cell is clicked', () => {
    const onClick = vi.fn();
    render(h(Frame9Slice, { onClick }, h('span', null, 'body')));
    const grid = document.querySelector('.grid');
    const topCenter = grid?.children[1] as HTMLElement;
    fireEvent.click(topCenter);
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('glow aura visible when expanded', () => {
    render(h(Frame9Slice, { isExpanded: true }, h('span', null, 'body')));
    // The glow div is the first child of the root, before the grid
    const root = document.querySelector('.relative.w-full');
    const glowDiv = root?.children[0] as HTMLElement;
    expect(glowDiv.className).toContain('opacity-30');
    expect(glowDiv.className).not.toContain('opacity-0');
  });

  it('glow aura hidden when collapsed', () => {
    render(h(Frame9Slice, { isExpanded: false }, h('span', null, 'body')));
    const root = document.querySelector('.relative.w-full');
    const glowDiv = root?.children[0] as HTMLElement;
    expect(glowDiv.className).toContain('opacity-0');
  });

  it('children render inside the CenterPanel', () => {
    render(h(Frame9Slice, null, h('span', { class: 'test-child' }, 'Hello')));
    const grid = document.querySelector('.grid');
    const centerCell = grid?.children[4] as HTMLElement;
    const child = centerCell.querySelector('.test-child');
    expect(child).toBeTruthy();
    expect(child?.textContent).toBe('Hello');
  });
});
