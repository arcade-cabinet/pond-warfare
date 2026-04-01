/**
 * CommanderPicker Tests
 *
 * Validates the picker renders all commanders, tapping selects one,
 * and the selected commander gets a visual highlight (aria-pressed).
 */

import { cleanup, fireEvent, render } from '@testing-library/preact';
import { h } from 'preact';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { COMMANDERS } from '@/config/commanders';
import { CommanderPicker } from '@/ui/new-game/CommanderPicker';
import { selectedCommander } from '@/ui/store';

beforeEach(() => {
  selectedCommander.value = 'marshal';
});

afterEach(() => {
  cleanup();
});

describe('CommanderPicker', () => {
  it('renders a card for every commander', () => {
    render(h(CommanderPicker, {}));
    for (const cmd of COMMANDERS) {
      const card = document.querySelector(`[data-testid="commander-${cmd.id}"]`);
      expect(card).not.toBeNull();
      expect(card?.textContent).toContain(cmd.name);
    }
  });

  it('highlights the default selected commander', () => {
    render(h(CommanderPicker, {}));
    const marshalCard = document.querySelector('[data-testid="commander-marshal"]');
    expect(marshalCard?.getAttribute('aria-pressed')).toBe('true');

    const sageCard = document.querySelector('[data-testid="commander-sage"]');
    expect(sageCard?.getAttribute('aria-pressed')).toBe('false');
  });

  it('updates selectedCommander signal on click', () => {
    render(h(CommanderPicker, {}));
    const sageCard = document.querySelector('[data-testid="commander-sage"]') as HTMLElement;
    fireEvent.click(sageCard);
    expect(selectedCommander.value).toBe('sage');
  });

  it('shows aura and passive descriptions', () => {
    render(h(CommanderPicker, {}));
    const sageCard = document.querySelector('[data-testid="commander-sage"]');
    expect(sageCard?.textContent).toContain('+25% tech research speed');
    expect(sageCard?.textContent).toContain('Gatherers +15% gather rate');
  });

  it('shows unlock requirements for locked commanders', () => {
    render(h(CommanderPicker, {}));
    const wardenCard = document.querySelector('[data-testid="commander-warden"]');
    expect(wardenCard?.textContent).toContain('Win on Hard');
  });

  it('does not show passive for marshal (passive is None)', () => {
    render(h(CommanderPicker, {}));
    const marshalCard = document.querySelector('[data-testid="commander-marshal"]');
    expect(marshalCard?.textContent).not.toContain('Passive:');
  });
});
