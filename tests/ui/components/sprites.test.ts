// @vitest-environment jsdom
/**
 * Sprite Tests
 *
 * Tests the unit sprite SVG components: SpriteOtter, SpriteCroc, SpriteSnake.
 * Verifies viewBox, aria-labels, animation frame groups, and selection circles.
 */

import { cleanup, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, describe, expect, it } from 'vitest';
import { SpriteCroc } from '@/ui/components/sprites/SpriteCroc';
import { SpriteOtter } from '@/ui/components/sprites/SpriteOtter';
import { SpriteSnake } from '@/ui/components/sprites/SpriteSnake';

afterEach(() => {
  cleanup();
});

describe('SpriteOtter', () => {
  it('renders SVG with viewBox="0 0 100 100"', () => {
    render(h(SpriteOtter, null));
    const svg = document.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('viewBox')).toBe('0 0 100 100');
  });

  it('has aria-label="Otter Commando"', () => {
    render(h(SpriteOtter, null));
    const svg = document.querySelector('svg');
    expect(svg?.getAttribute('aria-label')).toBe('Otter Commando');
  });

  it('contains .sprite-frame-1 and .sprite-frame-2 groups', () => {
    render(h(SpriteOtter, null));
    const frame1 = document.querySelector('.sprite-frame-1');
    const frame2 = document.querySelector('.sprite-frame-2');
    expect(frame1).toBeTruthy();
    expect(frame2).toBeTruthy();
  });

  it('contains .selection-circle element', () => {
    render(h(SpriteOtter, null));
    const circle = document.querySelector('.selection-circle');
    expect(circle).toBeTruthy();
  });
});

describe('SpriteCroc', () => {
  it('renders with aria-label="Gator Heavy"', () => {
    render(h(SpriteCroc, null));
    const svg = document.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('aria-label')).toBe('Gator Heavy');
  });
});

describe('SpriteSnake', () => {
  it('renders with aria-label="Viper Sniper"', () => {
    render(h(SpriteSnake, null));
    const svg = document.querySelector('svg');
    expect(svg).toBeTruthy();
    expect(svg?.getAttribute('aria-label')).toBe('Viper Sniper');
  });
});
