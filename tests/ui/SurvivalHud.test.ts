/**
 * SurvivalHud tests.
 * US2: Survival mode wave counter and score display.
 */
import { cleanup, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('@/platform', async () => {
  const { signal } = await import('@preact/signals');
  return {
    inputMode: signal('pointer'),
    screenClass: signal('large'),
    canDockPanels: signal(true),
  };
});

import { SurvivalHud } from '@/ui/hud/SurvivalHud';
import { survivalScore, survivalWave } from '@/ui/store-gameplay';

afterEach(cleanup);

describe('SurvivalHud', () => {
  it('renders nothing when wave is 0', () => {
    survivalWave.value = 0;
    survivalScore.value = 0;
    const { container } = render(h(SurvivalHud, null));
    expect(container.children.length).toBe(0);
  });

  it('shows wave number and score', () => {
    survivalWave.value = 7;
    survivalScore.value = 1250;
    render(h(SurvivalHud, null));
    expect(document.body.textContent).toContain('Wave');
    expect(document.body.textContent).toContain('7');
    expect(document.body.textContent).toContain('1,250');
    expect(document.querySelector('[data-testid="survival-hud"]')).toBeTruthy();
  });

  it('changes color at wave 5 threshold', () => {
    survivalWave.value = 5;
    survivalScore.value = 500;
    render(h(SurvivalHud, null));
    const waveLabel = document.querySelector('[data-testid="survival-hud"] .font-heading');
    // Wave 5 should use warning color
    expect(waveLabel?.getAttribute('style')).toContain('var(--pw-warning)');
  });

  it('changes color at wave 15 threshold', () => {
    survivalWave.value = 15;
    survivalScore.value = 3000;
    render(h(SurvivalHud, null));
    const waveLabel = document.querySelector('[data-testid="survival-hud"] .font-heading');
    // Wave 15+ should use red/danger color
    expect(waveLabel?.getAttribute('style')).toContain('var(--pw-hp-low)');
  });
});
