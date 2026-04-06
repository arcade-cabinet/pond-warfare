// @vitest-environment jsdom
/**
 * HUD Resource Text Size Tests
 *
 * Validates that the TopBarResources component renders readable responsive
 * font size classes (text-xs on mobile, text-sm on desktop) rather than
 * the previous tiny default sizes.
 *
 * Renders the actual component and inspects the DOM for expected classes.
 */

import { render } from '@testing-library/preact';
import { describe, expect, it } from 'vitest';
import * as store from '@/ui/store';
import * as storeGameplay from '@/ui/store-gameplay';
import { TopBarResources } from '@/ui/hud/top-bar-resources';

describe('TopBarResources font sizing', () => {
  it('should export TopBarResources as a function component', () => {
    expect(typeof TopBarResources).toBe('function');
  });

  it('should render resource values with responsive text-xs md:text-sm classes', () => {
    // Set up signal values for rendering
    store.fish.value = 150;
    store.rocks.value = 30;
    store.logs.value = 40;
    store.food.value = 3;
    store.maxFood.value = 10;
    store.rateFish.value = 0;
    store.rateLogs.value = 0;
    storeGameplay.waveNumber.value = 0;

    const { container } = render(<TopBarResources compact={false} />);

    // Resource value spans should use responsive font sizing
    const numberSpans = container.querySelectorAll('.font-numbers.font-bold');
    expect(numberSpans.length).toBeGreaterThanOrEqual(4); // Fish, Rocks, Logs, Food

    for (const span of numberSpans) {
      const classes = span.className;
      expect(classes).toContain('text-xs');
      expect(classes).toContain('md:text-sm');
    }
  });

  it('should render label text with responsive sizing', () => {
    store.fish.value = 100;
    store.rocks.value = 20;
    store.logs.value = 30;
    store.food.value = 5;
    store.maxFood.value = 10;
    storeGameplay.waveNumber.value = 0;

    const { container } = render(<TopBarResources compact={false} />);

    // Label spans (Fish:, Rocks:, Logs:, Food:) should use text-xs md:text-sm
    const labelSpans = container.querySelectorAll('.font-game');
    expect(labelSpans.length).toBeGreaterThanOrEqual(4);

    for (const span of labelSpans) {
      const classes = span.className;
      expect(classes).toContain('text-xs');
      expect(classes).toContain('md:text-sm');
    }
  });

  it('should render rate indicators smaller than values when rates are nonzero', () => {
    store.fish.value = 100;
    store.rocks.value = 20;
    store.logs.value = 30;
    store.food.value = 5;
    store.maxFood.value = 10;
    store.rateFish.value = 5;
    store.rateLogs.value = 3;
    storeGameplay.waveNumber.value = 0;

    const { container } = render(<TopBarResources compact={false} />);

    // Rate indicators use text-[10px] md:text-xs (smaller than value text)
    const html = container.innerHTML;
    expect(html).toContain('text-[10px]');
    expect(html).toContain('md:text-xs');
  });

  it('should hide labels in compact mode', () => {
    store.fish.value = 100;
    store.rocks.value = 20;
    store.logs.value = 30;
    store.food.value = 5;
    store.maxFood.value = 10;
    storeGameplay.waveNumber.value = 0;

    const { container } = render(<TopBarResources compact={true} />);

    // In compact mode, label spans (font-game) should not be rendered
    const labelSpans = container.querySelectorAll('.font-game');
    expect(labelSpans.length).toBe(0);

    // But value spans should still be present
    const numberSpans = container.querySelectorAll('.font-numbers');
    expect(numberSpans.length).toBeGreaterThanOrEqual(4);
  });
});
