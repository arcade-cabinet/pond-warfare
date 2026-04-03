/**
 * GameButton Tests
 *
 * Tests all four variants (primary, secondary, danger, ghost),
 * size props, hotkey badges, disabled state, and click behavior.
 */

import { cleanup, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { GameButton } from '@/ui/components/GameButton';

afterEach(() => {
  cleanup();
});

describe('GameButton', () => {
  it('renders label text', () => {
    render(h(GameButton, { label: 'Attack', onClick: vi.fn() }));
    const btn = document.querySelector('.game-btn');
    expect(btn?.textContent).toContain('Attack');
  });

  it('calls onClick when clicked', () => {
    const onClick = vi.fn();
    render(h(GameButton, { label: 'Go', onClick }));
    const btn = document.querySelector('.game-btn') as HTMLButtonElement;
    btn?.click();
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it('does not call onClick when disabled', () => {
    const onClick = vi.fn();
    render(h(GameButton, { label: 'Go', onClick, disabled: true }));
    const btn = document.querySelector('.game-btn') as HTMLButtonElement;
    btn?.click();
    expect(onClick).not.toHaveBeenCalled();
  });

  it('sets disabled attribute when disabled', () => {
    render(h(GameButton, { label: 'No', onClick: vi.fn(), disabled: true }));
    const btn = document.querySelector('.game-btn') as HTMLButtonElement;
    expect(btn?.disabled).toBe(true);
  });

  it('renders hotkey badge when hotkey is provided', () => {
    render(h(GameButton, { label: 'Build', onClick: vi.fn(), hotkey: 'q' }));
    const badge = document.querySelector('.font-numbers');
    expect(badge?.textContent).toBe('Q');
  });

  it('does not render hotkey badge when not provided', () => {
    render(h(GameButton, { label: 'Build', onClick: vi.fn() }));
    const badges = document.querySelectorAll('.font-numbers');
    expect(badges.length).toBe(0);
  });

  it('primary variant renders btn-wood.png background image', () => {
    render(h(GameButton, { label: 'Start', onClick: vi.fn(), variant: 'primary' }));
    const img = document.querySelector('img');
    expect(img).toBeTruthy();
    expect(img?.src).toContain('btn-wood.png');
  });

  it('secondary variant does not render image', () => {
    render(h(GameButton, { label: 'Save', onClick: vi.fn(), variant: 'secondary' }));
    const img = document.querySelector('img');
    expect(img).toBeNull();
  });

  it('ghost variant has transparent background', () => {
    render(h(GameButton, { label: 'Help', onClick: vi.fn(), variant: 'ghost' }));
    const btn = document.querySelector('.game-btn') as HTMLButtonElement;
    expect(btn?.style.background).toBe('transparent');
    expect(btn?.style.border).toContain('transparent');
  });

  it('danger variant has red-tinted border', () => {
    render(h(GameButton, { label: 'Delete', onClick: vi.fn(), variant: 'danger' }));
    const btn = document.querySelector('.game-btn') as HTMLButtonElement;
    expect(btn?.style.border).toContain('var(--pw-enemy)');
  });

  it('sm size has 36px min height', () => {
    render(h(GameButton, { label: 'X', onClick: vi.fn(), size: 'sm' }));
    const btn = document.querySelector('.game-btn') as HTMLButtonElement;
    expect(btn?.style.minHeight).toBe('36px');
  });

  it('lg size has 48px min height', () => {
    render(h(GameButton, { label: 'X', onClick: vi.fn(), size: 'lg' }));
    const btn = document.querySelector('.game-btn') as HTMLButtonElement;
    expect(btn?.style.minHeight).toBe('48px');
  });

  it('default md size has 44px min touch target', () => {
    render(h(GameButton, { label: 'X', onClick: vi.fn() }));
    const btn = document.querySelector('.game-btn') as HTMLButtonElement;
    expect(btn?.style.minHeight).toBe('44px');
  });

  it('applies extra class from class prop', () => {
    render(h(GameButton, { label: 'X', onClick: vi.fn(), class: 'flex-1 w-full' }));
    const btn = document.querySelector('.game-btn') as HTMLButtonElement;
    expect(btn?.classList.contains('flex-1')).toBe(true);
    expect(btn?.classList.contains('w-full')).toBe(true);
  });

  it('sets data-testid when testId is provided', () => {
    render(h(GameButton, { label: 'X', onClick: vi.fn(), testId: 'my-btn' }));
    const btn = document.querySelector('[data-testid="my-btn"]');
    expect(btn).toBeTruthy();
  });

  it('title defaults to label when no hotkey', () => {
    render(h(GameButton, { label: 'Save', onClick: vi.fn() }));
    const btn = document.querySelector('.game-btn') as HTMLButtonElement;
    expect(btn?.title).toBe('Save');
  });

  it('title includes hotkey when provided', () => {
    render(h(GameButton, { label: 'Save', onClick: vi.fn(), hotkey: 's' }));
    const btn = document.querySelector('.game-btn') as HTMLButtonElement;
    expect(btn?.title).toBe('Save (S)');
  });
});
