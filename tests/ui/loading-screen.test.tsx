// @vitest-environment jsdom

import { cleanup, render } from '@testing-library/preact';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { DEFAULT_CUSTOM_SETTINGS, customGameSettings } from '@/ui/store';
import { LOADING_TIPS, LoadingScreen } from '@/ui/LoadingScreen';

describe('LoadingScreen', () => {
  beforeEach(() => {
    customGameSettings.value = { ...DEFAULT_CUSTOM_SETTINGS, scenario: 'standard' };
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
    customGameSettings.value = { ...DEFAULT_CUSTOM_SETTINGS };
  });

  it('keeps loading tips aligned to the canonical unit model', () => {
    const copy = LOADING_TIPS.join(' ');

    expect(copy).toContain('Mudpaws');
    expect(copy).toContain('Pearls');
    expect(copy).toContain('Bombardiers');
    expect(copy).not.toMatch(/\bGatherers?\b/);
    expect(copy).not.toMatch(/\bBrawlers?\b/);
    expect(copy).not.toMatch(/\bScouts?\b/);
  });

  it('renders a canonical tip card during transition', () => {
    vi.spyOn(Math, 'random').mockReturnValue(0);

    const view = render(<LoadingScreen />);

    expect(view.getByText('Loading Standard Map...')).toBeTruthy();
    expect(view.getByText(LOADING_TIPS[0])).toBeTruthy();
  });
});
